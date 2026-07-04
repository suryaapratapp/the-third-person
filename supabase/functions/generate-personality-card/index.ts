import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { buildPersonalityCardPrompt, messagesForChatCompletions } from '../_shared/promptBuilder.ts';
import { createAdminClient, getAuthenticatedUser } from '../_shared/usage.ts';

function parseJsonText(text: string) {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
}

function supportsCustomTemperature(model: string) {
  return !model.startsWith('gpt-5');
}

const CODEBASE_PERSONALITY_SYSTEM_PROMPT = [
  'You are ThirdPerson AI, a private self-understanding and personality insight assistant.',
  'Create a safe, reflective paid Understand Yourself profile using only relationship-specific personality summaries.',
  'Do not request, infer from, or ask for raw chats.',
  'Combine how the user appears with friends, family, love, exes, colleagues, clients, and managers when those summaries are available.',
  'Do not diagnose, shame, sexualize, or claim certainty about identity.',
  'Preserve stable traits, strengthen repeated patterns, soften weak signals, and say not enough evidence when data is limited.',
  'Use warm, emotionally intelligent, mature, shareable language.',
  'Support English, Hindi, Hinglish, and mixed-language output where natural.',
  'Return valid JSON only.',
].join('\n');

async function hasPaidPack(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data, error } = await admin
    .from('analysis_credits')
    .select('id')
    .eq('user_id', userId)
    .neq('source', 'free')
    .gt('credits_granted', 0)
    .limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

async function openAiPersonality(body: Record<string, any>) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return null;
  const model = Deno.env.get('OPENAI_PERSONALITY_MODEL') || 'gpt-5-nano';
  const system = CODEBASE_PERSONALITY_SYSTEM_PROMPT;
  const cards = Array.isArray(body.relationshipPersonalityCards)
    ? body.relationshipPersonalityCards
    : (Array.isArray(body.cards) ? body.cards : []);
  const latestCard = cards[0] || {};
  const promptBundle = buildPersonalityCardPrompt({
    basePromptTemplate: system,
    previousPersonalityCard: body.currentCard || body.previousPersonalityCard || body.currentUnderstandYourself || null,
    newPersonalitySignals: {
      relationshipPersonalityCards: cards.slice(0, 24).map((card: Record<string, any>) => ({
        id: card.id,
        relationshipType: card.relationshipType,
        otherPersonName: card.otherPersonName,
        title: card.title,
        shortSummary: card.shortSummary,
        personalityLabel: card.personalityLabel,
        personalityTypeSignal: card.personalityTypeSignal,
        greenFlagsSummary: card.greenFlagsSummary,
        redFlagsSummary: card.redFlagsSummary,
        communicationStyleSummary: card.communicationStyleSummary,
        emotionalSignatureSummary: card.emotionalSignatureSummary,
        attractionEnergySummary: card.attractionEnergySummary,
        growthAreasSummary: card.growthAreasSummary,
        keywords: card.keywords,
        confidenceLevel: card.confidenceLevel,
      })),
    },
    relationshipType: body.relationshipType || latestCard.relationshipType || 'Mixed relationship worlds',
    languageProfile: body.languageProfile || body.runtimeContext?.languageProfile || {},
    outputSchema: {
      understandYourself: {
        summaryParagraph: '',
        overallPersonalityLabel: '',
        personalityTypeSignal: '',
        howYouAreWithFriends: '',
        howYouAreWithFamily: '',
        howYouAreWithLove: '',
        howYouAreWithEx: '',
        howYouAreAtWork: '',
        repeatedPatterns: [],
        strongestGreenFlags: [],
        lovingRedFlags: [],
        emotionalSignature: '',
        socialEnergy: '',
        communicationStyle: '',
        growthAreas: [],
        bestMatches: [],
        keywords: [],
        viralOneLiner: '',
      },
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
      detectedLanguageStyle: {
        dominantLanguage: '',
        languagesUsed: [],
        recommendedOutputStyle: '',
        toneNotes: '',
      },
    },
  });
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: messagesForChatCompletions(promptBundle),
      response_format: { type: 'json_object' },
      ...(supportsCustomTemperature(model) ? { temperature: 0.65 } : {}),
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
    const paid = await hasPaidPack(admin, user.id);
    if (!paid) {
      return jsonResponse({
        code: 'OUT_OF_CREDITS',
        error: 'Top up to generate paid Personality Card intelligence.',
      }, 402);
    }

    const body = await req.json();
    const personality = await openAiPersonality(body).catch(() => null);
    if (!personality) {
      return jsonResponse({ error: 'Personality Card could not be generated right now.' }, 503);
    }

    const understandYourself = personality.understandYourself || personality;
    const sourceCardIds = (body.relationshipPersonalityCards || body.cards || [])
      .map((card: Record<string, any>) => card.id)
      .filter(Boolean);
    try {
      await admin.from('understand_yourself_profiles').upsert({
        user_id: user.id,
        source_personality_card_ids: sourceCardIds,
        overall_profile_json: understandYourself,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    } catch {
      // The migration may not be applied in older environments. Keep the generated profile usable.
    }

    await admin.from('user_personality').upsert({
      user_id: user.id,
      personality_json: understandYourself,
      emotional_life_story: personality.emotionalLifeStory || {},
      recurring_words: understandYourself.keywords || personality.recurringWords || [],
      generated_from_report_ids: [],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    await admin.from('ai_usage_logs').insert({
      user_id: user.id,
      action: 'generate_personality',
      provider: 'openai',
      status: 'success',
      metadata: {
        relationshipPersonalityCardCount: sourceCardIds.length,
        promptTemplateVersion: 'understand_yourself_v1',
        relationshipTypes: (body.relationshipPersonalityCards || body.cards || []).map((card: Record<string, any>) => card.relationshipType).filter(Boolean),
        detectedLanguages: body.languageProfile?.languagesUsed || body.runtimeContext?.languageProfile?.languagesUsed || [],
      },
    });

    return jsonResponse({ personality: understandYourself, understandYourself });
  } catch (_error) {
    return jsonResponse({ error: 'Personality Card could not be generated right now.' }, 500);
  }
});
