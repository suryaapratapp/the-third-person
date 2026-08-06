-- Close the free-credit hole in claim_test_credit_pack.
--
-- The free tier was removed from the product, and the function was updated to
-- refuse the 'free_starter' pack. But the two ORIGINAL test packs were left
-- reachable, and execute was still granted to `authenticated`:
--
--   clarity_pack       ->  5 relationship reports + 25 coach chats
--   deep_clarity_pack  -> 10 relationship reports + 50 coach chats
--
-- Since signup is free and the anon key is public, any signed-in user could
-- open the browser console and run
--
--   supabase.rpc('claim_test_credit_pack', { p_pack_id: 'deep_clarity_pack' })
--
-- to mint ~2,490 rupees of reports for nothing, repeatable with a fresh email.
-- The removed client wrapper never mattered: the grant is what exposed it.
--
-- service_role deliberately KEEPS execute, so test credits can still be granted
-- deliberately from the Supabase SQL editor or dashboard. Only the browser-
-- reachable path is closed. Reversible with a single grant if ever needed.

revoke execute on function public.claim_test_credit_pack(text) from authenticated;

comment on function public.claim_test_credit_pack(text) is
  'Test-only credit granting. NOT executable by `authenticated` — service_role only. '
  'Granting execute back to `authenticated` re-opens a free-credit hole, because signup '
  'is free and the RPC is callable directly from the browser console.';
