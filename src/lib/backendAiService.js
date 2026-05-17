import { isSupabaseConfigured, supabase } from './supabaseClient.js';

async function normalizeFunctionError(error, fallbackMessage) {
  let details = null;
  try {
    if (error?.context && typeof error.context.json === 'function') {
      details = await error.context.clone().json();
    }
  } catch {
    details = null;
  }
  const message = details?.error || error?.message || fallbackMessage;
  const normalized = new Error(message);
  normalized.code = details?.code || (/credit|top up|upgrade|payment/i.test(message) ? 'OUT_OF_CREDITS' : 'FUNCTION_ERROR');
  normalized.creditType = details?.creditType || '';
  normalized.status = error?.context?.status || details?.status || 0;
  return normalized;
}

export async function generateRelationshipReportViaSupabase(payload) {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.functions.invoke('generate-relationship-report', {
    body: payload,
  });
  if (error) {
    const normalized = await normalizeFunctionError(error, 'Relationship intelligence could not be generated.');
    throw normalized;
  }
  return data || null;
}

export async function askBestieViaSupabase(payload) {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.functions.invoke('ai-bestie-chat', {
    body: payload,
  });
  if (error) {
    const normalized = await normalizeFunctionError(error, 'Bestie could not reply right now.');
    throw normalized;
  }
  return data || null;
}

export async function generatePersonalityCardViaSupabase(payload) {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.functions.invoke('generate-personality-card', {
    body: payload,
  });
  if (error) {
    const normalized = await normalizeFunctionError(error, 'Personality Card could not be generated.');
    throw normalized;
  }
  return data || null;
}
