import { isSupabaseConfigured, supabase } from './supabaseClient.js';

export async function generateRelationshipReportViaSupabase(payload) {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.functions.invoke('generate-relationship-report', {
    body: payload,
  });
  if (error) {
    const message = error.context?.error || error.message || 'Relationship intelligence could not be generated.';
    if (/credit|allowance|subscription|payment/i.test(message)) {
      throw new Error('No credits available. Please upgrade or check your plan.');
    }
    return null;
  }
  return data || null;
}

export async function askBestieViaSupabase(payload) {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.functions.invoke('ai-bestie-chat', {
    body: payload,
  });
  if (error) {
    const message = error.context?.error || error.message || 'Bestie could not reply right now.';
    if (/credit|allowance|subscription|payment/i.test(message)) {
      throw new Error('No credits available. Please upgrade or check your plan.');
    }
    return null;
  }
  return data || null;
}
