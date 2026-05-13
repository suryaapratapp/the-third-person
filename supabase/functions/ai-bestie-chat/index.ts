import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { consumeCredit, createAdminClient, getAuthenticatedUser } from '../_shared/usage.ts';

function safeBestieReply(message: string, context: Record<string, any>) {
  const personName = context?.personName || 'them';
  return [
    `Bestie, based on the reports for ${personName}, I would read this gently and not as proof.`,
    `What stands out is: ${context?.latestSummary || 'the relationship seems to have mixed clarity and emotional signals.'}`,
    `If you reply, keep it calm and direct. Ask for clarity without chasing, blaming, or trying to control the outcome.`,
    `A good next step could be: “I want to understand where we stand, because mixed signals are making this harder for me.”`,
  ].join('\n\n');
}

async function openAiBestieReply(message: string, context: Record<string, any>, body: Record<string, any>) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return null;
  const system = Deno.env.get('THIRDPERSON_BESTIE_SYSTEM_PROMPT')
    || 'Reply as a safe, caring relationship clarity companion. Be gentle, concise, and never claim certainty.';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_BESTIE_MODEL') || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: JSON.stringify({
            question: message,
            relationshipType: body.relationshipType,
            otherPersonName: body.otherPersonName,
            detectedLanguageStyle: body.detectedLanguageStyle,
            userProfile: body.userProfile,
            analysisChainContext: context,
          }),
        },
      ],
      temperature: 0.7,
    }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.choices?.[0]?.message?.content || null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: 'Please sign in to continue.' }, 401);

    const body = await req.json();
    const { chainId, userMessage, analysisChainContext } = body;
    if (!chainId || !userMessage) return jsonResponse({ error: 'Please ask a relationship question.' }, 400);

    const admin = createAdminClient();
    const credit = await consumeCredit(admin, user.id, 'bestie_message');
    if (!credit.allowed) {
      return jsonResponse({ error: 'No Bestie messages available. Please upgrade or check your plan.' }, 402);
    }

    await admin.from('bestie_messages').insert({
      user_id: user.id,
      chain_id: chainId,
      role: 'user',
      content: userMessage,
      metadata: { source: 'bestie_chat' },
    });

    const text = await openAiBestieReply(userMessage, analysisChainContext || {}, body).catch(() => null)
      || safeBestieReply(userMessage, analysisChainContext || {});
    const { data: assistantMessage } = await admin
      .from('bestie_messages')
      .insert({
        user_id: user.id,
        chain_id: chainId,
        role: 'assistant',
        content: text,
        metadata: { remainingCredits: credit.remaining },
      })
      .select('*')
      .single();

    await admin.from('ai_usage_logs').insert({
      user_id: user.id,
      action: 'ai_bestie_chat',
      provider: Deno.env.get('OPENAI_API_KEY') ? 'openai' : 'local_fallback',
      status: 'success',
      metadata: { chainId, messageId: assistantMessage?.id, remainingCredits: credit.remaining },
    });

    return jsonResponse({ text, message: assistantMessage, remainingCredits: credit.remaining });
  } catch (_error) {
    return jsonResponse({ error: 'Bestie could not reply right now. Please try again.' }, 500);
  }
});
