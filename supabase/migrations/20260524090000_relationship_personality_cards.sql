-- Relationship-specific personality cards and paid Understand Yourself profiles.

create table if not exists public.relationship_personality_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  relationship_type text not null,
  other_person_name text,
  report_id uuid references public.relationship_reports(id) on delete set null,
  title text,
  short_summary text,
  personality_label text,
  personality_type_signal text,
  green_flags_summary text,
  red_flags_summary text,
  communication_style_summary text,
  emotional_signature_summary text,
  attraction_energy_summary text,
  growth_areas_summary text,
  keywords text[] not null default '{}'::text[],
  confidence_level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, report_id)
);

create table if not exists public.understand_yourself_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_personality_card_ids uuid[] not null default '{}'::uuid[],
  overall_profile_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists relationship_personality_cards_user_created_idx
on public.relationship_personality_cards(user_id, created_at desc);

create index if not exists relationship_personality_cards_user_type_idx
on public.relationship_personality_cards(user_id, relationship_type, created_at desc);

create index if not exists relationship_personality_cards_report_idx
on public.relationship_personality_cards(report_id);

create index if not exists understand_yourself_profiles_user_updated_idx
on public.understand_yourself_profiles(user_id, updated_at desc);

drop trigger if exists set_relationship_personality_cards_updated_at on public.relationship_personality_cards;
create trigger set_relationship_personality_cards_updated_at
before update on public.relationship_personality_cards
for each row execute function app_private.set_updated_at();

drop trigger if exists set_understand_yourself_profiles_updated_at on public.understand_yourself_profiles;
create trigger set_understand_yourself_profiles_updated_at
before update on public.understand_yourself_profiles
for each row execute function app_private.set_updated_at();

alter table public.relationship_personality_cards enable row level security;
alter table public.understand_yourself_profiles enable row level security;

drop policy if exists "relationship_personality_cards_select_own" on public.relationship_personality_cards;
create policy "relationship_personality_cards_select_own" on public.relationship_personality_cards
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "relationship_personality_cards_insert_own" on public.relationship_personality_cards;
create policy "relationship_personality_cards_insert_own" on public.relationship_personality_cards
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "relationship_personality_cards_update_own" on public.relationship_personality_cards;
create policy "relationship_personality_cards_update_own" on public.relationship_personality_cards
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "relationship_personality_cards_delete_own" on public.relationship_personality_cards;
create policy "relationship_personality_cards_delete_own" on public.relationship_personality_cards
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "understand_yourself_profiles_select_own" on public.understand_yourself_profiles;
create policy "understand_yourself_profiles_select_own" on public.understand_yourself_profiles
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "understand_yourself_profiles_insert_own" on public.understand_yourself_profiles;
create policy "understand_yourself_profiles_insert_own" on public.understand_yourself_profiles
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "understand_yourself_profiles_update_own" on public.understand_yourself_profiles;
create policy "understand_yourself_profiles_update_own" on public.understand_yourself_profiles
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "understand_yourself_profiles_delete_own" on public.understand_yourself_profiles;
create policy "understand_yourself_profiles_delete_own" on public.understand_yourself_profiles
for delete to authenticated
using (user_id = auth.uid());

grant select, insert, update, delete on public.relationship_personality_cards to authenticated;
grant select, insert, update, delete on public.understand_yourself_profiles to authenticated;
