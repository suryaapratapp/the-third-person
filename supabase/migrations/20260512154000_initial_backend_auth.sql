-- ThirdPerson AI backend foundation
-- REVIEW ONLY until approved. Do not apply before reviewing tables, policies, and Edge Function plan.

create extension if not exists pgcrypto;

create schema if not exists app_private;

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  gender_identity text check (gender_identity in ('Female', 'Male', 'Transgender', 'Non-binary', 'Other', 'Prefer not to say') or gender_identity is null),
  date_of_birth date,
  zodiac_sign text,
  preferred_language_tone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.relationship_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chain_id text not null,
  person_name text not null,
  relationship_type text not null,
  platform text not null,
  date_range text,
  participants jsonb not null default '[]'::jsonb,
  message_count integer not null default 0 check (message_count >= 0),
  main_dynamic text,
  emotional_trend text,
  compatibility_score integer check (compatibility_score between 0 and 100),
  summary jsonb not null default '{}'::jsonb,
  analysis_json jsonb not null default '{}'::jsonb,
  prepared_conversation jsonb not null default '{}'::jsonb,
  source_file_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bestie_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chain_id text not null,
  relationship_report_id uuid references public.relationship_reports(id) on delete set null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  saved_as_insight boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.user_personality (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  personality_json jsonb not null default '{}'::jsonb,
  emotional_life_story jsonb not null default '{}'::jsonb,
  recurring_words jsonb not null default '[]'::jsonb,
  profile_card_theme text,
  generated_from_report_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.plans (
  id text primary key,
  name text not null,
  description text,
  weekly_report_limit integer not null check (weekly_report_limit >= 0),
  weekly_bestie_message_limit integer not null check (weekly_bestie_message_limit >= 0),
  intelligence_label text not null,
  price_cents integer check (price_cents is null or price_cents >= 0),
  currency text not null default 'INR',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text references public.plans(id),
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled', 'expired', 'incomplete')),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analysis_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credit_type text not null check (credit_type in ('relationship_report', 'bestie_message')),
  credits_granted integer not null default 0 check (credits_granted >= 0),
  credits_used integer not null default 0 check (credits_used >= 0),
  period_start date not null,
  period_end date not null,
  source text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start),
  check (credits_used <= credits_granted)
);

