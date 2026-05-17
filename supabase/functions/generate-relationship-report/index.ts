import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { buildRelationshipAnalysisPrompt, messagesForChatCompletions } from '../_shared/promptBuilder.ts';
import { consumeCredit, createAdminClient, getAuthenticatedUser, getCreditBalance, logBlockedCredit } from '../_shared/usage.ts';

function chainIdFor(personName = 'relationship', relationshipType = 'relationship', platform = 'chat') {
  return `${personName}-${relationshipType}-${platform}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseJsonText(text: string) {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
}

function supportsCustomTemperature(model: string) {
  return !model.startsWith('gpt-5');
}

async function callOpenAiJson({
  apiKey,
  model,
  messages,
  temperature = 0.55,
}: {
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
}) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: 'json_object' },
      ...(supportsCustomTemperature(model) ? { temperature } : {}),
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`OPENAI_REPORT_HTTP_${response.status}:${detail.slice(0, 160)}`);
  }
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('OPENAI_REPORT_EMPTY_RESPONSE');
  return parseJsonText(text);
}

function chunkSummarySchema() {
  return {
    period: '',
    messageCount: 0,
    relationshipSignals: [],
    personalitySignalsForMainUser: [],
    redFlags: [],
    greenFlags: [],
    turningPoints: [],
    importantMoments: [],
    bestieContext: [],
    usefulQuotes: [],
    languageStyle: '',
  };
}

function chunkMessagesForAi(chunk: Record<string, any>) {
  return (chunk.representativeMessages || []).map((message: Record<string, any>) => ({
    date: message.date,
    period: message.period,
    sender: message.sender,
    dayPeriod: message.dayPeriod,
    languageGuess: message.languageGuess,
    emotionalTags: message.emotionalTags,
    message: String(message.message || '').slice(0, 420),
  }));
}

async function summarizeChunk({
  apiKey,
  model,
  system,
  chunk,
  body,
  prepared,
}: {
  apiKey: string;
  model: string;
  system: string;
  chunk: Record<string, any>;
  body: Record<string, any>;
  prepared: Record<string, any>;
}) {
  const userContent = JSON.stringify({
    task: 'Summarise this chronological conversation period for later final relationship synthesis. Do not produce the final report yet.',
    relationshipType: prepared.metadata?.relationshipType || body.runtimeContext?.selectedRelationshipType,
    otherPersonName: prepared.metadata?.personName || body.runtimeContext?.selectedPersonName,
    participants: prepared.participants || prepared.participantNames || [],
    mainUserProfile: body.userProfile || body.runtimeContext?.mainUserProfileDetails || {},
    chunk: {
      id: chunk.id,
      period: chunk.period,
      messageCount: chunk.messageCount,
      participants: chunk.participants,
      emotionalTags: chunk.emotionalTags,
      firstMessages: chunk.firstMessages,
      lastMessages: chunk.lastMessages,
      representativeMessages: chunkMessagesForAi(chunk),
    },
    instruction: 'Extract relationship signals, main-user personality signals, gentle red and green flags, turning points, important moments, useful quotes, and Bestie context. Keep it concise. If evidence is weak, say not enough evidence yet.',
    outputSchema: chunkSummarySchema(),
  });
  return callOpenAiJson({
    apiKey,
    model,
    temperature: 0.35,
    messages: [
      { role: 'system', content: `${system}\n\nReturn valid JSON only. Never claim certainty. Do not log or reveal private implementation details.` },
      { role: 'user', content: userContent },
    ],
  });
}

async function summarizeChunksForLongChat({
  apiKey,
  model,
  system,
  body,
  prepared,
}: {
  apiKey: string;
  model: string;
  system: string;
  body: Record<string, any>;
  prepared: Record<string, any>;
}) {
  const chunks = prepared.analysisPipeline?.chunks || [];
  const summaries = [];
  for (const chunk of chunks) {
    if (!chunk?.messageCount) continue;
    summaries.push(await summarizeChunk({ apiKey, model, system, chunk, body, prepared }));
  }
  return summaries;
}

function compactReportForExistingUi(ai: Record<string, any>, draft: Record<string, any>) {
  if (!ai.relationshipReport) return ai;
  const report = ai.relationshipReport || {};
  const card = ai.personalityCardUpdate || {};
  const signals = ai.mainUserPersonalitySignals || {};
  const reportScores = report.scores || {};
  const reportAdvice = report.advice || {};
  return {
    ...draft,
    ...ai,
    summary: {
      ...(draft.summary || {}),
      relationshipOverview: report.summary || draft.summary?.relationshipOverview,
      currentDynamic: report.overallDynamic || report.bestieBreakdown || report.summary || draft.summary?.currentDynamic,
      mainEmotionalPattern: report.emotionalTone || signals.emotionalPattern || draft.summary?.mainEmotionalPattern,
      importantCaveat: 'This is reflective insight based on the provided conversation, not proof or final judgment.',
    },
    scores: { ...(draft.scores || {}), ...reportScores },
    advice: { ...(draft.advice || {}), ...reportAdvice },
    redFlags: report.redFlags || draft.redFlags || [],
    greenFlags: report.greenFlags || draft.greenFlags || [],
    improvedRedFlags: report.redFlags || draft.improvedRedFlags || [],
    improvedGreenFlags: report.greenFlags || draft.improvedGreenFlags || [],
    timeline: report.timeline || report.timelineSummary || draft.timeline || [],
    screenshotWorthySummary: report.screenshotWorthySummary || ai.screenshotWorthySummary || draft.screenshotWorthySummary,
    communicationPatterns: {
      ...(draft.communicationPatterns || {}),
      relationshipPattern: report.communicationPattern || draft.communicationPatterns?.relationshipPattern,
    },
    relationshipSpecificInsights: report.relationshipSpecificCards || draft.relationshipSpecificInsights || [],
    bestieBreakdown: typeof report.bestieBreakdown === 'string'
      ? { whatItLooksLike: report.bestieBreakdown, whatItMayMean: report.summary, whatNotToIgnore: report.keyPatterns?.[0] || '', whatToDoNext: 'Ask for one clear, kind next step.' }
      : (draft.bestieBreakdown || {}),
    personalitySnapshot: {
      ...(draft.personalitySnapshot || {}),
      communicationStyle: signals.communicationStyle,
      emotionalPattern: signals.emotionalPattern,
      strengths: card.greenFlags || signals.strongSignals || [],
      growthAreas: card.growthAreas || [],
      recurringWords: signals.topWords || [],
      confidenceNotes: card.confidenceNotes || [],
      needsMoreChatsFor: card.needsMoreChatsFor || signals.notEnoughEvidence || [],
    },
    personalityCardViral: {
      ...(draft.personalityCardViral || {}),
      emotionalSignature: card.emotionalSignature,
      conversationMagnet: card.conversationMagnet,
      greenFlags: card.greenFlags || [],
      redFlags: card.redFlags || [],
      viralOneLiner: card.headline,
    },
    personality: {
      ...(draft.personality || {}),
      user: {
        ...(draft.personality?.user || {}),
        type: card.personalityTypeSignal || draft.personality?.user?.type,
        name: card.headline || draft.personality?.user?.name,
        profile: card.emotionalSignature || signals.communicationStyle || draft.personality?.user?.profile,
        strengths: card.greenFlags || [],
        weaknesses: card.growthAreas || [],
      },
    },
    conversationRecap: {
      ...(draft.conversationRecap || {}),
      mainDynamic: report.overallDynamic || report.summary || draft.conversationRecap?.mainDynamic,
      emotionalTrend: report.emotionalTone || draft.conversationRecap?.emotionalTrend,
      compatibilityScore: reportScores.compatibility || draft.conversationRecap?.compatibilityScore,
    },
  };
}

async function openAiAnalysis(body: Record<string, any>) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY_MISSING');
  const model = Deno.env.get('OPENAI_REPORT_MODEL') || 'gpt-5-nano';
  const prepared = body.preparedConversation || {};
  const system = Deno.env.get('THIRDPERSON_REPORT_SYSTEM_PROMPT')
    || 'Return a safe, reflective relationship analysis as valid JSON. Use careful wording and do not claim certainty.';
  const requiredOutputSchema = {
      relationshipReport: {
        summary: '',
        overallDynamic: '',
        emotionalTone: '',
        effortBalance: '',
        communicationPattern: '',
        redFlags: [],
        greenFlags: [],
        timeline: [],
        scores: {},
        advice: {},
        screenshotWorthySummary: '',
      },
      mainUserPersonalitySignals: {
        communicationStyle: '',
        emotionalPattern: '',
        reactionStyle: '',
        careStyle: '',
        conflictStyle: '',
        humourStyle: '',
        topWords: [],
        likesVisible: [],
        dislikesVisible: [],
        hobbiesVisible: [],
        strongSignals: [],
        weakSignals: [],
        notEnoughEvidence: [],
      },
      personalityCardUpdate: {
        headline: '',
        personalityTypeSignal: '',
        coreTraits: [],
        greenFlags: [],
        redFlags: [],
        emotionalSignature: '',
        conversationMagnet: '',
        growthAreas: [],
        confidenceNotes: [],
        needsMoreChatsFor: [],
      },
      bestieContextSummary: {
        shortSummary: '',
        whatBestieShouldKnow: [],
        repeatedPatterns: [],
        relationshipWarnings: [],
        usefulQuotes: [],
      },
      reportSummaryForFutureUse: {
        compressedSummary: '',
        relationshipTrend: '',
        importantMoments: [],
        personalityDelta: [],
        languageStyle: '',
      },
      detectedLanguageStyle: {
        dominantLanguage: '',
        languagesUsed: [],
        recommendedOutputStyle: '',
        toneNotes: '',
      },
      confidenceNotes: [],
      needsMoreChatsFor: [],
    };
  const pipeline = prepared.analysisPipeline || {};
  const route = pipeline.route || 'single_compressed';
  const chunkSummaries = route === 'single_compressed'
    ? []
    : await summarizeChunksForLongChat({ apiKey, model, system, body, prepared });
  const protectedConversationText = route === 'single_compressed'
    ? (prepared.cleanedText || prepared.compressedConversation || '')
    : '';
  const parsedConversationForPrompt = {
    ...prepared,
    analysisPipeline: {
      ...pipeline,
      chunks: route === 'single_compressed' ? pipeline.chunks || [] : [],
      chunkSummaries,
      retrievalReadyMemory: {
        ...(pipeline.retrievalReadyMemory || {}),
        chunkSummaries,
      },
    },
    chunkSummaries,
    longChatMode: route !== 'single_compressed',
    sensitiveDataProtectionSummary: body.sensitiveData?.protectionSummary,
  };
  const promptBundle = buildRelationshipAnalysisPrompt({
    basePromptTemplate: system,
    relationshipType: prepared.metadata?.relationshipType || body.runtimeContext?.selectedRelationshipType,
    otherPersonName: prepared.metadata?.personName || body.runtimeContext?.selectedPersonName,
    mainUserProfile: body.userProfile || body.runtimeContext?.mainUserProfileDetails || {},
    parsedConversation: parsedConversationForPrompt,
    protectedConversationText,
    languageProfile: prepared.languageProfile || body.runtimeContext?.languageProfile || {
      dominantLanguage: prepared.dominantLanguage,
      languagesUsed: prepared.detectedLanguages,
      recommendedOutputStyle: prepared.languageStyle || body.runtimeContext?.detectedLanguageStyle,
    },
    previousPersonalityCard: body.previousPersonalityMemory?.personality_json || body.runtimeContext?.previousPersonalityCardSummary,
    outputSchema: {
      existingUiDraftShape: body.analysisDraft,
      combinedGenerationSchema: requiredOutputSchema,
    },
  });
  const analysis = await callOpenAiJson({
    apiKey,
    model,
    messages: messagesForChatCompletions(promptBundle),
    temperature: 0.55,
  });
  return {
    ...analysis,
    analysisPipeline: {
      route,
      estimatedTokens: pipeline.estimatedTokens,
      chunkCount: pipeline.chunks?.length || 0,
      chunkSummaryCount: chunkSummaries.length,
      retrievalReadyMemory: {
        chunkSummaries,
        importantMoments: prepared.importantMoments || [],
        turningPoints: chunkSummaries.flatMap((summary: Record<string, any>) => summary.turningPoints || []).slice(0, 24),
        redGreenFlagEvidence: chunkSummaries.flatMap((summary: Record<string, any>) => [
          ...(summary.redFlags || []),
          ...(summary.greenFlags || []),
        ]).slice(0, 32),
        personalitySignals: chunkSummaries.flatMap((summary: Record<string, any>) => summary.personalitySignalsForMainUser || []).slice(0, 32),
      },
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: 'Please sign in to continue.' }, 401);

    const admin = createAdminClient();
    const availableReports = await getCreditBalance(admin, user.id, 'relationship_report');
    if (availableReports <= 0) {
      await logBlockedCredit(admin, user.id, 'relationship_report');
      return jsonResponse({
        code: 'OUT_OF_CREDITS',
        creditType: 'relationship_report',
        error: 'You’re out of Relationship Reports. Top up to generate more relationship intelligence summaries.',
      }, 402);
    }

    const body = await req.json();
    const prepared = body.preparedConversation || {};
    let analysis: Record<string, any>;
    try {
      analysis = {
        ...compactReportForExistingUi(await openAiAnalysis(body), body.analysisDraft || {}),
        providerMode: 'paid',
        generationTier: 'paid_relationship_intelligence',
      };
    } catch (openAiError) {
      await admin.from('ai_usage_logs').insert({
        user_id: user.id,
        action: 'generate_relationship_report',
        provider: 'openai',
        status: 'error',
        metadata: {
          stage: 'openai_report_generation',
          reason: openAiError instanceof Error ? openAiError.message.slice(0, 220) : 'unknown',
          relationshipType: prepared.metadata?.relationshipType || body.runtimeContext?.selectedRelationshipType,
          messageCount: prepared.messageCount || 0,
          participantsCount: (prepared.participants || prepared.participantNames || []).length,
          detectedLanguages: prepared.detectedLanguages || prepared.languageProfile?.languagesUsed || [],
        },
      });
      return jsonResponse({
        code: 'AI_PROVIDER_UNAVAILABLE',
        error: 'Paid relationship intelligence could not connect to the AI provider. No credit was used. Please check server configuration and try again.',
      }, 503);
    }
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
      bestie_context_summary: analysis.bestieContextSummary || {},
      report_summary_for_future_use: analysis.reportSummaryForFutureUse || {},
      main_user_personality_signals: analysis.mainUserPersonalitySignals || {},
    };

    const { data: report, error: reportError } = await admin
      .from('relationship_reports')
      .insert(reportRecord)
      .select('*')
      .single();
    if (reportError) throw reportError;

    let credit;
    try {
      credit = await consumeCredit(admin, user.id, 'relationship_report');
    } catch (creditError) {
      await admin.from('relationship_reports').delete().eq('id', report.id);
      throw creditError;
    }
    if (!credit.allowed) {
      await admin.from('relationship_reports').delete().eq('id', report.id);
      return jsonResponse({
        code: 'OUT_OF_CREDITS',
        creditType: 'relationship_report',
        error: 'You’re out of Relationship Reports. Top up to generate more relationship intelligence summaries.',
      }, 402);
    }

    if (analysis.personalityCardUpdate || analysis.mainUserPersonalitySignals) {
      await admin.from('user_personality').upsert({
        user_id: user.id,
        personality_json: analysis.personalityCardUpdate || {},
        emotional_life_story: analysis.personalityCardUpdate?.emotionalLifeStory || {},
        recurring_words: analysis.mainUserPersonalitySignals?.topWords || [],
        generated_from_report_ids: [report.id],
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    }

    await admin.from('ai_usage_logs').insert({
      user_id: user.id,
      action: 'generate_relationship_report',
      provider: 'openai',
      status: 'success',
      metadata: {
        reportId: report.id,
        remainingCredits: credit.remaining,
        promptTemplateVersion: 'relationship_analysis_v1',
        relationshipType,
        messageCount: prepared.messageCount || 0,
        analysisRoute: prepared.analysisPipeline?.route || 'single_compressed',
        estimatedTokens: prepared.analysisPipeline?.estimatedTokens || 0,
        chunkCount: prepared.analysisPipeline?.chunks?.length || 0,
        participantsCount: (prepared.participants || prepared.participantNames || []).length,
        detectedLanguages: prepared.detectedLanguages || prepared.languageProfile?.languagesUsed || [],
      },
    });

    return jsonResponse({ analysis, report, remainingCredits: credit.remaining });
  } catch (_error) {
    return jsonResponse({ error: 'We could not generate this report right now. Please try again.' }, 500);
  }
});
