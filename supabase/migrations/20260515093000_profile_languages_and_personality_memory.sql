alter table public.profiles
add column if not exists preferred_analysis_languages text[] not null default array['English', 'Hindi'];

alter table public.relationship_reports
add column if not exists bestie_context_summary jsonb not null default '{}'::jsonb,
add column if not exists report_summary_for_future_use jsonb not null default '{}'::jsonb,
add column if not exists main_user_personality_signals jsonb not null default '{}'::jsonb;
