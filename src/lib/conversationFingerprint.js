function normalize(value = '') {
  return String(value).toLowerCase().trim().replace(/\s+/g, ' ').replace(/\r\n/g, '\n');
}

function simpleHash(input = '') {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

async function sha256(input) {
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return simpleHash(input);
}

function sampleMessages(messages = [], start = true) {
  const slice = start ? messages.slice(0, 10) : messages.slice(-10);
  return slice.map((m) => `${m.date || ''}|${m.time || ''}|${m.sender || ''}|${m.message || ''}`).join('\n');
}

export async function createConversationFingerprint({
  platform = '',
  relationshipType = '',
  personName = '',
  parsedMessages = [],
  rawText = '',
}) {
  const participants = [...new Set(parsedMessages.map((m) => normalize(m.sender)).filter(Boolean))].sort();
  const dated = parsedMessages.filter((m) => m.date);
  const startDate = dated[0]?.date || '';
  const endDate = dated[dated.length - 1]?.date || '';
  const firstMessagesHash = await sha256(normalize(sampleMessages(parsedMessages, true)));
  const lastMessagesHash = await sha256(normalize(sampleMessages(parsedMessages, false)));
  const participantHash = await sha256(participants.join('|'));
  const normalizedText = normalize(rawText).slice(0, 300000);
  const fullHash = await sha256(normalizedText);
  const messageCount = parsedMessages.length || rawText.split(/\r?\n/).filter(Boolean).length;
  const base = [
    normalize(platform),
    normalize(relationshipType),
    normalize(personName),
    participants.join('|'),
    startDate,
    endDate,
    messageCount,
    firstMessagesHash,
    lastMessagesHash,
    fullHash,
  ].join('::');
  const fingerprint = await sha256(base);
  return {
    fingerprint,
    chainKey: [normalize(platform), normalize(relationshipType), normalize(personName)].join('::'),
    summaryKey: [startDate, endDate, messageCount, firstMessagesHash, lastMessagesHash].join('::'),
    startDate,
    endDate,
    firstMessagesHash,
    lastMessagesHash,
    participantHash,
    messageCount,
    confidence: parsedMessages.length >= 5 ? 'high' : parsedMessages.length ? 'medium' : 'low',
  };
}

const CACHE_KEY = 'thirdperson_analysis_cache_v1';

export function getAnalysisCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function findCachedAnalysis(fingerprintData) {
  const cache = getAnalysisCache();
  const exact = cache.find((item) => item.fingerprint === fingerprintData.fingerprint);
  if (exact) return exact;
  return cache.find((item) => (
    item.chainKey === fingerprintData.chainKey
    && item.startDate === fingerprintData.startDate
    && item.endDate === fingerprintData.endDate
    && item.firstMessagesHash === fingerprintData.firstMessagesHash
    && item.lastMessagesHash === fingerprintData.lastMessagesHash
    && Math.abs((item.messageCount || 0) - fingerprintData.messageCount) <= Math.max(1, fingerprintData.messageCount * 0.02)
  ));
}

export function saveCachedAnalysis(fingerprintData, payload) {
  const cache = getAnalysisCache().filter((item) => item.fingerprint !== fingerprintData.fingerprint);
  cache.unshift({ ...fingerprintData, ...payload, savedAt: new Date().toISOString() });
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache.slice(0, 50)));
}
