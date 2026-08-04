import { buildCorsHeaders, jsonResponse } from '../_shared/cors.ts';
import { buildBestiePrompt, messagesForChatCompletions } from '../_shared/promptBuilder.ts';
import { getPersonaPrompt } from '../_shared/personas.ts';
import { createAdminClient, getAuthenticatedUser, refundCredit, reserveCredit } from '../_shared/usage.ts';
import { S, responseFormatFor } from '../_shared/jsonSchema.ts';

// Strict schema keeps replies to the three fields the UI renders — the model
// cannot pad the answer with extra sections it invents.
const bestieReplyJsonSchema = S.obj({
  answer: S.str('The direct answer, 2-4 sentences maximum'),
  whatToDoNext: S.str('One specific next step, or empty string'),
  whatNotToIgnore: S.str('One real risk worth naming, or empty string'),
});

function supportsCustomTemperature(model: string) {
  return !model.startsWith('gpt-5');
}

function parseBestieText(text: string) {
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    // Older replies may still carry the retired fields; keep reading them so
    // previously stored answers render, but new replies are just these three.
    return [
      parsed.answer || parsed.quickTake,
      parsed.whatToDoNext && `What to do next: ${parsed.whatToDoNext}`,
      parsed.whatNotToIgnore && `Do not ignore: ${parsed.whatNotToIgnore}`,
    ].filter(Boolean).join('\n\n') || text;
  } catch {
    return text;
  }
}

async function openAiBestieReply(message: string, context: Record<string, any>, body: Record<string, any>) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY_MISSING');
  const model = Deno.env.get('OPENAI_BESTIE_MODEL') || 'gpt-5-nano';
  const system = getPersonaPrompt(body.personaId);
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
      response_format: responseFormatFor('coach_reply', bestieReplyJsonSchema),
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
  const cors = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405, cors);

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: 'Please sign in to continue.' }, 401, cors);

    const body = await req.json();
    const { chainId, userMessage, analysisChainContext } = body;
    if (!chainId || !userMessage) return jsonResponse({ error: 'Please ask a relationship question.' }, 400, cors);
    // Enforced server-side: the UI cap is a convenience, but without this a
    // pasted essay would silently inflate input tokens on every coach reply.
    const MAX_QUESTION_CHARS = 600;
    const question = String(userMessage).trim();
    if (question.length > MAX_QUESTION_CHARS) {
      return jsonResponse({
        code: 'QUESTION_TOO_LONG',
        error: `Please keep your question under ${MAX_QUESTION_CHARS} characters so your coach can answer clearly. Ask one thing at a time.`,
      }, 400, cors);
    }

    const admin = createAdminClient();
    const reservation = await reserveCredit(admin, user.id, 'bestie_message');
    if (!reservation.allowed) {
      return jsonResponse({
        code: 'OUT_OF_CREDITS',
        creditType: 'bestie_message',
        error: 'You’re out of Coach Chats. Top up to keep asking your AI Relationship Coach for guidance.',
      }, 402, cors);
    }

    let text: string;
    try {
      text = await openAiBestieReply(question, analysisChainContext || {}, body);
    } catch (openAiError) {
      await refundCredit(admin, reservation.creditId);
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
          personaId: body.personaId || 'warm',
        },
      });
      return jsonResponse({
        code: 'AI_PROVIDER_UNAVAILABLE',
        error: 'Your AI Relationship Coach could not connect to the AI provider. No Coach Chat credit was used. Please check server configuration and try again.',
      }, 503, cors);
    }

    const { data: userMessageRecord, error: userMessageError } = await admin.from('bestie_messages').insert({
      user_id: user.id,
      chain_id: chainId,
      role: 'user',
      content: question,
      metadata: { source: 'bestie_chat' },
    }).select('*').single();
    if (userMessageError) {
      await refundCredit(admin, reservation.creditId);
      throw userMessageError;
    }

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
    if (assistantMessageError) {
      await refundCredit(admin, reservation.creditId);
      if (userMessageRecord?.id) await admin.from('bestie_messages').delete().eq('id', userMessageRecord.id);
      throw assistantMessageError;
    }

    await admin.from('bestie_messages').update({
      metadata: { source: 'bestie_chat', remainingCredits: reservation.remaining, personaId: body.personaId || 'warm' },
    }).eq('id', assistantMessage.id);

    await admin.from('ai_usage_logs').insert({
      user_id: user.id,
      action: 'ai_bestie_chat',
      provider: 'openai',
      status: 'success',
      metadata: {
        chainId,
        messageId: assistantMessage?.id,
        remainingCredits: reservation.remaining,
        promptTemplateVersion: 'bestie_chat_v1',
        relationshipType: body.relationshipType,
        detectedLanguageStyle: body.detectedLanguageStyle,
        personaId: body.personaId || 'warm',
      },
    });

    return jsonResponse({ text, message: assistantMessage, remainingCredits: reservation.remaining }, 200, cors);
  } catch (_error) {
    return jsonResponse({ error: 'Your AI Relationship Coach could not reply right now. Please try again.' }, 500, cors);
  }
});
