import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, getAuthenticatedUser } from '../_shared/usage.ts';

function parseJsonText(text: string) {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
}

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
  const system = Deno.env.get('THIRDPERSON_PERSONALITY_SYSTEM_PROMPT')
    || 'Return a safe, reflective ThirdPerson AI personality card as valid JSON. Do not diagnose. Use careful, emotionally intelligent wording.';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_PERSONALITY_MODEL') || 'gpt-5-nano',
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: JSON.stringify({
            runtimeContext: body.runtimeContext,
            userProfile: body.userProfile,
            reports: body.reports,
            currentCard: body.currentCard,
            instruction: 'Use zodiac only as a light reflection layer. Prioritise real conversation patterns. Support English, Hindi, Hinglish, and Indian-style mixed language naturally.',
          }),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.65,
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

    const reportIds = (body.reports || []).map((report: Record<string, any>) => report.analysisId).filter(Boolean);
    await admin.from('user_personality').upsert({
      user_id: user.id,
      personality_json: personality,
      emotional_life_story: personality.emotionalLifeStory || {},
      recurring_words: personality.recurringWords || [],
      generated_from_report_ids: reportIds,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    await admin.from('ai_usage_logs').insert({
      user_id: user.id,
      action: 'generate_personality',
      provider: 'openai',
      status: 'success',
      metadata: { reportCount: reportIds.length },
    });

    return jsonResponse({ personality });
  } catch (_error) {
    return jsonResponse({ error: 'Personality Card could not be generated right now.' }, 500);
  }
});