create table if not exists public.daily_message_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  bestie_messages_count integer not null default 0 check (bestie_messages_count >= 0),
  relationship_reports_count integer not null default 0 check (relationship_reports_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, usage_date)
);

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('generate_relationship_report', 'ai_bestie_chat', 'generate_personality')),
  provider text,
  request_units integer not null default 0 check (request_units >= 0),
  response_units integer not null default 0 check (response_units >= 0),
  estimated_cost_cents integer check (estimated_cost_cents is null or estimated_cost_cents >= 0),
  status text not null default 'success' check (status in ('success', 'blocked_no_credits', 'error')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists relationship_reports_user_chain_idx on public.relationship_reports(user_id, chain_id, created_at desc);
create index if not exists bestie_messages_user_chain_idx on public.bestie_messages(user_id, chain_id, created_at asc);
create index if not exists subscriptions_user_status_idx on public.subscriptions(user_id, status);
create index if not exists analysis_credits_user_period_idx on public.analysis_credits(user_id, credit_type, period_start, period_end);
create index if not exists ai_usage_logs_user_action_idx on public.ai_usage_logs(user_id, action, created_at desc);
create index if not exists payment_events_user_idx on public.payment_events(user_id, created_at desc);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function app_private.set_updated_at();

create trigger set_relationship_reports_updated_at
before update on public.relationship_reports
for each row execute function app_private.set_updated_at();

create trigger set_user_personality_updated_at
before update on public.user_personality
for each row execute function app_private.set_updated_at();

create trigger set_plans_updated_at
before update on public.plans
for each row execute function app_private.set_updated_at();

create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function app_private.set_updated_at();

create trigger set_analysis_credits_updated_at
before update on public.analysis_credits
for each row execute function app_private.set_updated_at();

create trigger set_daily_message_usage_updated_at
before update on public.daily_message_usage
for each row execute function app_private.set_updated_at();

drop trigger if exists on_auth_user_created_thirdperson_profile on auth.users;
create trigger on_auth_user_created_thirdperson_profile
after insert on auth.users
for each row execute function app_private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.relationship_reports enable row level security;
alter table public.bestie_messages enable row level security;
alter table public.user_personality enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.analysis_credits enable row level security;
alter table public.daily_message_usage enable row level security;
alter table public.ai_usage_logs enable row level security;
alter table public.payment_events enable row level security;

create policy "profiles_select_own" on public.profiles
for select to authenticated
using (id = auth.uid());

create policy "profiles_insert_own" on public.profiles
for insert to authenticated
with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "relationship_reports_select_own" on public.relationship_reports
for select to authenticated
using (user_id = auth.uid());

create policy "relationship_reports_insert_own" on public.relationship_reports
for insert to authenticated
with check (user_id = auth.uid());

create policy "relationship_reports_update_own" on public.relationship_reports
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "relationship_reports_delete_own" on public.relationship_reports
for delete to authenticated
using (user_id = auth.uid());

create policy "bestie_messages_select_own" on public.bestie_messages
for select to authenticated
using (user_id = auth.uid());

create policy "bestie_messages_insert_own" on public.bestie_messages
for insert to authenticated
with check (user_id = auth.uid());

create policy "bestie_messages_update_own" on public.bestie_messages
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "bestie_messages_delete_own" on public.bestie_messages
for delete to authenticated
using (user_id = auth.uid());

create policy "user_personality_select_own" on public.user_personality
for select to authenticated
using (user_id = auth.uid());

create policy "user_personality_insert_own" on public.user_personality
for insert to authenticated
with check (user_id = auth.uid());

create policy "user_personality_update_own" on public.user_personality
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "plans_public_read_active" on public.plans
for select to anon, authenticated
using (is_active = true);

create policy "subscriptions_select_own" on public.subscriptions
for select to authenticated
using (user_id = auth.uid());

create policy "analysis_credits_select_own" on public.analysis_credits
for select to authenticated
using (user_id = auth.uid());

create policy "daily_message_usage_select_own" on public.daily_message_usage
for select to authenticated
using (user_id = auth.uid());

create policy "ai_usage_logs_select_own" on public.ai_usage_logs
for select to authenticated
using (user_id = auth.uid());

-- payment_events intentionally has no anon/auth policies. Service-role Edge Functions can write/read it.

insert into public.plans (id, name, description, weekly_report_limit, weekly_bestie_message_limit, intelligence_label, price_cents, currency, sort_order)
values
  ('starter_clarity', 'Starter Clarity', 'For casual relationship checks.', 5, 100, 'Standard Intelligence', null, 'INR', 10),
  ('deep_insight', 'Deep Insight', 'For people actively trying to understand a relationship.', 10, 250, 'Advanced Relationship Intelligence', null, 'INR', 20)
on conflict (id) do update
set name = excluded.name,
    description = excluded.description,
    weekly_report_limit = excluded.weekly_report_limit,
    weekly_bestie_message_limit = excluded.weekly_bestie_message_limit,
    intelligence_label = excluded.intelligence_label,
    sort_order = excluded.sort_order,
    updated_at = now();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-uploads',
  'chat-uploads',
  false,
  10485760,
  array['text/plain', 'application/json', 'text/csv', 'application/zip']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "chat_uploads_select_own" on storage.objects
for select to authenticated
using (
  bucket_id = 'chat-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "chat_uploads_insert_own" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'chat-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "chat_uploads_update_own" on storage.objects
for update to authenticated
using (
  bucket_id = 'chat-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'chat-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "chat_uploads_delete_own" on storage.objects
for delete to authenticated
using (
  bucket_id = 'chat-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);
