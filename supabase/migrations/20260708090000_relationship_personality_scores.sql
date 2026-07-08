-- Adds per-relationship-category personality score meters (speaking style,
-- humour, calmness, ego, empathy, expressiveness, patience) and signature
-- behaviours, used by the Understand Yourself per-category dialogs.

alter table public.relationship_personality_cards
  add column if not exists personality_scores jsonb;
