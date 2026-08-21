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

// The prepared conversation carries two large fields the backend never reads:
// parsedMessages (the backend uses firstMessages/lastMessages/chunks instead)
// and, for chunked routes, cleanedText (only sent as raw text for short chats).
// On a 2-year export these were 1.5MB of a 2.2MB request — slow to upload, and
// they were also persisted into relationship_reports.prepared_conversation.
function trimPreparedForBackend(prepared) {
  if (!prepared || typeof prepared !== 'object') return prepared;
  const isShortChat = (prepared.analysisPipeline?.route || 'single_compressed') === 'single_compressed';
  const { parsedMessages: _parsedMessages, cleanedText, ...rest } = prepared;
  return isShortChat ? { ...rest, cleanedText } : rest;
}

export async function generateRelationshipReportViaSupabase(payload) {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.functions.invoke('generate-relationship-report', {
    body: payload?.preparedConversation
      ? { ...payload, preparedConversation: trimPreparedForBackend(payload.preparedConversation) }
      : payload,
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
    const normalized = await normalizeFunctionError(error, 'Your AI Relationship Coach could not reply right now.');
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

// Kicks off the report image, and reads its state.
//
// Separate from report generation on purpose: an image takes 10-40s on top of
// a report that already runs close to the 150s edge ceiling, and a picture is
// never worth risking the report it illustrates. The report is shown the
// moment it exists; this fills in behind it.
export async function requestReportImage({ reportId, imageContext }) {
  if (!isSupabaseConfigured || !supabase) return { status: 'failed' };
  const { data, error } = await supabase.functions.invoke('generate-relationship-image', {
    body: { reportId, imageContext },
  });
  if (error) {
    // A non-2xx makes supabase-js throw a FunctionsHttpError whose body holds
    // the server's actual message — and discarding it, as this used to, turned
    // every distinct failure into one useless "could not be generated". The
    // body is the only place the real reason exists on the client.
    let detail = error.message || '';
    try {
      const parsed = await error.context?.json?.();
      if (parsed?.error) detail = parsed.error;
      else if (parsed?.message) detail = parsed.message;
    } catch {
      /* not JSON — the message above is the best available */
    }
    return { status: 'failed', error: detail };
  }
  return data || { status: 'failed' };
}

export async function fetchReportImageState(reportId) {
  if (!isSupabaseConfigured || !supabase || !reportId) return null;
  const { data, error } = await supabase
    .from('relationship_reports')
    .select('image_url, image_status')
    .eq('id', reportId)
    .maybeSingle();
  if (error || !data) return null;
  return { imageUrl: data.image_url, imageStatus: data.image_status };
}
