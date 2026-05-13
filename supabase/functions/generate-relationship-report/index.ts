import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { consumeCredit, createAdminClient, getAuthenticatedUser } from '../_shared/usage.ts';

function chainIdFor(personName = 'relationship', relationshipType = 'relationship', platform = 'chat') {
  return `${personName}-${relationshipType}-${platform}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function fallbackAnalysis(body: Record<string, any>) {
  const draft = body.analysisDraft || {};
  return {
    ...draft,
    generatedBy: 'thirdperson-edge',
    summary: {
      relationshipOverview: draft.summary?.relationshipOverview || 'The conversation appears to contain enough signals for a careful relationship reading.',
      currentDynamic: draft.summary?.currentDynamic || 'The dynamic may include mixed clarity, emotional effort, and moments worth discussing gently.',
      mainEmotionalPattern: draft.summary?.mainEmotionalPattern || 'Emotional tone appears to shift across the conversation.',
      importantCaveat: draft.summary?.importantCaveat || 'This is reflective insight based on the provided conversation, not proof or final judgment.',
    },
  };
}

function parseJsonText(text: string) {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
}

async function openAiAnalysis(body: Record<string, any>) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return null;
  const prepared = body.preparedConversation || {};
  const system = Deno.env.get('THIRDPERSON_REPORT_SYSTEM_PROMPT')
    || 'Return a safe, reflective relationship analysis as valid JSON. Use careful wording and do not claim certainty.';
  const user = JSON.stringify({
    selectedPlatform: prepared.metadata?.platform,
    relationshipType: prepared.metadata?.relationshipType,
    personName: prepared.metadata?.personName,
    participants: prepared.participants || prepared.participantNames,
    senderStats: prepared.senderStats,
    dateRange: prepared.estimatedDateRange,
    monthlyBreakdown: prepared.monthlyBreakdown,
    dayNightDynamics: prepared.dailyNightBreakdown,
    importantMoments: prepared.importantMoments,
    topWords: prepared.topWords,
    zodiacContext: prepared.metadata?.zodiacCompatibility,
    safeConversationSummary: prepared.compressedConversation,
    expectedShape: body.analysisDraft,
  });
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_REPORT_MODEL') || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.55,
    }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) return null;
  return parseJsonText(text);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: 'Please sign in to continue.' }, 401);

    const admin = createAdminClient();
    const credit = await consumeCredit(admin, user.id, 'relationship_report');
    if (!credit.allowed) {
      return jsonResponse({ error: 'No analysis credits available. Please upgrade or check your plan.' }, 402);
    }

    const body = await req.json();
    const prepared = body.preparedConversation || {};
    const analysis = await openAiAnalysis(body).catch(() => null) || fallbackAnalysis(body);
    const recap = analysis.conversationRecap || {};
    const meta = prepared.metadata || {};
    const personName = recap.personName || meta.personName || 'Unknown person';
    const relationshipType = recap.relationshipType || meta.relationshipType || 'Relationship';
    const platform = recap.platform || meta.platform || 'Unknown';
    const reportRecord = {
      user_id: user.id,
      chain_id: chainIdFor(personName, relationshipType, platform),
      person_name: personName,
      relationship_type: relationshipType,
      platform,
      date_range: prepared.estimatedDateRange || 'Date range unavailable',
      participants: prepared.participants || prepared.participantNames || analysis.participants?.detectedParticipants || [],
      message_count: prepared.messageCount || 0,
      main_dynamic: recap.mainDynamic || analysis.summary?.currentDynamic || 'Relationship pattern available',
      emotional_trend: recap.emotionalTrend || 'Mixed',
      compatibility_score: recap.compatibilityScore || analysis.scores?.compatibility || 0,
      summary: analysis.summary || {},
      analysis_json: analysis,
      prepared_conversation: prepared,
    };

    const { data: report, error: reportError } = await admin
      .from('relationship_reports')
      .insert(reportRecord)
      .select('*')
      .single();
    if (reportError) throw reportError;

    await admin.from('ai_usage_logs').insert({
      user_id: user.id,
      action: 'generate_relationship_report',
      provider: Deno.env.get('OPENAI_API_KEY') ? 'openai' : 'local_fallback',
      status: 'success',
      metadata: { reportId: report.id, remainingCredits: credit.remaining },
    });

    return jsonResponse({ analysis, report, remainingCredits: credit.remaining });
  } catch (_error) {
    return jsonResponse({ error: 'We could not generate this report right now. Please try again.' }, 500);
  }
});
