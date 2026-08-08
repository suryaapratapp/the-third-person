// When and how a conversation actually happened.
//
// Everything here is counted locally from parsed messages, like the rest of
// conversationMetrics — no AI tokens, no guessing. These four are the ones a
// person recognises instantly about their own chat and no language model can
// produce reliably: what time of day this relationship lives at, whether the
// warmth moved, the days that stand out, and the headline numbers.
//
// PRIVACY: every value returned from this module is a count, a date, a
// percentage or a label we generate. No message text leaves any function here,
// because these results are persisted (`localMetrics` is on the retained
// allowlist) after the transcript itself is discarded. If you add a field,
// check it cannot be used to reconstruct what was said.

const DAY_MS = 86400000;

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function isoDay(date) {
  // Local date, not UTC: "which day was this" is a question about the person's
  // own clock, and toISOString() would shift half the evening messages of
  // anyone east of Greenwich into the following day.
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function prettyDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function hourLabel(hour) {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

/* ------------------------------------------------------------------ *
 * Rhythm — day of week × hour of day
 *
 * The single most recognisable chart you can show someone about their
 * own chat: it is immediately obvious whether this is a lunch-break
 * friendship or a 1am one, and whether it lives on weekends.
 * ------------------------------------------------------------------ */
export function computeRhythm(messages = []) {
  const dated = messages.filter((message) => message.timestamp);
  if (dated.length < 10) return null;

  // grid[day][hour], day 0 = Monday.
  const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
  const byHour = new Array(24).fill(0);
  const byDay = new Array(7).fill(0);
  let counted = 0;

  dated.forEach((message) => {
    const date = new Date(message.timestamp);
    if (Number.isNaN(date.getTime())) return;
    const day = (date.getDay() + 6) % 7;
    const hour = date.getHours();
    grid[day][hour] += 1;
    byHour[hour] += 1;
    byDay[day] += 1;
    counted += 1;
  });

  if (!counted) return null;

  let peak = 0;
  let peakDay = 0;
  let peakHour = 0;
  grid.forEach((row, day) => {
    row.forEach((count, hour) => {
      if (count > peak) {
        peak = count;
        peakDay = day;
        peakHour = hour;
      }
    });
  });

  const weekendShare = percent(byDay[5] + byDay[6], counted);
  // Late night is the window people actually mean by it: 11pm to 4am.
  const lateNight = byHour.slice(23).concat(byHour.slice(0, 5));
  const lateNightShare = percent(lateNight.reduce((sum, n) => sum + n, 0), counted);

  const busiestHour = byHour.indexOf(Math.max(...byHour));

  return {
    grid,
    byHour,
    byDay,
    total: counted,
    peak,
    peakCell: { day: peakDay, hour: peakHour, count: peak },
    peakLabel: `${DAY_LABELS[peakDay]} around ${hourLabel(peakHour)}`,
    busiestHour,
    busiestHourLabel: hourLabel(busiestHour),
    busiestDayLabel: DAY_LABELS[byDay.indexOf(Math.max(...byDay))],
    weekendShare,
    lateNightShare,
  };
}

/* ------------------------------------------------------------------ *
 * Tone over time, per person
 *
 * A deliberately modest signal: counts of warm and cold markers, plus
 * emoji, per person per time bucket. It is NOT sentiment analysis and
 * the report must not present it as one — it is "how warm the words
 * looked", and the UI says so.
 *
 * The lexicon covers English, Hindi and Hinglish in Latin script,
 * because that is what this product's chats are actually written in.
 * ------------------------------------------------------------------ */
const WARM = [
  'love', 'loved', 'miss', 'missed', 'thank', 'thanks', 'thankyou', 'sorry', 'please', 'happy',
  'glad', 'great', 'good', 'nice', 'sweet', 'cute', 'proud', 'care', 'best', 'awesome', 'amazing',
  'beautiful', 'excited', 'haha', 'hahaha', 'lol', 'lmao', 'congrats', 'congratulations', 'welcome',
  'hug', 'kiss', 'babe', 'baby', 'dear', 'yaar', 'jaan', 'pyaar', 'accha', 'acha', 'theek', 'thik',
  'shukriya', 'dhanyavad', 'khush', 'bahut', 'sahi', 'mast', 'badhiya', 'zabardast', 'maaf',
];

const COLD = [
  'hate', 'angry', 'annoyed', 'annoying', 'upset', 'sad', 'hurt', 'tired', 'done', 'whatever',
  'never', 'stop', 'wrong', 'stupid', 'ridiculous', 'unfair', 'ignore', 'ignored', 'ignoring',
  'busy', 'later', 'forget', 'blocked', 'fight', 'fighting', 'argue', 'leave', 'alone', 'nothing',
  'gussa', 'pareshan', 'bekar', 'galat', 'nahi', 'nahin', 'mat', 'chhodo', 'chodo', 'bakwas',
];

// Code-point ranges rather than a regex character class: hearts and several
// smileys are routinely followed by a variation selector, and a class that
// matches only the base character is the kind of half-match that silently
// misreads whole conversations.
const WARM_EMOJI = [
  [0x1f600, 0x1f60f], [0x1f617, 0x1f61d], [0x1f642, 0x1f643], [0x1f495, 0x1f49f],
  [0x2764, 0x2764], [0x1f970, 0x1f972], [0x1f929, 0x1f929], [0x1f917, 0x1f917],
];
const COLD_EMOJI = [
  [0x1f620, 0x1f624], [0x1f61e, 0x1f61f], [0x1f62d, 0x1f62d], [0x1f612, 0x1f612],
  [0x1f644, 0x1f644], [0x1f494, 0x1f494], [0x1f922, 0x1f922], [0x1f92c, 0x1f92c],
];

function hasEmojiIn(text, ranges) {
  for (const character of text) {
    const point = character.codePointAt(0);
    if (ranges.some(([low, high]) => point >= low && point <= high)) return true;
  }
  return false;
}

function toneOf(text) {
  const value = String(text || '');
  if (!value.trim()) return 0;
  // \p{M} keeps Devanagari matras attached to their consonant; a raw
  // codepoint range would split "खुश" into three "words".
  const words = value.toLowerCase().match(/[\p{L}\p{M}]+/gu) || [];
  let score = 0;
  words.forEach((word) => {
    if (WARM.includes(word)) score += 1;
    else if (COLD.includes(word)) score -= 1;
  });
  if (hasEmojiIn(value, WARM_EMOJI)) score += 1;
  if (hasEmojiIn(value, COLD_EMOJI)) score -= 1;
  // A run of exclamation marks is energy, not warmth, so it counts for less.
  if (/!{2,}/.test(value)) score += 0.5;
  return score;
}

export function computeToneSeries(messages = [], maxBuckets = 12) {
  const dated = messages.filter((message) => message.timestamp && message.sender);
  if (dated.length < 20) return null;

  const senders = [...new Set(dated.map((message) => message.sender))];
  if (senders.length < 2) return null;

  const times = dated.map((message) => new Date(message.timestamp).getTime()).filter((t) => !Number.isNaN(t));
  if (times.length < 20) return null;
  const first = Math.min(...times);
  const last = Math.max(...times);
  const span = Math.max(1, last - first);
  const bucketCount = Math.min(maxBuckets, Math.max(4, Math.round(span / DAY_MS / 14) || 4));
  const width = span / bucketCount;

  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    index,
    start: first + index * width,
    end: first + (index + 1) * width,
    bySender: new Map(senders.map((sender) => [sender, { total: 0, messages: 0 }])),
  }));

  dated.forEach((message) => {
    const time = new Date(message.timestamp).getTime();
    if (Number.isNaN(time)) return;
    const index = Math.min(bucketCount - 1, Math.floor((time - first) / width));
    const entry = buckets[index].bySender.get(message.sender);
    if (!entry) return;
    // rawBody, not message: `message` has been emoji-stripped by the parser,
    // so scoring it meant the emoji half of this signal never fired at all.
    entry.total += toneOf(message.rawBody ?? message.message);
    entry.messages += 1;
  });

  const people = senders.map((sender) => ({
    sender,
    points: buckets.map((bucket) => {
      const entry = bucket.bySender.get(sender);
      // Per-message average, then scaled. A bucket where someone sent three
      // messages is not evidence, so it reports null rather than a spike.
      const value = entry.messages >= 3 ? entry.total / entry.messages : null;
      return {
        index: bucket.index,
        label: prettyDate(new Date(bucket.start)),
        messages: entry.messages,
        // Clamped to -100..100. The raw range is roughly -2..2 per message.
        score: value === null ? null : Math.max(-100, Math.min(100, Math.round(value * 50))),
      };
    }),
  }));

  // A series where nobody ever cleared the evidence bar is noise, not a chart.
  const usable = people.some((person) => person.points.filter((point) => point.score !== null).length >= 3);
  if (!usable) return null;

  return {
    people,
    bucketCount,
    from: prettyDate(new Date(first)),
    to: prettyDate(new Date(last)),
  };
}

