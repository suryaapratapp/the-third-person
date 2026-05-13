import { getReports, saveAnalysisReport } from './reportsStore.js';
import { isSupabaseConfigured, supabase } from './supabaseClient.js';

function cleanChainId(value) {
  return String(value || 'relationship')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildReportRecord({ analysis, preparedConversation, userId }) {
  const recap = analysis?.conversationRecap || {};
  const meta = preparedConversation?.metadata || {};
  const personName = recap.personName || meta.personName || 'Unknown person';
  const relationshipType = recap.relationshipType || meta.relationshipType || 'Relationship';
  const platform = recap.platform || meta.platform || 'Unknown';
  const chainId = cleanChainId(`${personName}-${relationshipType}-${platform}`);
  const participants = preparedConversation?.participants || preparedConversation?.participantNames || analysis?.participants?.detectedParticipants || [];
  return {
    user_id: userId,
    chain_id: chainId,
    person_name: personName,
    relationship_type: relationshipType,
    platform,
    date_range: preparedConversation?.estimatedDateRange || 'Date range unavailable',
    participants,
    message_count: preparedConversation?.messageCount || 0,
    main_dynamic: recap.mainDynamic || analysis?.summary?.currentDynamic || 'Relationship pattern available',
    emotional_trend: recap.emotionalTrend || 'Mixed',
    compatibility_score: recap.compatibilityScore || analysis?.scores?.compatibility || 0,
    summary: analysis?.summary || {},
    analysis_json: analysis || {},
    prepared_conversation: preparedConversation || {},
  };
}

export function rowToReport(row) {
  return {
    analysisId: row.id,
    personName: row.person_name,
    relationshipType: row.relationship_type,
    platform: row.platform,
    dateAnalysed: row.created_at,
    dateRange: row.date_range,
    mainDynamic: row.main_dynamic,
    compatibilityScore: row.compatibility_score,
    emotionalTrend: row.emotional_trend,
    participants: row.participants || [],
    messageCount: row.message_count || 0,
    analysisJson: row.analysis_json || {},
    preparedConversation: row.prepared_conversation || {},
    chainId: row.chain_id,
  };
}

export async function fetchRelationshipReports() {
  if (!isSupabaseConfigured || !supabase) return getReports();
  const { data, error } = await supabase
    .from('relationship_reports')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('Could not load remote relationship reports.');
    return getReports();
  }
  return (data || []).map(rowToReport);
}

export async function saveRelationshipReportToSupabase({ analysis, preparedConversation }) {
  if (!isSupabaseConfigured || !supabase) return saveAnalysisReport({ analysis, preparedConversation });
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return saveAnalysisReport({ analysis, preparedConversation });
  const record = buildReportRecord({ analysis, preparedConversation, userId });
  const { data, error } = await supabase
    .from('relationship_reports')
    .insert(record)
    .select('*')
    .single();
  if (error) {
    console.warn('Could not save remote relationship report.');
    return saveAnalysisReport({ analysis, preparedConversation });
  }
  return rowToReport(data);
}

export async function fetchRemoteProfile() {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.from('profiles').select('*').maybeSingle();
  if (error) return null;
  return data;
}

export async function upsertRemoteProfile(profile) {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const payload = {
    id: user.id,
    email: profile.email || user.email,
    first_name: profile.firstName || null,
    last_name: profile.lastName || null,
    gender_identity: profile.genderIdentity || 'Prefer not to say',
    date_of_birth: profile.dateOfBirth || null,
    zodiac_sign: profile.zodiacSign || null,
    preferred_language_tone: profile.preferredLanguageTone || null,
    avatar_url: profile.profileImage || null,
  };
  const { data, error } = await supabase.from('profiles').upsert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export function remoteProfileToLocal(row) {
  if (!row) return null;
  return {
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    email: row.email || '',
    genderIdentity: row.gender_identity || 'Prefer not to say',
    dateOfBirth: row.date_of_birth || '',
    preferredLanguageTone: row.preferred_language_tone || 'Warm Hinglish / English',
    profileImage: row.avatar_url || '',
  };
}
