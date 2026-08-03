-- Task 7: user-facing data controls.
--
-- Several tables (user_personality, personality_history) intentionally have no
-- DELETE policy for the authenticated role, so a client-side "delete my data"
-- would silently affect zero rows there. This RPC performs the wipe as
-- SECURITY DEFINER, scoped strictly to auth.uid(), and returns per-table counts
-- so the UI can honestly report what was removed.
--
-- Deliberately PRESERVED:
--   * analysis_credits    — the user paid for these; a data wipe must not burn them
--   * payment_orders/events — financial records kept for accounting
--   * ai_usage_logs, daily_message_usage — abuse/rate-limit telemetry, no chat content
-- These exclusions are stated in the UI copy next to the button.

create or replace function public.delete_my_analysis_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_reports integer := 0;
  v_cards integer := 0;
  v_profiles integer := 0;
  v_personality integer := 0;
  v_history integer := 0;
  v_messages integer := 0;
begin
  if v_user_id is null then
    raise exception 'Please sign in to continue.';
  end if;

  delete from public.bestie_messages where user_id = v_user_id;
  get diagnostics v_messages = row_count;

  delete from public.personality_history where user_id = v_user_id;
  get diagnostics v_history = row_count;

  delete from public.relationship_personality_cards where user_id = v_user_id;
  get diagnostics v_cards = row_count;

  delete from public.understand_yourself_profiles where user_id = v_user_id;
  get diagnostics v_profiles = row_count;

  delete from public.user_personality where user_id = v_user_id;
  get diagnostics v_personality = row_count;

  delete from public.relationship_reports where user_id = v_user_id;
  get diagnostics v_reports = row_count;

  return jsonb_build_object(
    'reports', v_reports,
    'personalityCards', v_cards,
    'understandYourselfProfiles', v_profiles,
    'personalityProfiles', v_personality,
    'personalityHistory', v_history,
    'coachMessages', v_messages
  );
end;
$$;

revoke all on function public.delete_my_analysis_data() from public;
revoke all on function public.delete_my_analysis_data() from anon;
grant execute on function public.delete_my_analysis_data() to authenticated;

-- Deleting a single report should also remove the derived personality card and
-- history entry for it. Both FKs are ON DELETE SET NULL, so without this the
-- card would linger (orphaned) and keep feeding Understand Yourself.
create or replace function public.delete_my_report(p_report_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted integer := 0;
begin
  if v_user_id is null then
    raise exception 'Please sign in to continue.';
  end if;

  -- Ownership check first: never touch another user's rows.
  if not exists (
    select 1 from public.relationship_reports
    where id = p_report_id and user_id = v_user_id
  ) then
    return jsonb_build_object('deleted', false, 'reason', 'not_found');
  end if;

  delete from public.relationship_personality_cards
    where user_id = v_user_id and report_id = p_report_id;
  delete from public.personality_history
    where user_id = v_user_id and report_id = p_report_id;
  delete from public.relationship_reports
    where id = p_report_id and user_id = v_user_id;
  get diagnostics v_deleted = row_count;

  return jsonb_build_object('deleted', v_deleted > 0);
end;
$$;

revoke all on function public.delete_my_report(uuid) from public;
revoke all on function public.delete_my_report(uuid) from anon;
grant execute on function public.delete_my_report(uuid) to authenticated;
