const PUTER_SCRIPT_ID = 'thirdperson-puter-script';
const PUTER_SRC = 'https://js.puter.com/v2/';

const systemPrompt = `You are ThirdPerson Bestie, a caring relationship clarity companion inside ThirdPerson AI.

You speak like the user's emotionally intelligent best friend. Be warm, honest, protective, and clear. Adapt gently to the user's profile identity where available, without stereotyping gender, sexuality, or personality. Use the analysis chain context to answer questions about the relationship. If the user's chats are mostly Hindi, Hinglish, or Indian English, reply naturally in that style. Do not overuse slang. Do not encourage delusion, stalking, manipulation, revenge, or emotional control. Do not diagnose anyone. Do not claim certainty about someone's feelings or intentions. Use wording like "this may suggest", "it looks like", "based on the chats", and "I would be careful here." Zodiac is only a soft reflection layer; conversation evidence matters more.`;

function loadPuterScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Bestie chat is available in the browser.'));
  if (window.puter?.ai?.chat) return Promise.resolve(window.puter);
  const existing = document.getElementById(PUTER_SCRIPT_ID);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(window.puter), { once: true });
      existing.addEventListener('error', () => reject(new Error('The chat layer is taking a moment.')), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => reject(new Error('The chat layer took too long to respond.')), 8000);
    script.id = PUTER_SCRIPT_ID;
    script.src = PUTER_SRC;
    script.async = true;
    script.onload = () => {
      window.clearTimeout(timeout);
      if (window.puter?.ai?.chat) resolve(window.puter);
      else reject(new Error('The chat layer is unavailable.'));
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error('The chat layer is taking a moment.'));
    };
    document.head.appendChild(script);
  });
}

function fallbackBestie({ userMessage, analysisChainContext, detectedLanguageStyle }) {
  const hinglish = /hinglish|indian/i.test(detectedLanguageStyle || '') || /\b(kya|hai|nahi|kyu|mat|yaar|bol|reply)\b/i.test(userMessage);
  const context = analysisChainContext?.latestSummary || 'the relationship has a few patterns worth reading gently';
  if (hinglish) {
    return `Bestie, honestly bolun toh based on the chats, ${context}. Main isko proof nahi bolungi, but yeh pattern worth noticing hai. Agar tu reply draft karna chahta/chahti hai, keep it calm: ek clear question, no pressure, no chasing.`;
  }
  return `Bestie, based on the chats, ${context}. I would not treat this as proof of what they feel, but it is a pattern worth noticing. Keep your next move calm, clear, and self-respecting.`;
}

export async function askPuterBestieBot(input) {
  const {
    chainId,
    userMessage,
    analysisChainContext,
    userProfile,
    detectedLanguageStyle,
    relationshipType,
    otherPersonName,
  } = input;

  try {
    const puter = await loadPuterScript();
    if (!puter?.ai?.chat) throw new Error('The chat layer is unavailable.');
    const prompt = JSON.stringify({
      task: 'Answer the user as ThirdPerson Bestie. Use simple, warm, direct relationship advice. Keep it safe, practical, and grounded in the analysis chain.',
      chainId,
      userMessage,
      relationshipType,
      otherPersonName,
      detectedLanguageStyle,
      userProfile: {
        firstName: userProfile?.firstName,
        genderIdentity: userProfile?.genderIdentity,
        preferredLanguageTone: userProfile?.preferredLanguageTone,
        zodiacSign: userProfile?.zodiacSign,
      },
      analysisChainContext,
      safety: {
        noCertaintyClaims: true,
        noManipulation: true,
        noStalking: true,
        noRepeatedUnwantedContact: true,
        noDiagnosing: true,
        zodiacIsReflectiveOnly: true,
      },
    });
    const response = await puter.ai.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ], { model: 'gpt-4o' });
    return {
      text: typeof response === 'string'
        ? response
        : response?.message?.content || response?.content || response?.text || fallbackBestie(input),
      error: null,
    };
  } catch (error) {
    return { text: fallbackBestie(input), error: error?.message || null };
  }
}
