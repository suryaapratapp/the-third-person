-- Cashfree replaces Razorpay as the payment gateway.
--
-- Nothing about the DATA model needed to change: payment_orders already stores
-- the provider per row, and neither `provider` nor analysis_credits.source
-- carries a CHECK constraint, so 'cashfree' rows are legal as they stand. What
-- did need to change is the settlement function, whose name and hardcoded
-- 'razorpay_test' source baked one gateway into the ledger.
--
-- settle_razorpay_order is deliberately NOT dropped. Orders paid through
-- Razorpay were settled by it, and a gateway migration is exactly the moment
-- when a late webhook for an old order can still arrive. It stays until the
-- Razorpay functions are deleted.

-- Provider-neutral settlement: grants the purchased credits exactly once, and
-- records where they came from rather than assuming.
create or replace function public.settle_payment_order(
  p_order_id text,
  p_payment_id text,
  p_provider text default 'cashfree'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.payment_orders;
  v_report_balance integer;
  v_bestie_balance integer;
begin
  -- FOR UPDATE is what makes this safe to call twice at once. The checkout
  -- return and the webhook race by design — whichever arrives first settles,
  -- the other blocks here and then finds status already 'paid'.
  select * into v_order
  from public.payment_orders
  where provider_order_id = p_order_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'order_not_found');
  end if;

  if v_order.status <> 'paid' then
    insert into public.analysis_credits (
      user_id, credit_type, credits_granted, credits_used, period_start, period_end, source
    )
    values
      (v_order.user_id, 'relationship_report', v_order.report_count, 0, current_date, date '2099-12-31', p_provider),
      (v_order.user_id, 'bestie_message', v_order.bestie_count, 0, current_date, date '2099-12-31', p_provider);

    update public.payment_orders
    set status = 'paid', provider_payment_id = p_payment_id, updated_at = now()
    where id = v_order.id;

    insert into public.payment_events (
      user_id, provider, provider_event_id, event_type, payload, processed_at
    )
    values (
      v_order.user_id,
      p_provider,
      p_payment_id,
      'payment_captured',
      jsonb_build_object(
        'orderId', p_order_id,
        'reportCount', v_order.report_count,
        'bestieCount', v_order.bestie_count,
        'amount', v_order.amount
      ),
      now()
    )
    on conflict (provider, provider_event_id) do nothing;
  end if;

  -- `source <> 'free'` is how the entitlements query separates bought credits
  -- from granted ones, so any provider name other than 'free' counts as paid.
  select coalesce(sum(greatest(credits_granted - credits_used, 0)), 0)
  into v_report_balance
  from public.analysis_credits
  where user_id = v_order.user_id and credit_type = 'relationship_report' and source <> 'free';

  select coalesce(sum(greatest(credits_granted - credits_used, 0)), 0)
  into v_bestie_balance
  from public.analysis_credits
  where user_id = v_order.user_id and credit_type = 'bestie_message' and source <> 'free';

  return jsonb_build_object(
    'ok', true,
    'alreadySettled', v_order.status = 'paid',
    'paidRelationshipReportsLeft', v_report_balance,
    'paidBestieChatsLeft', v_bestie_balance
  );
end;
$$;

-- Service role only. A user who could call this directly could grant
-- themselves credits for an order they never paid for.
revoke all on function public.settle_payment_order(text, text, text) from public;
revoke all on function public.settle_payment_order(text, text, text) from anon;
revoke all on function public.settle_payment_order(text, text, text) from authenticated;
grant execute on function public.settle_payment_order(text, text, text) to service_role;
