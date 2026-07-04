import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { buildBestiePrompt, messagesForChatCompletions } from '../_shared/promptBuilder.ts';
import { consumeCredit, createAdminClient, getAuthenticatedUser, getCreditBalance, logBlockedCredit } from '../_shared/usage.ts';

function supportsCustomTemperature(model: string) {
  return !model.startsWith('gpt-5');
}

function parseBestieText(text: string) {
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    return [
      parsed.quickTake && `Quick take: ${parsed.quickTake}`,
      parsed.answer,
      parsed.whatThisMayMean && `What this may mean: ${parsed.whatThisMayMean}`,
      parsed.whatToDoNext && `What to do next: ${parsed.whatToDoNext}`,
      parsed.whatNotToIgnore && `Do not ignore: ${parsed.whatNotToIgnore}`,
      parsed.gentleRealityCheck && `Gentle reality check: ${parsed.gentleRealityCheck}`,
    ].filter(Boolean).join('\n\n') || text;
  } catch {
    return text;
  }
}

const CODEBASE_BROSKI_SYSTEM_PROMPT = [
  'You are ThirdPerson Broski, a private relationship clarity companion inside ThirdPerson AI.',
  'Answer using only the provided report summaries, analysis chain context, personality signals, red and green flags, and important moments.',
  'Do not ask for or analyse full raw chats.',
  'Be warm, honest, protective, concise, emotionally intelligent, and practical.',
  'Match the user language style, including natural Hinglish where appropriate.',
  'Do not encourage obsession, stalking, manipulation, revenge, or emotional control.',
  'Do not diagnose or claim certainty about anyone feelings or intentions.',
  'Use careful wording like may suggest and based on the chats.',
  'Return valid JSON only.',
].join('\n');

async function openAiBestieReply(message: string, context: Record<string, any>, body: Record<string, any>) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY_MISSING');
  const model = Deno.env.get('OPENAI_BESTIE_MODEL') || 'gpt-5-nano';
  const system = CODEBASE_BROSKI_SYSTEM_PROMPT;
  const promptBundle = buildBestiePrompt({
    basePromptTemplate: system,
    userQuestion: message,
    relationshipType: body.relationshipType,
    otherPersonName: body.otherPersonName,
    languageProfile: body.languageProfile || {
      dominantLanguage: body.detectedLanguageStyle,
      languagesUsed: body.userProfile?.preferredAnalysisLanguages || [],
      recommendedOutputStyle: body.detectedLanguageStyle,
    },
    analysisChainSummary: context?.analysisChainSummary || context?.latestSummary || context?.reportSummaryForFutureUse?.compressedSummary || '',
    latestReportSummary: {
      summary: context?.latestSummary || '',
      bestieContextSummary: context?.bestieContextSummary || {},
      relevantRedFlags: context?.repeatedRedFlags || [],
      relevantGreenFlags: context?.repeatedGreenFlags || [],
      importantMoments: context?.turningPoints || context?.reportSummaryForFutureUse?.importantMoments || [],
    },
    personalityCardSummary: context?.personalitySnapshot || context?.mainUserPersonalitySignals || {},
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
      ...(supportsCustomTemperature(model) ? { temperature: 0.7 } : {}),
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`OPENAI_BESTIE_HTTP_${response.status}:${detail.slice(0, 160)}`);
  }
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('OPENAI_BESTIE_EMPTY_RESPONSE');
  return parseBestieText(text);
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
    const availableMessages = await getCreditBalance(admin, user.id, 'bestie_message');
    if (availableMessages <= 0) {
      await logBlockedCredit(admin, user.id, 'bestie_message');
      return jsonResponse({
        code: 'OUT_OF_CREDITS',
        creditType: 'bestie_message',
        error: 'You’re out of Broski Chats. Top up to keep asking Broski for guidance.',
      }, 402);
    }

    let text: string;
    try {
      text = await openAiBestieReply(userMessage, analysisChainContext || {}, body);
    } catch (openAiError) {
      await admin.from('ai_usage_logs').insert({
        user_id: user.id,
        action: 'ai_bestie_chat',
        provider: 'openai',
        status: 'error',
        metadata: {
          chainId,
          stage: 'openai_bestie_reply',
          reason: openAiError instanceof Error ? openAiError.message.slice(0, 220) : 'unknown',
          promptTemplateVersion: 'bestie_chat_v1',
          relationshipType: body.relationshipType,
          detectedLanguageStyle: body.detectedLanguageStyle,
        },
      });
      return jsonResponse({
        code: 'AI_PROVIDER_UNAVAILABLE',
        error: 'Broski could not connect to the AI provider. No Broski Chat credit was used. Please check server configuration and try again.',
      }, 503);
    }

    const { data: userMessageRecord, error: userMessageError } = await admin.from('bestie_messages').insert({
      user_id: user.id,
      chain_id: chainId,
      role: 'user',
      content: userMessage,
      metadata: { source: 'bestie_chat' },
    }).select('*').single();
    if (userMessageError) throw userMessageError;

    const { data: assistantMessage, error: assistantMessageError } = await admin
      .from('bestie_messages')
      .insert({
        user_id: user.id,
        chain_id: chainId,
        role: 'assistant',
        content: text,
        metadata: { source: 'bestie_chat' },
      })
      .select('*')
      .single();
    if (assistantMessageError) throw assistantMessageError;

    let credit;
    try {
      credit = await consumeCredit(admin, user.id, 'bestie_message');
    } catch (creditError) {
      if (userMessageRecord?.id) await admin.from('bestie_messages').delete().eq('id', userMessageRecord.id);
      if (assistantMessage?.id) await admin.from('bestie_messages').delete().eq('id', assistantMessage.id);
      throw creditError;
    }
    if (!credit.allowed) {
      if (userMessageRecord?.id) await admin.from('bestie_messages').delete().eq('id', userMessageRecord.id);
      if (assistantMessage?.id) await admin.from('bestie_messages').delete().eq('id', assistantMessage.id);
      return jsonResponse({
        code: 'OUT_OF_CREDITS',
        creditType: 'bestie_message',
        error: 'You’re out of Broski Chats. Top up to keep asking Broski for guidance.',
      }, 402);
    }

    if (assistantMessage?.id) {
      await admin.from('bestie_messages').update({
        metadata: { source: 'bestie_chat', remainingCredits: credit.remaining },
      }).eq('id', assistantMessage.id);
    }

    await admin.from('ai_usage_logs').insert({
      user_id: user.id,
      action: 'ai_bestie_chat',
      provider: 'openai',
      status: 'success',
      metadata: {
        chainId,
        messageId: assistantMessage?.id,
        remainingCredits: credit.remaining,
        promptTemplateVersion: 'bestie_chat_v1',
        relationshipType: body.relationshipType,
        detectedLanguageStyle: body.detectedLanguageStyle,
      },
    });

    return jsonResponse({ text, message: assistantMessage, remainingCredits: credit.remaining });
  } catch (_error) {
    return jsonResponse({ error: 'Broski could not reply right now. Please try again.' }, 500);
  }
});
