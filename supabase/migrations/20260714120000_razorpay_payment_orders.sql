-- Razorpay (test-mode) checkout support.
--
-- payment_orders records each order the server creates so that credit granting
-- is driven by the SERVER's stored pack size, never by client-supplied amounts.
-- settle_razorpay_order grants the paid credits atomically and idempotently
-- after the edge function has verified the Razorpay signature.

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'razorpay',
  provider_order_id text not null unique,
  report_count integer not null check (report_count > 0),
  bestie_count integer not null default 0 check (bestie_count >= 0),
  amount integer not null check (amount > 0),          -- minor units (paise)
  currency text not null default 'INR',
  status text not null default 'created' check (status in ('created', 'paid', 'failed')),
  provider_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_orders_user_created_idx
  on public.payment_orders(user_id, created_at desc);

alter table public.payment_orders enable row level security;

-- Users may read their own orders; only the service role (which bypasses RLS)
-- inserts and updates them from the edge functions.
drop policy if exists "payment_orders_select_own" on public.payment_orders;
create policy "payment_orders_select_own" on public.payment_orders
  for select using (auth.uid() = user_id);

grant select on public.payment_orders to authenticated;

drop trigger if exists set_payment_orders_updated_at on public.payment_orders;
create trigger set_payment_orders_updated_at
  before update on public.payment_orders
  for each row execute function app_private.set_updated_at();

-- Grants the purchased paid credits for a verified order, exactly once.
create or replace function public.settle_razorpay_order(p_order_id text, p_payment_id text)
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
      (v_order.user_id, 'relationship_report', v_order.report_count, 0, current_date, date '2099-12-31', 'razorpay_test'),
      (v_order.user_id, 'bestie_message', v_order.bestie_count, 0, current_date, date '2099-12-31', 'razorpay_test');

    update public.payment_orders
    set status = 'paid', provider_payment_id = p_payment_id, updated_at = now()
    where id = v_order.id;

    insert into public.payment_events (
      user_id, provider, provider_event_id, event_type, payload, processed_at
    )
    values (
      v_order.user_id,
      'razorpay',
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

revoke all on function public.settle_razorpay_order(text, text) from public;
revoke all on function public.settle_razorpay_order(text, text) from anon;
revoke all on function public.settle_razorpay_order(text, text) from authenticated;
grant execute on function public.settle_razorpay_order(text, text) to service_role;
