import { detectConversationLanguageProfile } from './languageDetection.js';
import { buildAnalysisPipeline, cleanConversationLine, isConversationNoise } from './analysisPipeline.js';

const emotionalKeywords = [
  'love', 'miss', 'sorry', 'hurt', 'angry', 'fine', 'okay', 'alone', 'tired', 'busy',
  'trust', 'breakup', 'fight', 'confused', 'care', 'ignored', 'always', 'never',
  'please', 'leave', 'stay', 'blocked', 'call', 'explain', 'promise', 'worried',
  'distant', 'changed', 'jealous', 'respect', 'lie', 'honest', 'jaan', 'baby',
  'yaad', 'pyaar', 'pyar', 'gussa', 'naraz', 'kyu', 'kyun',
];

const warmthSignals = [
  'love', 'miss', 'care', 'jaan', 'baby', 'sweetheart', 'hug', 'kiss', 'yaad',
  'pyaar', 'pyar', 'cute', 'together', 'always with you',
];

const tensionSignals = [
  'fight', 'angry', 'hurt', 'ignored', 'leave', 'breakup', 'block', 'blocked',
  'liar', 'lie', 'tired', 'toxic', 'done', 'hate', 'gussa', 'naraz',
  'mat karo', 'kyun', 'kyu', 'nahi baat', 'stop',
];

const stopWords = new Set([
  'the', 'and', 'you', 'that', 'for', 'with', 'this', 'just', 'are', 'was', 'have',
  'not', 'but', 'what', 'your', 'from', 'like', 'they', 'will', 'can', 'about',
  'were', 'when', 'then', 'been', 'there', 'here', 'really', 'because', 'would',
  'could', 'should', 'into', 'dont', 'didnt', 'cant', 'im', 'ive', 'its', 'youre',
  'hai', 'haan', 'nahi', 'kya', 'aur', 'bhi', 'tha', 'thi', 'the', 'mera', 'meri',
]);

function normalizeYear(year) {
  if (!year) return null;
  return Number(year.length === 2 ? `20${year}` : year);
}

function toTimestamp(date, time, preferMonthFirst = false) {
  const dateParts = date.split(/[/-]/).map(Number);
  const [first, second, rawYear] = dateParts;
  const year = normalizeYear(String(rawYear));
  const day = preferMonthFirst ? second : first;
  const month = preferMonthFirst ? first : second;
  const [hour = 0, minute = 0, secondValue = 0] = time
    .replace(/\s?(AM|PM)$/i, '')
    .split(':')
    .map(Number);
  const isPm = /PM$/i.test(time);
  const isAm = /AM$/i.test(time);
  const normalizedHour = isPm && hour < 12 ? hour + 12 : isAm && hour === 12 ? 0 : hour;
  const stamp = new Date(year, month - 1, day, normalizedHour, minute, secondValue || 0);
  if (Number.isNaN(stamp.getTime())) return null;
  return stamp;
}

function formatMonthKey(timestamp, fallbackIndex) {
  if (!timestamp) return `Phase ${fallbackIndex + 1}`;
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(timestamp);
}

function classifyPeriod(hour) {
  if (hour >= 6 && hour < 18) return 'Day';
  if (hour >= 18 && hour < 22) return 'Evening';
  return 'Night';
}

function languageGuess(text) {
  if (/[\u0900-\u097F]/.test(text)) return /[a-z]/i.test(text) ? 'Mixed Hindi-English' : 'Hindi';
  const hinglishHints = /\b(hai|haan|nahi|kya|kyu|kyun|mat|kar|karo|apko|aapko|shi|sahi|lagta|lage|yaad|pyaar|pyar|gussa|naraz|bata|samajh|iska|uska|skta|sakta|hu|haan)\b/i;
  return hinglishHints.test(text) ? 'Hinglish' : 'English';
}

function emotionalTags(text) {
  const lower = text.toLowerCase();
  const tags = [];
  if (warmthSignals.some((word) => lower.includes(word))) tags.push('warmth');
  if (tensionSignals.some((word) => lower.includes(word))) tags.push('tension');
  if (/\b(sorry|explain|promise|please|samjha|bata)\b/i.test(lower)) tags.push('repair');
  if (/\b(confused|distant|changed|alone|overwhelmed|tired)\b/i.test(lower)) tags.push('uncertainty');
  return tags;
}