/* ------------------------------------------------------------------ *
 * Milestones
 *
 * The handful of dates that are genuinely notable in any long chat.
 * Deliberately date-and-count only — no quotes, nothing that says what
 * happened, because this survives the transcript.
 * ------------------------------------------------------------------ */
export function computeMilestones(messages = []) {
  const dated = messages
    .filter((message) => message.timestamp)
    .map((message) => new Date(message.timestamp))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a - b);

  if (dated.length < 10) return null;

  const perDay = new Map();
  dated.forEach((date) => {
    const key = isoDay(date);
    perDay.set(key, (perDay.get(key) || 0) + 1);
  });

  const days = [...perDay.keys()].sort();
  const busiest = [...perDay.entries()].sort((a, b) => b[1] - a[1])[0];

  // Longest run of consecutive calendar days with at least one message.
  let streak = 1;
  let bestStreak = 1;
  let bestStreakEnd = days[0];
  for (let i = 1; i < days.length; i += 1) {
    const gap = (new Date(days[i]) - new Date(days[i - 1])) / DAY_MS;
    if (Math.round(gap) === 1) {
      streak += 1;
      if (streak > bestStreak) {
        bestStreak = streak;
        bestStreakEnd = days[i];
      }
    } else {
      streak = 1;
    }
  }

  // Longest silence, measured between messages rather than between days so a
  // three-week gap reads as three weeks and not as twenty separate absences.
  let longestGap = 0;
  let gapFrom = null;
  let gapTo = null;
  for (let i = 1; i < dated.length; i += 1) {
    const gap = dated[i] - dated[i - 1];
    if (gap > longestGap) {
      longestGap = gap;
      gapFrom = dated[i - 1];
      gapTo = dated[i];
    }
  }

  const first = dated[0];
  const last = dated[dated.length - 1];
  const spanDays = Math.max(1, Math.round((last - first) / DAY_MS));

  return {
    first: { date: first.toISOString(), label: prettyDate(first) },
    last: { date: last.toISOString(), label: prettyDate(last) },
    spanDays,
    activeDays: days.length,
    activeShare: percent(days.length, spanDays),
    busiestDay: busiest ? { date: busiest[0], label: prettyDate(busiest[0]), count: busiest[1] } : null,
    longestStreak: { days: bestStreak, endedOn: prettyDate(bestStreakEnd) },
    longestSilence: longestGap > DAY_MS
      ? {
        days: Math.round(longestGap / DAY_MS),
        from: prettyDate(gapFrom),
        to: prettyDate(gapTo),
      }
      : null,
  };
}

