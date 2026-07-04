import { ensurePuterReady } from './puterAuthService.js';

export const PUTER_FREE_ANALYSIS_MODEL = 'openai/gpt-4o-mini';

const CHAT_TIMEOUT_MS = 45000;

function isDev() {
  return Boolean(import.meta?.env?.DEV);
}

function debug(message, detail = {}) {
  if (!isDev()) return;
  console.debug(`[ThirdPerson free analysis] ${message}`, detail);
}

function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

export function stripMarkdownCodeFences(text = '') {
  return String(text)
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function contentToText(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((item) => {
      if (typeof item === 'string') return item;
      return item?.text || item?.content || item?.value || '';
    }).join('');
  }
  if (typeof content === 'object') {
    return content.text || content.content || content.value || JSON.stringify(content);
  }
  return String(content);
}

export function extractPuterText(response) {
  if (typeof response === 'string') return response;
  if (!response) return '';
  if (typeof response.text === 'string') return response.text;
  if (typeof response.content === 'string') return response.content;
  if (response.message?.content) return contentToText(response.message.content);
  if (response.choices?.[0]?.message?.content) return contentToText(response.choices[0].message.content);
  if (Array.isArray(response)) return response.map(contentToText).join('');
  if (typeof response === 'object') {
    if (response.content) return contentToText(response.content);
    return JSON.stringify(response);
  }
  return String(response);
}

export function parseAnalysisJson(text) {
  const cleaned = stripMarkdownCodeFences(text);
  if (!cleaned) throw new Error('The analysis response was empty.');
  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error('The analysis response was not valid JSON.');
    }
    const maybeJson = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(maybeJson);
    } catch {
      throw new Error(firstError.message || 'The analysis response could not be parsed.');
    }
  }
}

function relationshipGuidance(relationshipType = '') {
  const value = relationshipType.toLowerCase();
  if (/partner|ex|crush|dating|seeing/.test(value)) {
    return 'Focus on affection, effort, consistency, mixed signals, emotional availability, attraction, hesitation, clarity, repair, and commitment signals.';
  }
  if (/friend|best friend/.test(value)) {
    return 'Focus on loyalty, effort balance, emotional support, distance, trust, inside jokes, check-ins, and one-sided energy.';
  }
  if (/mom|dad|brother|sister|cousin|family/.test(value)) {
    return 'Focus on care, expectations, respect, pressure, guilt patterns, boundaries, responsibility, and repair.';
  }
  if (/colleague|manager|client/.test(value)) {
    return 'Focus on tone, professionalism, respect, clarity, pressure, collaboration, trust, response balance, and boundaries.';
  }
  return 'Focus on emotional clarity, effort balance, communication style, trust, repair, and boundaries.';
}

function safeUserProfile(profile = {}) {
  return {
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    genderIdentity: profile.genderIdentity || '',
    preferredLanguageTone: profile.preferredLanguageTone || '',
    preferredAnalysisLanguages: profile.preferredAnalysisLanguages || [],
    zodiacSign: profile.zodiacSign || '',
    zodiacElement: profile.zodiacElement || '',
  };
}

function buildSystemPrompt() {
  return [
    'You are ThirdPerson AI, a private relationship conversation analysis assistant.',
    'Analyse the actual conversation provided. Do not return generic relationship advice.',
    'Use the selected relationship context, messaging platform, participants, timestamps, message patterns, important moments, and conversation evidence.',
    'The same response must create the relationship report and a relationship-specific personality card for the main user.',
    'The relationship-specific personality card should describe how the main user appears in this selected relationship type only.',
    'Support English, Hindi, Hinglish, and Indian-style mixed Hindi-English conversations.',
    'Use simple, emotionally intelligent language. Be warm, honest, careful, and practical.',
    'Never diagnose anyone. Never claim certainty about feelings, intent, loyalty, personality, or future behaviour.',
    'Never encourage manipulation, stalking, revenge, harassment, emotional control, coercion, or repeated unwanted contact.',
    'Use careful wording such as may suggest, could indicate, appears to, and based on the conversation.',
    'If evidence is weak or the sample is small, say that evidence is limited.',
    'Return only valid JSON matching the schema. Do not wrap in markdown. Do not include commentary outside JSON.',
  ].join('\n');
}

