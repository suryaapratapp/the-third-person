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
    // eslint-disable-next-line no-control-regex -- intentionally stripping control characters from uploaded chat text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[^\S\r\n]+/g, ' ')
    .trim();
}

// Control characters and bidi marks only — emoji survive.
//
// The pre-parse pass needs this rather than cleanConversationLine(). WhatsApp
// injects bidi marks around its system lines, so the timestamp patterns will
// not match unless they are stripped first — but stripping EMOJI at that stage
// destroys the one copy of the text that emoji counting and the warmth signal
// depend on. The parser still cleans each message BODY afterwards, so the text
// sent to the AI is unchanged.
export function stripInvisibleNoise(text = '') {
  return String(text)
    // eslint-disable-next-line no-control-regex -- intentionally stripping control characters from uploaded chat text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\u200E|\u200F|\u202A|\u202B|\u202C|\u202D|\u202E/g, '')
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

const SIX_MONTHS_DAYS = 183;
const DAY_MS = 86400000;

// How finely to slice the history before summarising it.
//
// This is the single biggest lever on timeline quality. Everything used to be
// grouped by calendar MONTH regardless of length, so a six-week situationship
// produced two periods — and a two-line "timeline" that told you nothing you
// did not already know.
//
// Under six months: weekly, because at that scale a week is roughly one
// chapter of a relationship. Beyond it: monthly, because 150 weekly periods is
// more AI calls than any request budget allows and, at that range, a month is
// the unit people actually remember things in ("things got bad around March").
export function chunkCadenceFor(messages = []) {
  const times = messages
    .map((message) => (message.timestamp ? new Date(message.timestamp).getTime() : null))
    .filter((time) => time && !Number.isNaN(time));
  if (times.length < 2) return 'week';
  const spanDays = (Math.max(...times) - Math.min(...times)) / DAY_MS;
  return spanDays > SIX_MONTHS_DAYS ? 'month' : 'week';
}

function weekStart(date) {
  const monday = new Date(date);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Sortable key. Chunks must reach the model in chronological order or the
// "arc" it reports is just the order a Map happened to iterate in.
function periodKeyFor(message = {}, cadence = 'month') {
  const time = message.timestamp ? new Date(message.timestamp).getTime() : null;
  if (!time || Number.isNaN(time)) return message.monthKey || message.period || 'zzzz-undated';
  const date = new Date(time);
  if (cadence === 'week') return weekStart(date).toISOString().slice(0, 10);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Human label, shown verbatim in the report timeline.
export function periodLabelFor(key, cadence = 'month') {
  if (!key || key.startsWith('zzzz')) return 'Undated';
  if (cadence === 'week') {
    const start = new Date(key);
    if (Number.isNaN(start.getTime())) return key;
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const fmt = (date, withYear) => new Intl.DateTimeFormat('en', {
      day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}),
    }).format(date);
    return `${fmt(start, false)} – ${fmt(end, true)}`;
  }
  const [year, month] = key.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return key;
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date);
}

function makeChunk(period, messages, index, meta = {}) {
  const compactMessages = messages.map(compactMessageForAi).filter(Boolean);
  const textForEstimate = compactMessages.map((message) => `${message.sender}: ${message.message}`).join('\n');
  const participants = [...new Set(compactMessages.map((message) => message.sender).filter(Boolean))];
  const emotionalTags = {};
  compactMessages.forEach((message) => {
    (message.emotionalTags || []).forEach((tag) => {
      emotionalTags[tag] = (emotionalTags[tag] || 0) + 1;
    });
  });
  const dated = messages.map((m) => m.timestamp).filter(Boolean).sort();
  return {
    id: `chunk-${index + 1}`,
    period,
    // Real boundaries, so the timeline can say "3–9 Mar 2024" rather than
    // inventing a phase name.
    periodKey: meta.periodKey || period,
    cadence: meta.cadence || 'month',
    startedAt: dated[0] || null,
    endedAt: dated[dated.length - 1] || null,
    messageCount: compactMessages.length,
    estimatedTokens: estimateTokensFromText(textForEstimate),
    participants,
    emotionalTags,
    firstMessages: compactMessages.slice(0, 4),
    lastMessages: compactMessages.slice(-4),
    representativeMessages: compactMessages.slice(0, MAX_CHUNK_MESSAGES),
  };
}

function splitOversizedGroup(period, messages, targetTokens, startIndex, meta = {}) {
  const chunks = [];
  let current = [];
  let currentTokens = 0;
  messages.forEach((message) => {
    const tokenEstimate = estimateTokensFromText(message.message || '');
    if (current.length && (currentTokens + tokenEstimate > targetTokens || current.length >= MAX_CHUNK_MESSAGES)) {
      chunks.push(makeChunk(`${period} • Part ${chunks.length + 1}`, current, startIndex + chunks.length, meta));
      current = [];
      currentTokens = 0;
    }
    current.push(message);
    currentTokens += tokenEstimate;
  });
  if (current.length) chunks.push(makeChunk(`${period} • Part ${chunks.length + 1}`, current, startIndex + chunks.length, meta));
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
  const cadence = chunkCadenceFor(messages);
  const grouped = new Map();

  messages.forEach((message) => {
    const key = periodKeyFor(message, cadence);
    const group = grouped.get(key) || [];
    group.push(message);
    grouped.set(key, group);
  });

  const chunks = [];
  // Sorted by key, which is why the keys are ISO-ish: a Map preserves
  // insertion order, and messages are not guaranteed to arrive in order.
  [...grouped.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).forEach(([key, group]) => {
    const label = periodLabelFor(key, cadence);
    const groupTokens = estimateTokensFromText(group.map((message) => message.message).join('\n'));
    if (groupTokens > targetTokens || group.length > MAX_CHUNK_MESSAGES) {
      chunks.push(...splitOversizedGroup(label, group, targetTokens, chunks.length, { periodKey: key, cadence }));
    } else {
      chunks.push(makeChunk(label, group, chunks.length, { periodKey: key, cadence }));
    }
  });

  return {
    route,
    cadence,
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
    chunks: chunks.slice(0, cadence === 'week' ? 40 : 30),
    retrievalReadyMemory: {
      chunkSummaries: [],
      importantMoments: preparedConversation.importantMoments || [],
      turningPoints: [],
      redGreenFlagEvidence: [],
      personalitySignals: [],
    },
  };
}