function isSystemLine(line) {
  return /messages and calls are end-to-end encrypted|created group|changed the subject|added you|left|missed voice call|image omitted|video omitted|sticker omitted|document omitted/i.test(line);
}

function parseTimestampedLine(line, platform, id) {
  const patterns = [
    { regex: /^\[(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM|am|pm)?)\]\s*([^:]+):\s*([\s\S]*)$/, monthFirst: false },
    { regex: /^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM|am|pm)?)\s*[-–]\s*([^:]+):\s*([\s\S]*)$/, monthFirst: null },
    { regex: /^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}(?::\d{2})?)\s+([^:]+):\s*([\s\S]*)$/, iso: true },
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern.regex);
    if (!match) continue;
    const [, date, time, sender, message] = match;
    const cleanedMessage = cleanConversationLine(message);
    if (isConversationNoise(cleanedMessage)) return null;
    let timestamp = null;
    if (pattern.iso) timestamp = new Date(`${date}T${time}`);
    else {
      const [a, b] = date.split(/[/-]/).map(Number);
      const preferMonthFirst = pattern.monthFirst === null ? a <= 12 && b > 12 : pattern.monthFirst;
      timestamp = toTimestamp(date, time, preferMonthFirst);
    }
    const hour = timestamp ? timestamp.getHours() : null;
    return {
      id,
      rawLine: line,
      date,
      time,
      timestamp: timestamp ? timestamp.toISOString() : null,
      sender: sender.trim(),
      message: cleanedMessage,
      platform,
      dayPeriod: hour === null ? 'Unknown' : classifyPeriod(hour),
      monthKey: formatMonthKey(timestamp, Math.floor(id / 20)),
      year: timestamp ? timestamp.getFullYear() : null,
      hour,
      languageGuess: languageGuess(message),
      emotionalTags: emotionalTags(message),
    };
  }
  return null;
}

function countMatches(messages, words, period) {
  return messages
    .filter((message) => !period || message.dayPeriod === period)
    .reduce((sum, item) => {
      const lower = item.message.toLowerCase();
      return sum + words.reduce((wordSum, word) => wordSum + (lower.includes(word) ? 1 : 0), 0);
    }, 0);
}

function signalSummary(messages, words, label) {
  const hits = [];
  messages.forEach((message) => {
    const lower = message.message.toLowerCase();
    const matched = words.filter((word) => lower.includes(word));
    if (!matched.length) return;
    hits.push({
      period: message.monthKey,
      sender: message.sender,
      signalType: label,
      matchedWords: matched.slice(0, 4),
      quote: message.message.slice(0, 220),
    });
  });
  return {
    count: hits.length,
    moments: hits.slice(0, 12),
  };
}

function compactMessage(message) {
  if (!message) return null;
  return {
    date: message.date,
    time: message.time,
    period: message.monthKey,
    sender: message.sender,
    message: message.message,
    dayPeriod: message.dayPeriod,
    languageGuess: message.languageGuess,
    emotionalTags: message.emotionalTags,
  };
}

function replyGaps(messages) {
  const gaps = [];
  for (let index = 1; index < messages.length; index += 1) {
    const previous = messages[index - 1];
    const current = messages[index];
    if (!previous.timestamp || !current.timestamp || previous.sender === current.sender) continue;
    const minutes = Math.round((new Date(current.timestamp).getTime() - new Date(previous.timestamp).getTime()) / 60000);
    if (!Number.isFinite(minutes) || minutes < 30) continue;
    gaps.push({
      from: previous.sender,
      to: current.sender,
      minutes,
      period: current.monthKey,
      replyPreview: current.message.slice(0, 180),
    });
  }
  return gaps.sort((a, b) => b.minutes - a.minutes).slice(0, 10);
}

