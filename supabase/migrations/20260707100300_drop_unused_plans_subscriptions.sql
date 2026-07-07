-- plans and subscriptions were scaffolding for an earlier weekly-limit
-- subscription design. The shipped product is pay-as-you-go credit packs
-- (analysis_credits) and neither table is referenced anywhere in the
-- frontend or Edge Functions. Dropping them so the schema matches what is
-- actually in use; cascade removes their now-orphaned policies, indexes,
-- and the subscriptions -> plans foreign key.

drop table if exists public.subscriptions cascade;
drop table if exists public.plans cascade;
