-- Personality evolution history (Task 5: real personality accumulation).
--
-- Every report generation appends one row capturing what that analysis
-- contributed to the user's personality model: the delta versus the previous
-- profile, which relationship world it came from, and a concise summary.
-- Append-only: written by the service role from generate-relationship-report;
-- users can only read their own history ("How your profile is evolving").

create table if not exists public.personality_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid references public.relationship_reports(id) on delete set null,
  relationship_type text,
  relationship_world text,
  person_name text,
  personality_delta jsonb not null default '[]'::jsonb,
  card_summary text,
  confidence_level text,
  created_at timestamptz not null default now()
);

create index if not exists personality_history_user_created_idx
  on public.personality_history(user_id, created_at desc);

alter table public.personality_history enable row level security;

drop policy if exists "personality_history_select_own" on public.personality_history;
create policy "personality_history_select_own" on public.personality_history
  for select using (auth.uid() = user_id);

grant select on public.personality_history to authenticated;
