import { isSupabaseConfigured, supabase } from './supabaseClient.js';

export const EMPTY_CREDIT_BALANCE = {
  relationshipReportsLeft: 0,
  bestieChatsLeft: 0,
  paidRelationshipReportsLeft: 0,
  paidBestieChatsLeft: 0,
  hasPaidPack: false,
  freeAnalysesUsed: 0,
  freeAnalysesRemaining: 0,
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
      const isPaid = row.source && row.source !== 'free';
      if (isPaid) acc.hasPaidPack = true;
      if (row.credit_type === 'relationship_report') acc.relationshipReportsLeft += remaining;
      if (row.credit_type === 'bestie_message') acc.bestieChatsLeft += remaining;
      if (isPaid && row.credit_type === 'relationship_report') acc.paidRelationshipReportsLeft += remaining;
      if (isPaid && row.credit_type === 'bestie_message') acc.paidBestieChatsLeft += remaining;
      return acc;
    },
    { relationshipReportsLeft: 0, bestieChatsLeft: 0, paidRelationshipReportsLeft: 0, paidBestieChatsLeft: 0, hasPaidPack: false },
  );

  return { ...balances, loading: false, available: true };
}

export async function fetchUsageEntitlements() {
  const balances = await fetchCreditBalances();
  if (!isSupabaseConfigured || !supabase) {
    return { ...balances, freeAnalysesUsed: 0, freeAnalysesRemaining: 0 };
  }

  const { data, error } = await supabase
    .from('relationship_reports')
    .select('id, analysis_json');

  if (error) {
    return { ...balances, freeAnalysesUsed: 0, freeAnalysesRemaining: 0 };
  }

  const freeAnalysesUsed = (data || []).filter((row) => {
    const mode = row.analysis_json?.providerMode || row.analysis_json?.generationTier;
    return mode === 'free' || mode === 'free_relationship_analysis';
  }).length;

  return {
    ...balances,
    freeAnalysesUsed,
    freeAnalysesRemaining: Math.max(2 - freeAnalysesUsed, 0),
  };
}

export async function claimPayAsYouGoPack(packId) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Please configure Supabase before adding credits.');
  }
  const { data, error } = await supabase.rpc('claim_test_credit_pack', {
    p_pack_id: packId,
  });
  if (error) {
    throw new Error(error.message || 'We could not add this pack right now.');
  }
  return data;
}