function buildRelationshipUserPrompt(payload) {
  const prepared = payload.preparedConversation || {};
  const relationshipType = prepared.metadata?.relationshipType || payload.relationshipType || 'Relationship';
  const parsedSample = (prepared.parsedMessages || []).slice(0, 40).map((message) => ({
    date: message.date,
    time: message.time,
    sender: message.sender,
    message: message.message,
    dayPeriod: message.dayPeriod,
    languageGuess: message.languageGuess,
    emotionalTags: message.emotionalTags,
  }));
  const pipeline = prepared.analysisPipeline || {};
  const shouldSendProtectedText = !pipeline.route || pipeline.route === 'single_compressed';

  return JSON.stringify({
    task: 'Generate one combined ThirdPerson AI JSON response from the actual conversation evidence. This single response must contain the Relationship Report, the relationship-specific main-user Personality Card, main-user personality signals, guide context summary, and future-use report summary.',
    importantInstruction: 'Do not give generic relationship advice. You must base every section on the provided parsed conversation, participants, timestamps, message patterns, selected relationship type, and important moments. If evidence is weak, say that evidence is limited or not enough evidence yet.',
    selectedRelationshipType: relationshipType,
    relationshipSpecificFocus: relationshipGuidance(relationshipType),
    selectedMessagingApp: prepared.metadata?.platform || payload.platform,
    selectedPersonName: prepared.metadata?.personName || payload.personName,
    parsedParticipants: prepared.participants || prepared.participantNames,
    selectedOtherPerson: prepared.metadata?.selectedOtherPerson,
    likelyMainUser: prepared.metadata?.likelyMainUser,
    dateRange: prepared.estimatedDateRange,
    messageCount: prepared.messageCount,
    senderStats: prepared.senderStats,
    monthlyBreakdown: prepared.monthlyBreakdown,
    dayNightStats: prepared.dailyNightBreakdown,
    topWords: prepared.topWords,
    importantMoments: prepared.importantMoments,
    analysisRoute: {
      route: pipeline.route || 'single_compressed',
      estimatedTokens: pipeline.estimatedTokens,
      chunkingStrategy: pipeline.chunkingStrategy,
      sanitizedMessageCount: pipeline.sanitizedMessageCount,
      chunks: (pipeline.chunks || []).map((chunk) => ({
        id: chunk.id,
        period: chunk.period,
        messageCount: chunk.messageCount,
        participants: chunk.participants,
        emotionalTags: chunk.emotionalTags,
        firstMessages: chunk.firstMessages,
        lastMessages: chunk.lastMessages,
        representativeMessages: chunk.representativeMessages,
      })),
    },
    sensitiveDataFilteringSummary: payload.sensitiveData?.protectionSummary,
    mainUserProfileDetails: safeUserProfile(payload.userProfile),
    selectedProfileLanguages: payload.userProfile?.preferredAnalysisLanguages || [],
    previousPersonalityCardSummary: payload.previousPersonalityMemory?.personality_json || payload.runtimeContext?.previousPersonalityCardSummary,
    previousPersonalityMemory: payload.previousPersonalityMemory || payload.runtimeContext?.previousPersonalityMemory,
    warningFlags: prepared.warningFlags,
    parseConfidence: prepared.parseConfidence,
    promptSafetySummary: {
      riskLevel: payload.promptScan?.riskLevel,
      flagsCount: payload.promptScan?.flags?.length || 0,
    },
    runtimeContext: payload.runtimeContext,
    cleanedProtectedConversationText: shouldSendProtectedText ? prepared.cleanedText?.slice(0, 18000) : '',
    compressedConversation: prepared.compressedConversation,
    parsedConversationSample: parsedSample,
    requiredJsonSchema: payload.analysisDraft || {},
    combinedOutputSchema: {
      relationshipReport: {
        summaryParagraph: '',
        overallDynamic: '',
        vibeLabel: '',
        emotionalTone: '',
        effortBalance: '',
        communicationPattern: '',
        redFlags: [],
        greenFlags: [],
        mixedSignals: [],
        energyBalance: '',
        dayNightDynamics: {},
        wordCloud: [],
        stickyNotes: [],
        nextBestMove: '',
        dashboardCards: [],
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
      relationshipPersonalityCard: {
        relationshipType: '',
        title: '',
        summaryParagraph: '',
        personalityLabel: '',
        personalityTypeSignal: '',
        emotionalSignature: '',
        communicationStyle: '',
        greenFlags: [],
        redFlags: [],
        attractionEnergy: '',
        whyPeopleStay: '',
        whyPeopleMisreadYou: '',
        growthAreas: [],
        keywords: [],
        viralOneLiner: '',
        confidenceLevel: 'Early Signal | Repeated Pattern | Strong Pattern | Not Enough Evidence',
        conciseSummaryForDatabase: '',
      },
      personalityCardUpdate: {
        headline: '',
        personalityTypeSignal: '',
        shareableLabel: '',
        coreTraits: [],
        greenFlags: [],
        redFlags: [],
        emotionalSignature: '',
        conversationMagnet: '',
        attractionEnergy: '',
        magneticEnergy: '',
        whyPeopleStay: '',
        whyPeopleMisreadYou: '',
        communicationStyle: '',
        loveFriendshipStyle: '',
        humourStyle: '',
        howYouFight: '',
        textingAura: '',
        toxicTraitUseful: '',
        matureSide: '',
        emotionalIntelligence: '',
        coolFactor: '',
        viralOneLiner: '',
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
    },
  }, null, 2);
}

function buildPersonalityUserPrompt({ reports = [], userProfile = {}, currentCard = {} }) {
  return JSON.stringify({
    task: 'Create a richer ThirdPerson AI Personality Card from the user’s first free Relationship Analyses.',
    instruction: 'Base the card on the reports and conversation patterns. Do not diagnose. Be creative, premium, warm, shareable, and careful.',
    userProfile: safeUserProfile(userProfile),
    reports: reports.slice(0, 2).map((report) => ({
      personName: report.personName,
      relationshipType: report.relationshipType,
      platform: report.platform,
      summary: report.analysisJson?.summary,
      personalitySnapshot: report.analysisJson?.personalitySnapshot,
      personalityCardViral: report.analysisJson?.personalityCardViral,
      communicationStyleSignals: report.analysisJson?.communicationStyleSignals?.user,
      topWords: report.preparedConversation?.topWords,
    })),
    currentCard,
    requiredJsonShape: {
      personality: { user: {} },
      personalitySnapshot: {},
      personalityCardViral: {},
      communicationStyleSignals: { user: {} },
    },
  }, null, 2);
}

function validateRelationshipAnalysis(candidate) {
  if (!candidate || typeof candidate !== 'object') throw new Error('The analysis response was not usable.');
  if (candidate.relationshipReport && !candidate.summary) {
    const report = candidate.relationshipReport || {};
    const relationshipCard = candidate.relationshipPersonalityCard || {};
    candidate.personalityCardUpdate = candidate.personalityCardUpdate || {
      headline: relationshipCard.title,
      personalityTypeSignal: relationshipCard.personalityTypeSignal,
      shareableLabel: relationshipCard.personalityLabel,
      greenFlags: relationshipCard.greenFlags || [],
      redFlags: relationshipCard.redFlags || [],
      emotionalSignature: relationshipCard.emotionalSignature,
      communicationStyle: relationshipCard.communicationStyle,
      attractionEnergy: relationshipCard.attractionEnergy,
      whyPeopleStay: relationshipCard.whyPeopleStay,
      whyPeopleMisreadYou: relationshipCard.whyPeopleMisreadYou,
      growthAreas: relationshipCard.growthAreas || [],
      confidenceNotes: relationshipCard.confidenceLevel ? [relationshipCard.confidenceLevel] : [],
      needsMoreChatsFor: candidate.mainUserPersonalitySignals?.notEnoughEvidence || [],
      viralOneLiner: relationshipCard.viralOneLiner,
    };
    candidate.summary = {
      relationshipOverview: report.summaryParagraph || report.summary,
      currentDynamic: report.overallDynamic || report.vibeLabel || report.bestieBreakdown || report.summaryParagraph || report.summary,
      mainEmotionalPattern: report.emotionalTone,
      importantCaveat: 'This is reflective insight based on the provided conversation, not proof or final judgment.',
    };
    candidate.redFlags = report.redFlags || [];
    candidate.greenFlags = report.greenFlags || [];
    candidate.improvedRedFlags = report.redFlags || [];
    candidate.improvedGreenFlags = report.greenFlags || [];
    candidate.timeline = report.timeline || report.timelineSummary || [];
    candidate.scores = report.scores || candidate.scores || {
      compatibility: 55,
      communicationHealth: 55,
      emotionalSafety: 55,
      effortBalance: 55,
      trustSignal: 55,
      conflictIntensity: 45,
      clarity: 55,
    };
    candidate.advice = report.advice || candidate.advice || {};
    candidate.screenshotWorthySummary = report.screenshotWorthySummary || report.vibeLabel || candidate.screenshotWorthySummary;
    candidate.dayNightDynamics = report.dayNightDynamics || candidate.dayNightDynamics || {};
    candidate.wordCloud = report.wordCloud || candidate.wordCloud || {};
    candidate.aiStickyNotes = report.stickyNotes || candidate.aiStickyNotes || [];
    candidate.dashboardCards = report.dashboardCards || candidate.dashboardCards || [];
    candidate.mixedSignalsMap = candidate.mixedSignalsMap || {
      confusingSignals: report.mixedSignals || [],
      bestieNote: report.vibeLabel || '',
    };
    candidate.communicationPatterns = {
      ...(candidate.communicationPatterns || {}),
      relationshipPattern: report.communicationPattern || candidate.communicationPatterns?.relationshipPattern,
    };
    candidate.personalitySnapshot = {
      ...(candidate.personalitySnapshot || {}),
      communicationStyle: candidate.mainUserPersonalitySignals?.communicationStyle,
      emotionalPattern: candidate.mainUserPersonalitySignals?.emotionalPattern,
      strengths: candidate.personalityCardUpdate?.greenFlags || [],
      growthAreas: candidate.personalityCardUpdate?.growthAreas || [],
      recurringWords: candidate.mainUserPersonalitySignals?.topWords || [],
      confidenceNotes: candidate.personalityCardUpdate?.confidenceNotes || [],
      needsMoreChatsFor: candidate.personalityCardUpdate?.needsMoreChatsFor || candidate.mainUserPersonalitySignals?.notEnoughEvidence || [],
    };
  }
  const hasSummary = candidate.summary && typeof candidate.summary === 'object';
  const hasScores = candidate.scores && typeof candidate.scores === 'object';
  const hasRecap = candidate.conversationRecap && typeof candidate.conversationRecap === 'object';
  const hasReadableText = Boolean(
    candidate.simpleSummaryForYoungAudience
    || candidate.summary?.currentDynamic
    || candidate.bestieBreakdown?.whatItLooksLike,
  );
  if (!hasSummary || !hasScores || !hasReadableText) {
    throw new Error(hasRecap ? 'The analysis response was incomplete.' : 'The analysis response did not match the required report format.');
  }
  return candidate;
}

async function chatJsonWithMessages(messages, options = {}) {
  const ready = await ensurePuterReady();
  if (!ready.ok) throw new Error(ready.error || 'Secure analysis is not ready.');
  const { puter } = ready;
  debug('request', { model: PUTER_FREE_ANALYSIS_MODEL, messageCount: messages.length });
  const response = await withTimeout(
    Promise.resolve(puter.ai.chat(messages, {
      model: PUTER_FREE_ANALYSIS_MODEL,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 6000,
    })),
    options.timeoutMs ?? CHAT_TIMEOUT_MS,
    'Secure analysis took too long. Please try again.',
  );
  const text = extractPuterText(response);
  debug('response', {
    model: PUTER_FREE_ANALYSIS_MODEL,
    responseType: Array.isArray(response) ? 'array' : typeof response,
    textLength: text.length,
  });
  const parsed = parseAnalysisJson(text);
  debug('parse success');
  return parsed;
}

export async function generateFreeRelationshipAnalysisViaPuter(payload) {
  const result = await chatJsonWithMessages([
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: buildRelationshipUserPrompt(payload) },
  ], { maxTokens: 6000, temperature: 0.7 });
  return validateRelationshipAnalysis(result);
}

export async function generateFreePersonalityCardViaPuter(payload) {
  return chatJsonWithMessages([
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: buildPersonalityUserPrompt(payload) },
  ], { maxTokens: 3500, temperature: 0.72 });
}

export async function testPuterAnalysisConnection() {
  const result = await chatJsonWithMessages([
    { role: 'system', content: 'Return valid JSON only.' },
    { role: 'user', content: 'Reply with JSON only: {"status":"ok","message":"Secure analysis connection is working"}' },
  ], { maxTokens: 80, temperature: 0 });
  if (result?.status !== 'ok') throw new Error('Secure analysis test returned an unexpected response.');
  return result;
}
