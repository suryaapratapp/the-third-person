// Deterministic conversation metrics.
//
// Everything here is counted locally from the parsed messages — no AI tokens.
// These are exactly the things a language model is worst at (arithmetic, exact
// counts, recall across thousands of messages) and a few lines of JS is best
// at, so we compute them once and both display them AND feed them to the model
// as ground truth so it interprets facts instead of guessing at them.

import {
  computeCallStats,
  computeMilestones,
  computeQuickStats,
  computeRhythm,
  computeToneSeries,
} from './conversationRhythm.js';

const SESSION_GAP_MINUTES = 360; // 6h without a message starts a new conversation
const MAX_REPLY_GAP_MINUTES = 60 * 24 * 3; // ignore 3-day+ gaps when averaging

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function formatDuration(minutes) {
  if (minutes === null || minutes === undefined) return 'Not enough data';
  if (minutes < 1) return 'Under a minute';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(hours < 10 ? 1 : 0)} hr`;
  const days = hours / 24;
  return `${days.toFixed(days < 10 ? 1 : 0)} days`;
}

// Counted from message BODIES, never from the whole upload.
//
// A raw WhatsApp export repeats the sender on every single line, and people put
// emoji in their display name — "[18/05/2022, 15:40:41] Surya 🚀: gainz". Count
// the file and that rocket appears once per message that person ever sent, so
// it wins "most used emoji" by a mile while saying nothing about the
// conversation. `messageBodiesFor()` hands this only what was actually typed.
// Symbols that are Extended_Pictographic but are typed as punctuation, not as
// emoji. These were the visible bug: ™, © and ® appear in forwarded messages
// and shop names constantly, and they were beating real emoji to the top of
// the list.
const TEXT_ONLY_SYMBOLS = new Set([0x2122, 0x00a9, 0x00ae, 0x2139]);

const REGIONAL_A = 0x1f1e6;
const REGIONAL_Z = 0x1f1ff;
const KEYCAP = 0x20e3;
const VARIATION_EMOJI = 0xfe0f;

// `\p{Extended_Pictographic}` alone is both too broad and too narrow.
//
// Too broad: it matches ™ © ® and a pile of dingbat arrows that default to a
// TEXT presentation and that nobody thinks of as emoji.
//
// Too narrow: country flags are pairs of regional indicators and keycaps are
// an ASCII digit plus U+20E3 — neither carries the property on its base
// character, so both were being dropped entirely. Every 🇮🇳 in an Indian
// user's chat was invisible to this.
export function isEmojiCluster(segment) {
  if (!segment) return false;
  const points = [...segment].map((character) => character.codePointAt(0));
  if (TEXT_ONLY_SYMBOLS.has(points[0])) return false;
  // Flag: exactly two regional indicators.
  if (points.length === 2 && points.every((point) => point >= REGIONAL_A && point <= REGIONAL_Z)) return true;
  if (points.includes(KEYCAP)) return true;
  // An explicit emoji variation selector is the author saying "render this as
  // an emoji", which is exactly what ❤️ needs.
  if (points.includes(VARIATION_EMOJI)) return true;
  // Otherwise the base must default to emoji presentation. This is the test
  // that excludes the text-presentation dingbats.
  return /\p{Emoji_Presentation}/u.test(segment);
}

export function computeEmojiUsage(rawText = '', limit = 9) {
  const text = String(rawText || '');
  if (!text) return [];
  const counts = new Map();

  const record = (emoji) => {
    const value = emoji.trim();
    if (!value) return;
    counts.set(value, (counts.get(value) || 0) + 1);
  };

  // Intl.Segmenter keeps grapheme clusters intact, so multi-codepoint emojis
  // (skin tones, ZWJ families, flags) are counted as one emoji, not several.
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    for (const { segment } of segmenter.segment(text)) {
      if (isEmojiCluster(segment)) record(segment);
    }
  } else {
    const matches = text.match(/\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*/gu) || [];
    matches.filter(isEmojiCluster).forEach(record);
  }

  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([emoji, count]) => ({ emoji, count, share: percent(count, total) }));
}

function bucketKeyFor(date, granularity) {
  if (granularity === 'year') return String(date.getFullYear());
  if (granularity === 'month') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  // Week buckets are keyed by their Monday so labels stay stable.
  const monday = new Date(date);
  const weekday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - weekday);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

function bucketLabelFor(key, granularity) {
  if (granularity === 'year') return key;
  if (granularity === 'month') {
    const [year, month] = key.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return new Intl.DateTimeFormat('en', { month: 'short', year: '2-digit' }).format(date);
  }
  const date = new Date(key);
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' }).format(date);
}

// Chooses week / month / year so the chart stays readable — and caps the number
// of bars so the graph always fits on screen without horizontal scrolling.
export function computeActivitySeries(messages = [], maxBuckets = 18) {
  const dated = messages.filter((message) => message.timestamp);
  if (!dated.length) return { granularity: 'none', buckets: [], total: 0 };

  const first = new Date(dated[0].timestamp);
  const last = new Date(dated[dated.length - 1].timestamp);
  const spanDays = Math.max(1, (last - first) / 86400000);

  let granularity = 'week';
  if (spanDays > 1100) granularity = 'year';
  else if (spanDays > 120) granularity = 'month';

  const build = (level) => {
    const map = new Map();
    dated.forEach((message) => {
      const key = bucketKeyFor(new Date(message.timestamp), level);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  };

  let entries = build(granularity);
  // Escalate rather than overflow: too many bars would need scrolling.
  if (entries.length > maxBuckets && granularity === 'week') {
    granularity = 'month';
    entries = build(granularity);
  }
  if (entries.length > maxBuckets && granularity === 'month') {
    granularity = 'year';
    entries = build(granularity);
  }
  if (entries.length > maxBuckets) entries = entries.slice(-maxBuckets);

  const peak = entries.reduce((max, [, count]) => Math.max(max, count), 0);
  return {
    granularity,
    total: dated.length,
    peak,
    buckets: entries.map(([key, count]) => ({
      key,
      label: bucketLabelFor(key, granularity),
      count,
      share: percent(count, peak),
    })),
  };
}

function splitIntoSessions(messages) {
  const sessions = [];
  let current = [];
  let previousTime = null;
  messages.forEach((message) => {
    const time = message.timestamp ? new Date(message.timestamp).getTime() : null;
    const gapMinutes = time && previousTime ? (time - previousTime) / 60000 : null;
    if (current.length && (gapMinutes === null || gapMinutes > SESSION_GAP_MINUTES)) {
      sessions.push(current);
      current = [];
    }
    current.push(message);
    if (time) previousTime = time;
  });
  if (current.length) sessions.push(current);
  return sessions;
}

function perSenderShape(sender) {
  return {
    sender,
    messages: 0,
    words: 0,
    questions: 0,
    initiations: 0,
    conversationEnds: 0,
    doubleTexts: 0,
    replyMinutes: [],
  };
}

// The headline effort/reciprocity numbers: who starts conversations, who replies
// faster, who double-texts, who lets conversations end, and how all of that
// changed between the start of the chat and now.
export function computeEffortMetrics(messages = []) {
  const usable = messages.filter((message) => message.sender);
  if (usable.length < 2) return null;

  const senders = [...new Set(usable.map((message) => message.sender))];
  if (senders.length < 2) return null;

  const stats = new Map(senders.map((sender) => [sender, perSenderShape(sender)]));
  const sessions = splitIntoSessions(usable);

  sessions.forEach((session) => {
    const starter = stats.get(session[0].sender);
    if (starter) starter.initiations += 1;
    const ender = stats.get(session[session.length - 1].sender);
    if (ender) ender.conversationEnds += 1;
  });

  usable.forEach((message, index) => {
    const entry = stats.get(message.sender);
    if (!entry) return;
    entry.messages += 1;
    entry.words += String(message.message || '').split(/\s+/).filter(Boolean).length;
    if (String(message.message || '').includes('?')) entry.questions += 1;

    const previous = usable[index - 1];
    if (!previous) return;
    if (previous.sender === message.sender) {
      entry.doubleTexts += 1;
      return;
    }
    if (previous.timestamp && message.timestamp) {
      const minutes = (new Date(message.timestamp) - new Date(previous.timestamp)) / 60000;
      if (minutes >= 0 && minutes <= MAX_REPLY_GAP_MINUTES) entry.replyMinutes.push(minutes);
    }
  });

  const totalMessages = usable.length;
  const totalSessions = sessions.length;
  const people = senders.map((sender) => {
    const entry = stats.get(sender);
    return {
      sender,
      messages: entry.messages,
      messageShare: percent(entry.messages, totalMessages),
      words: entry.words,
      averageWordsPerMessage: entry.messages ? Math.round(entry.words / entry.messages) : 0,
      initiations: entry.initiations,
      initiationShare: percent(entry.initiations, totalSessions),
      conversationEnds: entry.conversationEnds,
      doubleTexts: entry.doubleTexts,
      questionRate: percent(entry.questions, entry.messages),
      medianReplyMinutes: median(entry.replyMinutes),
    };
  }).sort((a, b) => b.messages - a.messages);

  // First third vs last third: the cheapest reliable way to see drift.
  const third = Math.max(1, Math.floor(usable.length / 3));
  const summarise = (slice) => {
    const counts = new Map();
    slice.forEach((message) => counts.set(message.sender, (counts.get(message.sender) || 0) + 1));
    const replyMinutes = [];
    slice.forEach((message, index) => {
      const previous = slice[index - 1];
      if (!previous || previous.sender === message.sender) return;
      if (!previous.timestamp || !message.timestamp) return;
      const minutes = (new Date(message.timestamp) - new Date(previous.timestamp)) / 60000;
      if (minutes >= 0 && minutes <= MAX_REPLY_GAP_MINUTES) replyMinutes.push(minutes);
    });
    return {
      messages: slice.length,
      medianReplyMinutes: median(replyMinutes),
      byPerson: senders.map((sender) => ({ sender, messages: counts.get(sender) || 0 })),
    };
  };

  const early = summarise(usable.slice(0, third));
  const recent = summarise(usable.slice(-third));
  const replyDelta = early.medianReplyMinutes !== null && recent.medianReplyMinutes !== null
    ? Math.round(recent.medianReplyMinutes - early.medianReplyMinutes)
    : null;

  return {
    totalMessages,
    conversations: totalSessions,
    people,
    trend: {
      early,
      recent,
      replyMinutesDelta: replyDelta,
      messageVolumeDelta: percent(recent.messages - early.messages, Math.max(1, early.messages)),
    },
  };
}

// Message bodies as typed, joined for scanning.
//
// Falls back to the raw upload only when the parser produced no bodies at all
// (the untimestamped-fallback path), because a slightly wrong emoji count beats
// no emoji count. When bodies exist they are always preferred: the raw upload
// carries sender names, and a name can contain an emoji.
export function messageBodiesFor(messages = [], rawText = '') {
  const bodies = messages
    .map((message) => message?.rawBody)
    .filter((body) => typeof body === 'string' && body.trim());
  return bodies.length ? bodies.join('\n') : String(rawText || '');
}

// One compact object: displayed in the report AND sent to the model as facts.
//
// This survives the transcript — `localMetrics` is on the retained allowlist in
// retainedConversation.js — so everything in it must be counts, dates and
// labels. Nothing here may carry message text.
export function computeLocalMetrics({ messages = [], rawText = '' } = {}) {
  const emojis = computeEmojiUsage(messageBodiesFor(messages, rawText));
  const effort = computeEffortMetrics(messages);
  const milestones = computeMilestones(messages);
  // From the RAW upload: the parser drops call lines as export noise.
  const calls = computeCallStats(rawText);

  return {
    emojis,
    activity: computeActivitySeries(messages),
    effort,
    rhythm: computeRhythm(messages),
    tone: computeToneSeries(messages),
    milestones,
    calls,
    quickStats: computeQuickStats({ messages, effort, milestones, emojis, calls }),
  };
}
