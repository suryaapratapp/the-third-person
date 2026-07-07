-- The "2 free analyses" limit was only enforced client-side (a count done
-- in the browser before calling the free-tier provider). A user could bypass
-- it by calling the free analysis path directly. This adds a database-level
-- backstop: once a user already has 2 rows tagged as free-tier analyses,
-- a further free-tier insert is rejected outright.

create or replace function public.enforce_free_analysis_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_free_count integer;
  v_is_free boolean;
begin
  v_is_free := coalesce(new.analysis_json ->> 'providerMode', '') = 'free'
    or coalesce(new.analysis_json ->> 'generationTier', '') = 'free_relationship_analysis';

  if not v_is_free then
    return new;
  end if;

  select count(*)
  into v_free_count
  from public.relationship_reports
  where user_id = new.user_id
    and (
      analysis_json ->> 'providerMode' = 'free'
      or analysis_json ->> 'generationTier' = 'free_relationship_analysis'
    );

  if v_free_count >= 2 then
    raise exception 'FREE_ANALYSIS_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_free_analysis_limit_trigger on public.relationship_reports;
create trigger enforce_free_analysis_limit_trigger
before insert on public.relationship_reports
for each row execute function public.enforce_free_analysis_limit();
