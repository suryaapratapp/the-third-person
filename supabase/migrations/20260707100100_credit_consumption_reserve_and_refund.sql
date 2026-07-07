-- Fixes a cost-amplification gap: Edge Functions previously checked credit
-- balance with a plain SELECT, called the (expensive) AI provider, and only
-- consumed the credit atomically afterwards. Concurrent requests near the
-- last credit could each trigger a real OpenAI call before the atomic check
-- caught them. This changes the flow to reserve-then-call: consume the
-- credit atomically FIRST (so only as many concurrent requests as there are
-- real credits ever reach the AI provider), and adds a companion refund
-- function so a failed AI call or failed insert can give the credit back.

drop function if exists public.consume_analysis_credit(uuid, text);

create function public.consume_analysis_credit(
  p_user_id uuid,
  p_credit_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credit_id uuid;
  v_remaining integer;
begin
  if p_credit_type not in ('relationship_report', 'bestie_message') then
    raise exception 'Unsupported credit type';
  end if;

  select id
  into v_credit_id
  from public.analysis_credits
  where user_id = p_user_id
    and credit_type = p_credit_type
    and source <> 'free'
    and credits_used < credits_granted
  order by created_at asc
  limit 1
  for update;

  if v_credit_id is null then
    return jsonb_build_object('allowed', false, 'remaining', 0, 'creditId', null);
  end if;

  update public.analysis_credits
  set credits_used = credits_used + 1,
      updated_at = now()
  where id = v_credit_id
  returning credits_granted - credits_used into v_remaining;

  return jsonb_build_object('allowed', true, 'remaining', greatest(v_remaining, 0), 'creditId', v_credit_id);
end;
$$;

revoke all on function public.consume_analysis_credit(uuid, text) from public;
revoke all on function public.consume_analysis_credit(uuid, text) from anon;
revoke all on function public.consume_analysis_credit(uuid, text) from authenticated;
grant execute on function public.consume_analysis_credit(uuid, text) to service_role;

create or replace function public.refund_analysis_credit(p_credit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_credit_id is null then
    return;
  end if;

  update public.analysis_credits
  set credits_used = greatest(credits_used - 1, 0),
      updated_at = now()
  where id = p_credit_id;
end;
$$;

revoke all on function public.refund_analysis_credit(uuid) from public;
revoke all on function public.refund_analysis_credit(uuid) from anon;
revoke all on function public.refund_analysis_credit(uuid) from authenticated;
grant execute on function public.refund_analysis_credit(uuid) to service_role;
