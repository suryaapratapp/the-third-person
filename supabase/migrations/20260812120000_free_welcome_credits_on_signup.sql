-- Actually grant the free welcome credits, and extend them to Know Yourself.
--
-- THE BUG THIS FIXES: the free report did not exist in practice. The only
-- thing that granted it was claim_test_credit_pack('free_starter'), and that
-- function was revoked from `authenticated` in
-- 20260806180000_revoke_test_credit_pack_from_authenticated.sql — correctly,
-- because it was a free-credit hole — after which nothing granted the credit
-- and no client code called it. Every account created since then has started
-- with zero credits and hit a paywall on its first report.
--
-- THE FIX: grant on signup, from the trigger that already runs for every new
-- account. That is strictly safer than the RPC it replaces: there is no
-- client-callable surface to farm, it cannot be replayed, and it needs no
-- grant to `authenticated` at all.
--
-- WHAT IS GRANTED: one Relationship Report and one Know Yourself, both
-- source 'free'. They are SEPARATE credit types so neither can consume the
-- other's — a new user gets a report AND the profile it feeds, which is the
-- whole point of the free tier. The Coach stays paid-only: it has no free
-- credit here and reserves without allowFree.
--
-- SAFETY: additive. No signature changes, nothing dropped, paid paths
-- untouched. Existing accounts are backfilled so people who signed up during
-- the broken window are not permanently worse off.

-- 1) Widen the credit-type allowlist. This is the only change to the consume
--    function and it adds a value rather than altering any logic.
create or replace function public.consume_analysis_credit(
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
  if p_credit_type not in ('relationship_report', 'bestie_message', 'personality_card') then
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
  set credits_used = credits_used + 1
  where id = v_credit_id;

  select coalesce(sum(greatest(credits_granted - credits_used, 0)), 0)
  into v_remaining
  from public.analysis_credits
  where user_id = p_user_id and credit_type = p_credit_type;

  return jsonb_build_object('allowed', true, 'remaining', v_remaining, 'creditId', v_credit_id);
end;
$$;

revoke all on function public.consume_analysis_credit(uuid, text, boolean) from public;
revoke all on function public.consume_analysis_credit(uuid, text, boolean) from anon;
revoke all on function public.consume_analysis_credit(uuid, text, boolean) from authenticated;
grant execute on function public.consume_analysis_credit(uuid, text, boolean) to service_role;

-- 2) Grant the welcome credits from the existing new-user trigger.
create or replace function app_private.grant_welcome_credits(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Guarded rather than relying on a unique index: `source = 'free'` is the
  -- same sentinel the rest of the system uses to mean "welcome grant", so this
  -- stays correct even if the trigger is ever re-run for an existing account.
  if exists (
    select 1 from public.analysis_credits
    where user_id = p_user_id and source = 'free'
  ) then
    return;
  end if;

  insert into public.analysis_credits (
    user_id, credit_type, credits_granted, credits_used, period_start, period_end, source
  )
  values
    (p_user_id, 'relationship_report', 1, 0, current_date, date '2099-12-31', 'free'),
    (p_user_id, 'personality_card',    1, 0, current_date, date '2099-12-31', 'free');
end;
$$;

revoke all on function app_private.grant_welcome_credits(uuid) from public;
revoke all on function app_private.grant_welcome_credits(uuid) from anon;
revoke all on function app_private.grant_welcome_credits(uuid) from authenticated;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', split_part(coalesce(new.raw_user_meta_data ->> 'full_name', ''), ' ', 1)),
    coalesce(new.raw_user_meta_data ->> 'last_name', nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'full_name', ''), '^\S+\s*', ''), '')),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do update
    set email = excluded.email,
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
        updated_at = now();

  -- Never let a credit problem block account creation. A signup that fails
  -- because of a bookkeeping row is far worse than a missing free credit,
  -- which support can add by hand.
  begin
    perform app_private.grant_welcome_credits(new.id);
  exception when others then
    raise warning 'grant_welcome_credits failed for %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

-- 3) Backfill every existing account that never received the grant.
insert into public.analysis_credits (
  user_id, credit_type, credits_granted, credits_used, period_start, period_end, source
)
select u.id, t.credit_type, 1, 0, current_date, date '2099-12-31', 'free'
from auth.users u
cross join (values ('relationship_report'), ('personality_card')) as t(credit_type)
where not exists (
  select 1 from public.analysis_credits existing
  where existing.user_id = u.id
    and existing.credit_type = t.credit_type
    and existing.source = 'free'
);
