import {
  buildRelationshipPersonalityCard,
  getReports,
  getRelationshipPersonalityCards,
  saveAnalysisReport,
  saveRelationshipPersonalityCardLocal,
} from './reportsStore.js';
import { isSupabaseConfigured, supabase } from './supabaseClient.js';

const UNDERSTAND_YOURSELF_KEY = 'thirdperson_understand_yourself_profile_v1';

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
    main_dynamic: recap.mainDynamic || analysis?.relationshipReport?.overallDynamic || analysis?.summary?.currentDynamic || 'Relationship pattern available',
    emotional_trend: recap.emotionalTrend || analysis?.relationshipReport?.emotionalTone || 'Mixed',
    compatibility_score: recap.compatibilityScore || analysis?.relationshipReport?.scores?.compatibility || analysis?.scores?.compatibility || 0,
    summary: analysis?.summary || { relationshipOverview: analysis?.relationshipReport?.summaryParagraph },
    analysis_json: analysis || {},
    prepared_conversation: preparedConversation || {},
    bestie_context_summary: analysis?.bestieContextSummary || {},
    report_summary_for_future_use: analysis?.reportSummaryForFutureUse || {},
    main_user_personality_signals: analysis?.mainUserPersonalitySignals || {},
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
    bestieContextSummary: row.bestie_context_summary || row.analysis_json?.bestieContextSummary || {},
    reportSummaryForFutureUse: row.report_summary_for_future_use || row.analysis_json?.reportSummaryForFutureUse || {},
    mainUserPersonalitySignals: row.main_user_personality_signals || row.analysis_json?.mainUserPersonalitySignals || {},
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

export async function fetchRelationshipReportById(reportId) {
  if (!reportId) return null;
  if (!isSupabaseConfigured || !supabase) {
    return getReports().find((report) => report.analysisId === reportId) || null;
  }
  const { data, error } = await supabase
    .from('relationship_reports')
    .select('*')
    .eq('id', reportId)
    .maybeSingle();
  if (error || !data) return null;
  return rowToReport(data);
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
  const report = rowToReport(data);
  await saveRelationshipPersonalityCardToSupabase({
    analysis,
    report,
    preparedConversation,
    userId,
  });
  return report;
}

function relationshipCardToDbRecord({ card, userId }) {
  return {
    user_id: userId,
    relationship_type: card.relationshipType || 'Relationship',
    other_person_name: card.otherPersonName || null,
    report_id: card.reportId || null,
    title: card.title || null,
    short_summary: card.shortSummary || card.summaryParagraph || null,
    personality_label: card.personalityLabel || null,
    personality_type_signal: card.personalityTypeSignal || null,
    green_flags_summary: card.greenFlagsSummary || null,
    red_flags_summary: card.redFlagsSummary || null,
    communication_style_summary: card.communicationStyleSummary || null,
    emotional_signature_summary: card.emotionalSignatureSummary || null,
    attraction_energy_summary: card.attractionEnergySummary || null,
    growth_areas_summary: card.growthAreasSummary || null,
    keywords: Array.isArray(card.keywords) ? card.keywords.slice(0, 16) : [],
    confidence_level: card.confidenceLevel || 'Early Signal',
    updated_at: new Date().toISOString(),
  };
}

