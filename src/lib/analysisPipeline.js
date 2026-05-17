const TOKEN_DIVISOR = 4;
const SHORT_CHAT_TOKEN_LIMIT = 25000;
const MEDIUM_CHAT_TOKEN_LIMIT = 100000;
const TARGET_CHUNK_TOKENS = 12000;
const VERY_LONG_TARGET_CHUNK_TOKENS = 9000;
const MAX_MESSAGE_CHARS = 420;
const MAX_CHUNK_MESSAGES = 240;

const mediaOrExportNoise = [
  /<media omitted>/i,
  /image omitted/i,
  /video omitted/i,
  /sticker omitted/i,
  /gif omitted/i,
  /audio omitted/i,
  /document omitted/i,
  /contact card omitted/i,
  /messages and calls are end-to-end encrypted/i,
  /security code changed/i,
  /this message was deleted/i,
  /missed voice call/i,
  /missed video call/i,
];

export function estimateTokensFromText(text = '') {
  return Math.ceil(String(text).length / TOKEN_DIVISOR);
}

export function removeEmojiAndControlNoise(text = '') {
  return String(text)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[^\S\r\n]+/g, ' ')
    .trim();
}

export function cleanConversationLine(text = '') {
  const cleaned = removeEmojiAndControlNoise(text)
    .replace(/\u200E|\u200F|\u202A|\u202B|\u202C|\u202D|\u202E/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned;
}

export function isConversationNoise(text = '') {
  const value = String(text).trim();
  if (!value) return true;
  return mediaOrExportNoise.some((pattern) => pattern.test(value));
}

export function compactMessageForAi(message = {}) {
  const text = cleanConversationLine(message.message || message.text || '');
  if (isConversationNoise(text)) return null;
  return {
    id: message.id,
    date: message.date || null,
    period: message.monthKey || message.period || 'Undated phase',
    sender: message.sender || 'Unknown sender',
    message: text.slice(0, MAX_MESSAGE_CHARS),
    dayPeriod: message.dayPeriod || 'Unknown',
    languageGuess: message.languageGuess || '',
    emotionalTags: message.emotionalTags || [],
  };
}

function groupKeyFor(message = {}, route = 'single') {
  if (route === 'long_async_ready') {
    const month = message.monthKey || message.period || 'Undated phase';
    const day = message.date ? String(message.date).replace(/\//g, '-') : `phase-${Math.ceil((message.id || 1) / 400)}`;
    return `${month} • ${day}`;
  }
  return message.monthKey || message.period || `Phase ${Math.ceil((message.id || 1) / 200)}`;
}

function makeChunk(period, messages, index) {
  const compactMessages = messages.map(compactMessageForAi).filter(Boolean);
  const textForEstimate = compactMessages.map((message) => `${message.sender}: ${message.message}`).join('\n');
  const participants = [...new Set(compactMessages.map((message) => message.sender).filter(Boolean))];
  const emotionalTags = {};
  compactMessages.forEach((message) => {
    (message.emotionalTags || []).forEach((tag) => {
      emotionalTags[tag] = (emotionalTags[tag] || 0) + 1;
    });
  });
  return {
    id: `chunk-${index + 1}`,
    period,
    messageCount: compactMessages.length,
    estimatedTokens: estimateTokensFromText(textForEstimate),
    participants,
    emotionalTags,
    firstMessages: compactMessages.slice(0, 4),
    lastMessages: compactMessages.slice(-4),
    representativeMessages: compactMessages.slice(0, MAX_CHUNK_MESSAGES),
  };
}

function splitOversizedGroup(period, messages, targetTokens, startIndex) {
  const chunks = [];
  let current = [];
  let currentTokens = 0;
  messages.forEach((message) => {
    const tokenEstimate = estimateTokensFromText(message.message || '');
    if (current.length && (currentTokens + tokenEstimate > targetTokens || current.length >= MAX_CHUNK_MESSAGES)) {
      chunks.push(makeChunk(`${period} • Part ${chunks.length + 1}`, current, startIndex + chunks.length));
      current = [];
      currentTokens = 0;
    }
    current.push(message);
    currentTokens += tokenEstimate;
  });
  if (current.length) chunks.push(makeChunk(`${period} • Part ${chunks.length + 1}`, current, startIndex + chunks.length));
  return chunks;
}

export function buildAnalysisPipeline(preparedConversation = {}) {
  const messages = (preparedConversation.parsedMessages || [])
    .map((message) => ({
      ...message,
      message: cleanConversationLine(message.message || ''),
    }))
    .filter((message) => !isConversationNoise(message.message));
  const fullStructuredText = messages.map((message) => `${message.date || ''} ${message.time || ''} ${message.sender}: ${message.message}`).join('\n');
  const estimatedTokens = estimateTokensFromText(fullStructuredText);
  const route = estimatedTokens < SHORT_CHAT_TOKEN_LIMIT
    ? 'single_compressed'
    : estimatedTokens < MEDIUM_CHAT_TOKEN_LIMIT
      ? 'chunked_synthesis'
      : 'long_async_ready';
  const targetTokens = route === 'long_async_ready' ? VERY_LONG_TARGET_CHUNK_TOKENS : TARGET_CHUNK_TOKENS;
  const grouped = new Map();

  messages.forEach((message) => {
    const key = groupKeyFor(message, route);
    const group = grouped.get(key) || [];
    group.push(message);
    grouped.set(key, group);
  });

  const chunks = [];
  [...grouped.entries()].forEach(([period, group]) => {
    const groupTokens = estimateTokensFromText(group.map((message) => message.message).join('\n'));
    if (groupTokens > targetTokens || group.length > MAX_CHUNK_MESSAGES) {
      chunks.push(...splitOversizedGroup(period, group, targetTokens, chunks.length));
    } else {
      chunks.push(makeChunk(period, group, chunks.length));
    }
  });

  return {
    route,
    estimatedTokens,
    thresholds: {
      singleCompressedUnder: SHORT_CHAT_TOKEN_LIMIT,
      chunkedSynthesisUnder: MEDIUM_CHAT_TOKEN_LIMIT,
    },
    chunkingStrategy: route === 'single_compressed' ? 'compressed structured request' : 'chronological period summaries',
    progressSteps: route === 'single_compressed'
      ? ['Preparing relationship context', 'Building your report']
      : ['Reading conversation timeline', 'Understanding each period', 'Combining relationship signals', 'Building your report'],
    sanitizedMessageCount: messages.length,
    chunks: chunks.slice(0, route === 'long_async_ready' ? 40 : 24),
    retrievalReadyMemory: {
      chunkSummaries: [],
      importantMoments: preparedConversation.importantMoments || [],
      turningPoints: [],
      redGreenFlagEvidence: [],
      personalitySignals: [],
    },
  };
}