/* ------------------------------------------------------------------ *
 * Quick stats
 *
 * The row of numbers people screenshot. Built from the other three so
 * there is one definition of "busiest day" in the product, not three
 * that disagree by a day.
 * ------------------------------------------------------------------ */
export function computeQuickStats({ messages = [], effort = null, milestones = null, emojis = [] } = {}) {
  const usable = messages.filter((message) => message.sender);
  if (!usable.length) return null;

  const words = usable.reduce(
    (sum, message) => sum + String(message.message || '').split(/\s+/).filter(Boolean).length,
    0,
  );

  const stats = [
    { key: 'messages', label: 'Messages', value: usable.length.toLocaleString() },
    { key: 'words', label: 'Words', value: words.toLocaleString() },
  ];

  if (milestones) {
    stats.push({ key: 'span', label: 'Days of history', value: milestones.spanDays.toLocaleString() });
    stats.push({
      key: 'perDay',
      label: 'Messages a day',
      value: String(Math.max(1, Math.round(usable.length / Math.max(1, milestones.activeDays)))),
      hint: 'On days you actually talked',
    });
    stats.push({
      key: 'streak',
      label: 'Longest streak',
      value: `${milestones.longestStreak.days} days`,
      hint: `Ended ${milestones.longestStreak.endedOn}`,
    });
    if (milestones.longestSilence) {
      stats.push({
        key: 'silence',
        label: 'Longest silence',
        value: `${milestones.longestSilence.days} days`,
        hint: `${milestones.longestSilence.from} → ${milestones.longestSilence.to}`,
      });
    }
    if (milestones.busiestDay) {
      stats.push({
        key: 'busiest',
        label: 'Busiest day',
        value: milestones.busiestDay.label,
        hint: `${milestones.busiestDay.count.toLocaleString()} messages`,
      });
    }
  }

  if (effort?.people?.length === 2) {
    const [lead] = effort.people;
    stats.push({
      key: 'share',
      label: 'Message share',
      value: `${lead.messageShare}% ${lead.sender}`,
      hint: 'Of everything sent',
    });
  }

  if (emojis?.length) {
    stats.push({ key: 'emoji', label: 'Most used emoji', value: emojis[0].emoji, hint: `${emojis[0].count} times` });
  }

  return stats;
}