export function rowToRelationshipPersonalityCard(row) {
  return {
    id: row.id,
    userId: row.user_id,
    relationshipType: row.relationship_type,
    otherPersonName: row.other_person_name || '',
    reportId: row.report_id,
    title: row.title || 'Relationship Personality Card',
    shortSummary: row.short_summary || 'Not enough evidence yet.',
    summaryParagraph: row.short_summary || 'Not enough evidence yet.',
    personalityLabel: row.personality_label || 'Early personality signal',
    personalityTypeSignal: row.personality_type_signal || 'Personality signal still forming',
    greenFlagsSummary: row.green_flags_summary || 'Not enough evidence yet.',
    redFlagsSummary: row.red_flags_summary || 'Not enough evidence yet.',
    communicationStyleSummary: row.communication_style_summary || 'Not enough evidence yet.',
    emotionalSignatureSummary: row.emotional_signature_summary || 'Not enough evidence yet.',
    attractionEnergySummary: row.attraction_energy_summary || 'Not enough evidence yet.',
    growthAreasSummary: row.growth_areas_summary || 'Not enough evidence yet.',
    keywords: row.keywords || [],
    confidenceLevel: row.confidence_level || 'Early Signal',
    personalityScores: row.personality_scores || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function saveRelationshipPersonalityCardToSupabase({ analysis, report, preparedConversation, userId: providedUserId }) {
  if (!analysis || !report) return null;
  const localCard = saveRelationshipPersonalityCardLocal({ analysis, report, preparedConversation });
  if (!isSupabaseConfigured || !supabase) return localCard;
  const userId = providedUserId || (await supabase.auth.getUser()).data.user?.id;
  if (!userId) return localCard;
  const card = buildRelationshipPersonalityCard({ analysis, report, preparedConversation });
  const record = relationshipCardToDbRecord({ card, userId });
  const { data, error } = await supabase
    .from('relationship_personality_cards')
    .upsert(record, { onConflict: 'user_id,report_id' })
    .select('*')
    .single();
  if (error) return localCard;
  return rowToRelationshipPersonalityCard(data);
}

export async function fetchRelationshipPersonalityCards() {
  if (!isSupabaseConfigured || !supabase) return getRelationshipPersonalityCards();
  const { data, error } = await supabase
    .from('relationship_personality_cards')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return getRelationshipPersonalityCards();
  return (data || []).map(rowToRelationshipPersonalityCard);
}

function readLocalUnderstandYourselfProfile() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(window.localStorage.getItem(UNDERSTAND_YOURSELF_KEY) || 'null');
  } catch {
    return null;
  }
}

export function saveLocalUnderstandYourselfProfile(profile) {
  if (typeof window === 'undefined' || !profile) return null;
  const value = {
    id: profile.id || `understand-${Date.now()}`,
    sourcePersonalityCardIds: profile.sourcePersonalityCardIds || [],
    overallProfileJson: profile.overallProfileJson || profile.understandYourself || profile,
    createdAt: profile.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(UNDERSTAND_YOURSELF_KEY, JSON.stringify(value));
  return value;
}

export function rowToUnderstandYourselfProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    sourcePersonalityCardIds: row.source_personality_card_ids || [],
    overallProfileJson: row.overall_profile_json || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchUnderstandYourselfProfile() {
  if (!isSupabaseConfigured || !supabase) return readLocalUnderstandYourselfProfile();
  const { data, error } = await supabase
    .from('understand_yourself_profiles')
    .select('*')
    .maybeSingle();
  if (error) return readLocalUnderstandYourselfProfile();
  return rowToUnderstandYourselfProfile(data) || readLocalUnderstandYourselfProfile();
}

export async function upsertPersonalityMemoryFromAnalysis({ analysis, reportId }) {
  if (!isSupabaseConfigured || !supabase || !analysis) return null;
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;
  const personality = analysis.personalityCardUpdate || analysis.relationshipPersonalityCard || analysis.personalitySnapshot || null;
  if (!personality && !analysis.mainUserPersonalitySignals) return null;
  const { data, error } = await supabase
    .from('user_personality')
    .upsert({
      user_id: userId,
      personality_json: personality || {},
      emotional_life_story: analysis.personalityCardUpdate?.emotionalLifeStory || analysis.relationshipPersonalityCard?.emotionalLifeStory || {},
      recurring_words: analysis.mainUserPersonalitySignals?.topWords || analysis.personalitySnapshot?.recurringWords || [],
      generated_from_report_ids: reportId ? [reportId] : [],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) return null;
  return data;
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
    phone_number: profile.phoneNumber || null,
    first_name: profile.firstName || null,
    last_name: profile.lastName || null,
    gender_identity: profile.genderIdentity || 'Prefer not to say',
    date_of_birth: profile.dateOfBirth || null,
    zodiac_sign: profile.zodiacSign || null,
    preferred_language_tone: profile.preferredLanguageTone || null,
    preferred_analysis_languages: Array.isArray(profile.preferredAnalysisLanguages) ? profile.preferredAnalysisLanguages : [],
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
    phoneNumber: row.phone_number || '',
    genderIdentity: row.gender_identity || 'Prefer not to say',
    dateOfBirth: row.date_of_birth || '',
    preferredLanguageTone: row.preferred_language_tone || 'Warm Hinglish / English',
    preferredAnalysisLanguages: row.preferred_analysis_languages || [],
    profileImage: row.avatar_url || '',
  };
}

export async function fetchRemotePersonality() {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase
    .from('user_personality')
    .select('*')
    .maybeSingle();
  if (error) return null;
  return data;
}
