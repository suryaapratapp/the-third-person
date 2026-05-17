-- Local testing helper for Pay-As-You-Go credit packs.
-- This lets authenticated users on the current frontend test the paid OpenAI
-- report and Bestie paths before real checkout is connected.

create or replace function public.claim_test_credit_pack(p_pack_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_reports integer;
  v_bestie integer;
  v_source text;
  v_report_balance integer;
  v_bestie_balance integer;
begin
  if v_user_id is null then
    raise exception 'Please sign in to continue.';
  end if;

  if p_pack_id = 'clarity_pack' then
    v_reports := 5;
    v_bestie := 50;
    v_source := 'test_clarity_pack';
  elsif p_pack_id = 'deep_clarity_pack' then
    v_reports := 10;
    v_bestie := 100;
    v_source := 'test_deep_clarity_pack';
  else
    raise exception 'Unknown pack.';
  end if;

  insert into public.analysis_credits (
    user_id,
    credit_type,
    credits_granted,
    credits_used,
    period_start,
    period_end,
    source
  )
  values
    (v_user_id, 'relationship_report', v_reports, 0, current_date, date '2099-12-31', v_source),
    (v_user_id, 'bestie_message', v_bestie, 0, current_date, date '2099-12-31', v_source);

  insert into public.payment_events (
    user_id,
    provider,
    provider_event_id,
    event_type,
    payload,
    processed_at
  )
  values (
    v_user_id,
    'test_checkout',
    'test_' || v_user_id::text || '_' || p_pack_id || '_' || extract(epoch from clock_timestamp())::text,
    'test_pack_granted',
    jsonb_build_object('packId', p_pack_id, 'relationshipReports', v_reports, 'bestieChats', v_bestie),
    now()
  );

  select coalesce(sum(greatest(credits_granted - credits_used, 0)), 0)
  into v_report_balance
  from public.analysis_credits
  where user_id = v_user_id
    and credit_type = 'relationship_report'
    and source <> 'free';

  select coalesce(sum(greatest(credits_granted - credits_used, 0)), 0)
  into v_bestie_balance
  from public.analysis_credits
  where user_id = v_user_id
    and credit_type = 'bestie_message'
    and source <> 'free';

  return jsonb_build_object(
    'paidRelationshipReportsLeft', v_report_balance,
    'paidBestieChatsLeft', v_bestie_balance
  );
end;
$$;

revoke all on function public.claim_test_credit_pack(text) from public;
revoke all on function public.claim_test_credit_pack(text) from anon;
grant execute on function public.claim_test_credit_pack(text) to authenticated;
