import { isSupabaseConfigured, supabase } from './supabaseClient.js';

export const EMPTY_CREDIT_BALANCE = {
  relationshipReportsLeft: 0,
  bestieChatsLeft: 0,
  personalityCardsLeft: 0,
  paidRelationshipReportsLeft: 0,
  paidBestieChatsLeft: 0,
  freeReportsLeft: 0,
  hasClaimedFreeReport: false,
  hasPaidPack: false,
  loading: false,
  available: false,
};

export async function fetchCreditBalances() {
  if (!isSupabaseConfigured || !supabase) return EMPTY_CREDIT_BALANCE;

  const { data, error } = await supabase
    .from('analysis_credits')
    .select('credit_type, credits_granted, credits_used, source');

  if (error) return { ...EMPTY_CREDIT_BALANCE, available: true, error: error.message };

  const balances = (data || []).reduce(
    (acc, row) => {
      const remaining = Math.max((row.credits_granted || 0) - (row.credits_used || 0), 0);
      const isFree = row.source === 'free';
      const isPaid = row.source && !isFree;
      if (isPaid) acc.hasPaidPack = true;
      if (isFree) acc.hasClaimedFreeReport = true;
      if (row.credit_type === 'relationship_report') acc.relationshipReportsLeft += remaining;
      if (row.credit_type === 'bestie_message') acc.bestieChatsLeft += remaining;
      if (isPaid && row.credit_type === 'relationship_report') acc.paidRelationshipReportsLeft += remaining;
      if (isPaid && row.credit_type === 'bestie_message') acc.paidBestieChatsLeft += remaining;
      if (isFree && row.credit_type === 'relationship_report') acc.freeReportsLeft += remaining;
      // Know Yourself has its own type so the welcome grant can cover both it
      // and a report without either eating the other's credit.
      if (row.credit_type === 'personality_card') acc.personalityCardsLeft += remaining;
      return acc;
    },
    { relationshipReportsLeft: 0, bestieChatsLeft: 0, personalityCardsLeft: 0, paidRelationshipReportsLeft: 0, paidBestieChatsLeft: 0, freeReportsLeft: 0, hasPaidPack: false, hasClaimedFreeReport: false },
  );

  return { ...balances, loading: false, available: true };
}

// Relationship analyses now run exclusively through the paid OpenAI edge
// function (the free client-side tier was removed). Entitlements are simply
// the paid credit balances.
export async function fetchUsageEntitlements() {
  return fetchCreditBalances();
}

// `claimPayAsYouGoPack` used to live here, wrapping the `claim_test_credit_pack`
// RPC. It was left behind when the free tier was removed and nothing called it.
//
// Deleting it does NOT close the underlying surface: that RPC still exists in
// the database and is granted to `authenticated`, so it is reachable from the
// browser console whether or not this file references it. Credit granting has
// to be secured in the function itself, not by removing its client wrapper.
