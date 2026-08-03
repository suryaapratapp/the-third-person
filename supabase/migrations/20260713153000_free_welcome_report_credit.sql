-- One-time free Relationship Report for new accounts.
--
-- The free report is granted as an analysis_credits row with source = 'free'.
-- Report generation may spend it (consume with p_allow_free = true), while the
-- AI Relationship Coach and Understand Yourself may NOT: they consume with
-- p_allow_free = false and therefore only ever see paid credits (source <>
-- 'free'). This keeps those two features paid-only with no extra bookkeeping,
-- reusing the existing 'free' sentinel that is already excluded from the paid
-- balance in the client and RPCs.

-- 1) consume_analysis_credit gains p_allow_free (default false). When allowed,
--    free credits are spent FIRST so a user's paid credits are preserved for
--    the premium features.
drop function if exists public.consume_analysis_credit(uuid, text);
drop function if exists public.consume_analysis_credit(uuid, text, boolean);

create function public.consume_analysis_credit(
  p_user_id uuid,
  p_credit_type text,
  p_allow_free boolean default false
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
    and credits_used < credits_granted
    and (p_allow_free or source <> 'free')
  order by (source = 'free') desc, created_at asc
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

revoke all on function public.consume_analysis_credit(uuid, text, boolean) from public;
revoke all on function public.consume_analysis_credit(uuid, text, boolean) from anon;
revoke all on function public.consume_analysis_credit(uuid, text, boolean) from authenticated;
grant execute on function public.consume_analysis_credit(uuid, text, boolean) to service_role;

-- 2) claim_test_credit_pack gains a one-time 'free_starter' pack: exactly one
--    Relationship Report (source 'free'), and no Coach chats.
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
  v_free_report_balance integer;
  v_already_claimed boolean;
begin
  if v_user_id is null then
    raise exception 'Please sign in to continue.';
  end if;

  -- One-time free welcome Relationship Report. No Coach chats. Understand
  -- Yourself and Coach stay paid-only because this credit is source 'free'.
  if p_pack_id = 'free_starter' then
    if exists (
      select 1 from public.analysis_credits
      where user_id = v_user_id and source = 'free'
    ) then
      raise exception 'You have already claimed your free Relationship Report.';
    end if;

    insert into public.analysis_credits (
      user_id, credit_type, credits_granted, credits_used, period_start, period_end, source
    )
    values (v_user_id, 'relationship_report', 1, 0, current_date, date '2099-12-31', 'free');

    insert into public.payment_events (
      user_id, provider, provider_event_id, event_type, payload, processed_at
    )
    values (
      v_user_id,
      'free_welcome',
      'free_' || v_user_id::text || '_' || extract(epoch from clock_timestamp())::text,
      'free_pack_granted',
      jsonb_build_object('packId', 'free_starter', 'relationshipReports', 1),
      now()
    );

    select coalesce(sum(greatest(credits_granted - credits_used, 0)), 0)
    into v_free_report_balance
    from public.analysis_credits
    where user_id = v_user_id and credit_type = 'relationship_report';

    return jsonb_build_object(
      'freeStarterClaimed', true,
      'relationshipReportsLeft', v_free_report_balance,
      'paidRelationshipReportsLeft', 0,
      'paidBestieChatsLeft', 0
    );
  end if;

  -- Paid test packs (pre-checkout testing mechanism), one claim ever per user.
  select exists(
    select 1 from public.analysis_credits
    where user_id = v_user_id
      and source like 'test_%'
  ) into v_already_claimed;

  if v_already_claimed then
    raise exception 'You have already claimed your one-time test credit pack.';
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
    user_id, credit_type, credits_granted, credits_used, period_start, period_end, source
  )
  values
    (v_user_id, 'relationship_report', v_reports, 0, current_date, date '2099-12-31', v_source),
    (v_user_id, 'bestie_message', v_bestie, 0, current_date, date '2099-12-31', v_source);

  insert into public.payment_events (
    user_id, provider, provider_event_id, event_type, payload, processed_at
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