function buildDayNightBreakdown(messages) {
  const periods = ['Day', 'Evening', 'Night'];
  const total = Math.max(1, messages.length);
  return periods.map((period) => {
    const periodMessages = messages.filter((message) => message.dayPeriod === period);
    const senderCounts = {};
    periodMessages.forEach((message) => {
      senderCounts[message.sender] = (senderCounts[message.sender] || 0) + 1;
    });
    return {
      period,
      count: periodMessages.length,
      percentage: Math.round((periodMessages.length / total) * 100),
      affectionSignals: countMatches(messages, warmthSignals, period),
      tensionSignals: countMatches(messages, tensionSignals, period),
      emotionalIntensity: periodMessages.reduce((sum, message) => sum + message.emotionalTags.length, 0),
      topSender: Object.entries(senderCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Not enough data',
    };
  });
}

function topWordsFrom(messages) {
  const counts = new Map();
  messages.forEach(({ message }) => {
    message.toLowerCase().replace(/[^a-z\u0900-\u097F\s']/g, ' ').split(/\s+/).forEach((raw) => {
      const word = raw.replace(/'/g, '');
      if (word.length < 3 || stopWords.has(word)) return;
      counts.set(word, (counts.get(word) || 0) + 1);
    });
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([word, count]) => ({ word, count }));
}

export function parseConversationText(rawText = '', platform = 'Unknown') {
  const lines = String(rawText).replace(/<\/?UNTRUSTED_CHAT_DATA>/g, '').split(/\r?\n/);
  const messages = [];
  const unsupportedLines = [];
  let matchedLines = 0;

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;
    if (isSystemLine(line) && !/:\s+/.test(line)) return;
    const parsed = parseTimestampedLine(line, platform, messages.length + 1);
    if (parsed) {
      matchedLines += 1;
      messages.push(parsed);
      return;
    }
    if (messages.length && !/^\[?\d{1,4}[/-]\d{1,2}[/-]\d{1,4}/.test(line)) {
      const previous = messages[messages.length - 1];
      const cleanedLine = cleanConversationLine(line);
      if (isConversationNoise(cleanedLine)) return;
      previous.message = `${previous.message}\n${cleanedLine}`.trim();
      previous.rawLine = `${previous.rawLine}\n${rawLine}`;
      previous.languageGuess = languageGuess(previous.message);
      previous.emotionalTags = emotionalTags(previous.message);
    } else {
      unsupportedLines.push(rawLine);
    }
  });

  if (!messages.length) {
    const chunks = String(rawText).split(/[.!?]\s+|\n+/).map((item) => cleanConversationLine(item)).filter((item) => item && !isConversationNoise(item));
    chunks.forEach((message, index) => {
      messages.push({
        id: index + 1,
        rawLine: message,
        date: null,
        time: null,
        timestamp: null,
        sender: index % 2 ? 'Their' : 'You',
        message,
        platform,
        dayPeriod: 'Unknown',
        monthKey: `Phase ${Math.floor(index / Math.max(1, Math.ceil(chunks.length / 5))) + 1}`,
        year: null,
        hour: null,
        languageGuess: languageGuess(message),
        emotionalTags: emotionalTags(message),
      });
    });
  }

  const participants = [...new Set(messages.map((message) => message.sender).filter(Boolean))];
  const dated = messages.filter((message) => message.timestamp);
  const dateRange = dated.length
    ? `${dated[0].date} to ${dated[dated.length - 1].date}`
    : messages.length ? 'Dates not clearly detected' : 'No conversation detected';
  const senderStats = participants.map((sender) => ({
    sender,
    count: messages.filter((message) => message.sender === sender).length,
    percentage: Math.round((messages.filter((message) => message.sender === sender).length / Math.max(1, messages.length)) * 100),
  }));

  const monthMap = new Map();
  messages.forEach((message) => {
    const current = monthMap.get(message.monthKey) || { period: message.monthKey, messageCount: 0, emotionalHits: 0 };
    current.messageCount += 1;
    current.emotionalHits += message.emotionalTags.length;
    monthMap.set(message.monthKey, current);
  });

  const ratio = matchedLines / Math.max(1, matchedLines + unsupportedLines.length);
  const parseConfidence = ratio > 0.75 ? 'high' : ratio > 0.35 ? 'medium' : 'low';

  return {
    messages,
    participants,
    dateRange,
    messageCount: messages.length,
    parseConfidence,
    unsupportedLines,
    monthlyBreakdown: [...monthMap.values()],
    dailyNightBreakdown: buildDayNightBreakdown(messages),
    senderStats,
  };
}

function importantScore(text) {
  const lower = text.toLowerCase();
  return emotionalKeywords.reduce((score, word) => score + (lower.includes(word) ? 1 : 0), 0);
}

function compress(messages, importantMoments) {
  const opening = messages.slice(0, 4).map((m) => `${m.sender}: ${m.message}`).join('\n');
  const keyMoments = importantMoments.slice(0, 10).map((m) => `${m.period} | ${m.sender}: ${m.message}`).join('\n');
  const closing = messages.slice(-4).map((m) => `${m.sender}: ${m.message}`).join('\n');
  return [
    'Opening sample:',
    opening || 'No clear opening sample detected.',
    'Emotionally meaningful moments:',
    keyMoments || 'No strong emotional keywords detected; analysis should remain cautious.',
    'Closing sample:',
    closing || 'No clear closing sample detected.',
  ].join('\n');
}

export function prepareConversationForAnalysis(rawText = '', options = {}) {
  const cleanRaw = String(rawText)
    .replace(/<\/?UNTRUSTED_CHAT_DATA>/g, '')
    .split(/\r?\n/)
    .map((line) => cleanConversationLine(line))
    .filter((line) => line && !isConversationNoise(line))
    .join('\n')
    .trim();
  const parsedConversation = parseConversationText(cleanRaw, options.platform || 'Unknown platform');
  const messages = parsedConversation.messages;
  const phaseSize = Math.max(1, Math.ceil(messages.length / 6));
  const importantMoments = messages
    .map((message, index) => ({
      ...message,
      speaker: message.sender,
      text: message.message,
      period: message.monthKey || `Phase ${Math.floor(index / phaseSize) + 1}`,
      emotionalWeight: importantScore(message.message),
    }))
    .filter((message) => message.emotionalWeight > 0)
    .sort((a, b) => b.emotionalWeight - a.emotionalWeight)
    .slice(0, 16);

  const selected = (options.personName || '').toLowerCase().trim();
  const selectedSender = selected
    ? parsedConversation.participants.find((name) => name.toLowerCase().includes(selected) || selected.includes(name.toLowerCase()))
    : '';
  const likelyMainUser = parsedConversation.participants.find((name) => name !== selectedSender) || parsedConversation.participants[0] || 'You';

  const warningFlags = [];
  if (messages.length < 10) warningFlags.push('Small sample size; insights should be treated as directional.');
  if (parsedConversation.parseConfidence === 'low') warningFlags.push('Conversation structure was estimated from limited formatting.');
  if (parsedConversation.participants.length < 2) warningFlags.push('Participant names were estimated from limited structure.');
  const languageProfile = detectConversationLanguageProfile(messages);
  const affectionSignals = signalSummary(messages, warmthSignals, 'affection');
  const conflictSignals = signalSummary(messages, tensionSignals, 'conflict');

  const prepared = {
    metadata: {
      platform: options.platform || 'Unknown platform',
      relationshipType: options.relationshipType || 'Unknown relationship',
      personName: options.personName || 'This person',
      sourceCharacters: cleanRaw.length,
      selectedOtherPerson: selectedSender || options.personName || 'Selected person',
      likelyMainUser,
    },
    cleanedText: cleanRaw,
    compressedConversation: compress(messages, importantMoments),
    estimatedDateRange: parsedConversation.dateRange,
    participantNames: parsedConversation.participants,
    participants: parsedConversation.participants,
    senderStats: parsedConversation.senderStats,
    messageCount: messages.length,
    warningFlags,
    monthlyBreakdown: parsedConversation.monthlyBreakdown.slice(0, 12),
    dailyNightBreakdown: parsedConversation.dailyNightBreakdown,
    languageProfile,
    languageStyle: languageProfile.recommendedOutputStyle,
    detectedLanguages: languageProfile.languagesUsed,
    dominantLanguage: languageProfile.dominantLanguage,
    affectionSignals,
    conflictSignals,
    firstMessages: messages.slice(0, 10).map(compactMessage).filter(Boolean),
    lastMessages: messages.slice(-10).map(compactMessage).filter(Boolean),
    replyGaps: replyGaps(messages),
    parseConfidence: parsedConversation.parseConfidence,
    importantMoments,
    topWords: topWordsFrom(messages),
    parsedMessages: messages,
  };
  prepared.analysisPipeline = buildAnalysisPipeline(prepared);
  return prepared;
}
