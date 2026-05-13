const PUTER_SCRIPT_URL = 'https://js.puter.com/v2/';
const SCRIPT_TIMEOUT_MS = 8000;
const CHAT_TIMEOUT_MS = 22000;

let puterLoadPromise = null;

function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function waitForPuter(timeoutMs = SCRIPT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (isPuterAvailable()) {
        resolve(window.puter);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error('AI service took too long to become ready.'));
        return;
      }
      window.setTimeout(tick, 80);
    };
    tick();
  });
}

function stripJsonFences(text = '') {
  return String(text)
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function parseJsonResponse(response) {
  const text = typeof response === 'string'
    ? response
    : response?.message?.content || response?.content || response?.text || '';
  if (!text) return null;
  try {
    return JSON.parse(stripJsonFences(text));
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export function isPuterAvailable() {
  return typeof window !== 'undefined' && Boolean(window.puter?.ai?.chat);
}

export async function loadPuterAi() {
  if (isPuterAvailable()) return window.puter;
  if (typeof window === 'undefined') throw new Error('AI is not available in this environment.');
  if (!puterLoadPromise) {
    puterLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${PUTER_SCRIPT_URL}"]`);
      if (existing) {
        waitForPuter().then(resolve).catch(reject);
        existing.addEventListener('load', () => waitForPuter().then(resolve).catch(reject), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = PUTER_SCRIPT_URL;
      script.async = true;
      script.onload = () => waitForPuter().then(resolve).catch(reject);
      script.onerror = () => reject(new Error('AI service could not load.'));
      document.head.appendChild(script);
    });
  }
  const puter = await withTimeout(puterLoadPromise, SCRIPT_TIMEOUT_MS + 1500, 'AI service took too long to load.');
  if (!puter?.ai?.chat) throw new Error('AI service is not ready.');
  return puter;
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

async function chatJson(prompt) {
  const puter = await loadPuterAi();
  const response = await withTimeout(
    Promise.resolve(puter.ai.chat(prompt, { model: 'gpt-4o-mini' })).catch(() => puter.ai.chat(prompt)),
    CHAT_TIMEOUT_MS,
    'AI response took too long.',
  );
  return parseJsonResponse(response);
}

export async function generateFreeRelationshipAnalysisViaPuter(payload) {
  const prepared = payload.preparedConversation || {};
  const relationshipType = prepared.metadata?.relationshipType || payload.relationshipType || 'Relationship';
  const prompt = `
You are ThirdPerson AI. Return valid JSON only.

This is a free Relationship Analysis for a signed-in user. Do not reveal provider details.
Use simple, emotionally intelligent, bestie-style language. Support English, Hindi, Hinglish, and Indian-style mixed language.
If the conversation is Hinglish, include light natural Hinglish where useful, without overdoing slang.
Use careful wording: may suggest, could indicate, appears to, based on the conversation.
Never diagnose, never claim certainty, never encourage manipulation, stalking, revenge, or emotional control.

Relationship type: ${relationshipType}
Relationship-specific focus: ${relationshipGuidance(relationshipType)}

Runtime context:
${JSON.stringify(payload.runtimeContext || {}, null, 2)}

Prepared conversation:
${JSON.stringify({
    platform: prepared.metadata?.platform,
    personName: prepared.metadata?.personName,
    relationshipType,
    participants: prepared.participants || prepared.participantNames,
    dateRange: prepared.estimatedDateRange,
    messageCount: prepared.messageCount,
    senderStats: prepared.senderStats,
    dayNightDynamics: prepared.dailyNightBreakdown,
    importantMoments: prepared.importantMoments,
    topWords: prepared.topWords,
    sensitiveDataSummary: payload.sensitiveData?.protectionSummary,
    compressedConversation: prepared.compressedConversation,
  }, null, 2)}

Return JSON shaped like this draft, but improve the wording:
${JSON.stringify(payload.analysisDraft || {}, null, 2)}
`;
  return chatJson(prompt);
}

export async function generateFreePersonalityCardViaPuter({ reports = [], userProfile = {}, currentCard = {} }) {
  const prompt = `
You are ThirdPerson AI. Return valid JSON only.

Create a richer Personality Card from the user's first free Relationship Analyses.
Do not reveal provider details. Do not diagnose. Be creative, fun, premium, warm, and shareable.
Support English, Hindi, Hinglish, and Indian-style mixed language naturally where useful.

User profile:
${JSON.stringify(userProfile, null, 2)}

Available relationship reports:
${JSON.stringify(reports.slice(0, 2).map((report) => ({
    personName: report.personName,
    relationshipType: report.relationshipType,
    platform: report.platform,
    summary: report.analysisJson?.summary,
    personalitySnapshot: report.analysisJson?.personalitySnapshot,
    personalityCardViral: report.analysisJson?.personalityCardViral,
    communicationStyleSignals: report.analysisJson?.communicationStyleSignals?.user,
    topWords: report.preparedConversation?.topWords,
  })), null, 2)}

Existing card data:
${JSON.stringify(currentCard, null, 2)}

Return JSON with these optional fields:
{
  "personality": { "user": {} },
  "personalitySnapshot": {},
  "personalityCardViral": {},
  "communicationStyleSignals": { "user": {} }
}
`;
  return chatJson(prompt);
}
