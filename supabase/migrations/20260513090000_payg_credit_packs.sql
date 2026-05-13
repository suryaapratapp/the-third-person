-- Pay-as-you-go credit packs for ThirdPerson AI.
-- Existing column names mention "weekly" from the first schema version, but the
-- values below now represent pack credits and are not reset by time period.

update public.plans
set
  name = 'Clarity Pack',
  description = 'Pay-as-you-go credits for casual relationship clarity.',
  weekly_report_limit = 5,
  weekly_bestie_message_limit = 50,
  intelligence_label = 'Pay-As-You-Go Clarity',
  sort_order = 10,
  is_active = true,
  updated_at = now()
where id = 'starter_clarity';

update public.plans
set
  name = 'Deep Clarity Pack',
  description = 'Pay-as-you-go credits for deeper relationship reflection.',
  weekly_report_limit = 10,
  weekly_bestie_message_limit = 100,
  intelligence_label = 'Deeper ThirdPerson POV',
  sort_order = 20,
  is_active = true,
  updated_at = now()
where id = 'deep_insight';

create or replace function public.consume_analysis_credit(
  p_user_id uuid,
  p_credit_type text
)
returns integer
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
  order by created_at asc
  limit 1
  for update;

  if v_credit_id is null then
    return -1;
  end if;

  update public.analysis_credits
  set credits_used = credits_used + 1,
      updated_at = now()
  where id = v_credit_id
  returning credits_granted - credits_used into v_remaining;

  return greatest(v_remaining, 0);
end;
$$;

revoke all on function public.consume_analysis_credit(uuid, text) from public;
revoke all on function public.consume_analysis_credit(uuid, text) from anon;
revoke all on function public.consume_analysis_credit(uuid, text) from authenticated;
grant execute on function public.consume_analysis_credit(uuid, text) to service_role;
