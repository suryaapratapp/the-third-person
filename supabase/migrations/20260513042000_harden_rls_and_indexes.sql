-- ThirdPerson AI backend hardening
-- Keeps user data isolated while removing advisor warnings where practical.

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create index if not exists bestie_messages_relationship_report_id_idx
on public.bestie_messages(relationship_report_id);

create index if not exists subscriptions_plan_id_idx
on public.subscriptions(plan_id);

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "relationship_reports_select_own" on public.relationship_reports;
drop policy if exists "relationship_reports_insert_own" on public.relationship_reports;
drop policy if exists "relationship_reports_update_own" on public.relationship_reports;
drop policy if exists "relationship_reports_delete_own" on public.relationship_reports;
drop policy if exists "bestie_messages_select_own" on public.bestie_messages;
drop policy if exists "bestie_messages_insert_own" on public.bestie_messages;
drop policy if exists "bestie_messages_update_own" on public.bestie_messages;
drop policy if exists "bestie_messages_delete_own" on public.bestie_messages;
drop policy if exists "user_personality_select_own" on public.user_personality;
drop policy if exists "user_personality_insert_own" on public.user_personality;
drop policy if exists "user_personality_update_own" on public.user_personality;
drop policy if exists "subscriptions_select_own" on public.subscriptions;
drop policy if exists "analysis_credits_select_own" on public.analysis_credits;
drop policy if exists "daily_message_usage_select_own" on public.daily_message_usage;
drop policy if exists "ai_usage_logs_select_own" on public.ai_usage_logs;
drop policy if exists "payment_events_select_own" on public.payment_events;
drop policy if exists "chat_uploads_select_own" on storage.objects;
drop policy if exists "chat_uploads_insert_own" on storage.objects;
drop policy if exists "chat_uploads_update_own" on storage.objects;
drop policy if exists "chat_uploads_delete_own" on storage.objects;

create policy "profiles_select_own" on public.profiles
for select to authenticated
using (id = (select auth.uid()));

create policy "profiles_insert_own" on public.profiles
for insert to authenticated
with check (id = (select auth.uid()));

create policy "profiles_update_own" on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "relationship_reports_select_own" on public.relationship_reports
for select to authenticated
using (user_id = (select auth.uid()));

create policy "relationship_reports_insert_own" on public.relationship_reports
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "relationship_reports_update_own" on public.relationship_reports
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "relationship_reports_delete_own" on public.relationship_reports
for delete to authenticated
using (user_id = (select auth.uid()));

create policy "bestie_messages_select_own" on public.bestie_messages
for select to authenticated
using (user_id = (select auth.uid()));

create policy "bestie_messages_insert_own" on public.bestie_messages
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "bestie_messages_update_own" on public.bestie_messages
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "bestie_messages_delete_own" on public.bestie_messages
for delete to authenticated
using (user_id = (select auth.uid()));

create policy "user_personality_select_own" on public.user_personality
for select to authenticated
using (user_id = (select auth.uid()));

create policy "user_personality_insert_own" on public.user_personality
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "user_personality_update_own" on public.user_personality
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "subscriptions_select_own" on public.subscriptions
for select to authenticated
using (user_id = (select auth.uid()));

create policy "analysis_credits_select_own" on public.analysis_credits
for select to authenticated
using (user_id = (select auth.uid()));

create policy "daily_message_usage_select_own" on public.daily_message_usage
for select to authenticated
using (user_id = (select auth.uid()));

create policy "ai_usage_logs_select_own" on public.ai_usage_logs
for select to authenticated
using (user_id = (select auth.uid()));

create policy "payment_events_select_own" on public.payment_events
for select to authenticated
using (user_id = (select auth.uid()));

create policy "chat_uploads_select_own" on storage.objects
for select to authenticated
using (
  bucket_id = 'chat-uploads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "chat_uploads_insert_own" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'chat-uploads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "chat_uploads_update_own" on storage.objects
for update to authenticated
using (
  bucket_id = 'chat-uploads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'chat-uploads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "chat_uploads_delete_own" on storage.objects
for delete to authenticated
using (
  bucket_id = 'chat-uploads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
