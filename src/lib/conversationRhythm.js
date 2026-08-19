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
export function computeQuickStats({ messages = [], effort = null, milestones = null, emojis = [], calls = null, sentiment = null, burstiness = null } = {}) {
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

  // Calls get their own three cards. For a lot of relationships the calls ARE
  // the relationship, and a miss rate says something no message count can.
  if (calls) {
    stats.push({
      key: 'voiceCalls',
      label: 'Voice calls',
      value: calls.voice.toLocaleString(),
      hint: calls.missedVoice ? `${calls.missedVoice.toLocaleString()} missed` : 'None missed',
    });
    stats.push({
      key: 'videoCalls',
      label: 'Video calls',
      value: calls.video.toLocaleString(),
      hint: calls.missedVideo ? `${calls.missedVideo.toLocaleString()} missed` : 'None missed',
    });
    stats.push({
      key: 'missedCalls',
      label: 'Missed calls',
      value: calls.missed.toLocaleString(),
      hint: `${calls.missedShare}% of all calls`,
    });
  }

  if (burstiness) {
    stats.push({
      key: 'rhythmShape',
      label: 'Chat rhythm',
      value: burstiness.label,
      hint: `Longest run: ${burstiness.longestBurst} messages`,
    });
  }

  if (sentiment?.people?.length === 2) {
    const [lead] = sentiment.people;
    stats.push({
      key: 'positivity',
      label: `${lead.sender}'s tone`,
      value: `${lead.positiveShare}% positive`,
      hint: `${lead.negativeShare}% negative`,
    });
    stats.push({
      key: 'warmer',
      label: 'Warmer overall',
      value: sentiment.warmerPerson,
      hint: sentiment.warmerBy > 0.05 ? 'Clear difference' : 'Close between you',
    });
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

/* ------------------------------------------------------------------ *
 * Calls
 *
 * Counted from the RAW upload, deliberately, because the parser throws
 * call lines away: "missed voice call" and friends are on the media/
 * export noise list, so by the time messages exist every call has
 * already been filtered out as junk. They are not junk — for a lot of
 * relationships the calls ARE the relationship, and a chat that shows
 * 300 missed calls says something no message count can.
 *
 * Patterns cover the WhatsApp variants people actually export: iOS and
 * Android wording, the "‎" bidi marks WhatsApp injects, and the common
 * Hinglish/Hindi locale strings.
 * ------------------------------------------------------------------ */
const CALL_PATTERNS = {
  missedVoice: [
    /missed voice call/i,
    /voice call.*\bno answer\b/i,
    /छूटी हुई वॉइस कॉल/i,
  ],
  missedVideo: [
    /missed video call/i,
    /video call.*\bno answer\b/i,
    /छूटी हुई वीडियो कॉल/i,
  ],
  voice: [
    /\bvoice call\b/i,
    /वॉइस कॉल/i,
  ],
  video: [
    /\bvideo call\b/i,
    /वीडियो कॉल/i,
  ],
};

function matchesAny(line, patterns) {
  return patterns.some((pattern) => pattern.test(line));
}

export function computeCallStats(rawText = '') {
  const text = String(rawText || '');
  if (!text.trim()) return null;

  const stats = { voice: 0, video: 0, missedVoice: 0, missedVideo: 0 };

  text.split(/\r?\n/).forEach((rawLine) => {
    // WhatsApp wraps system lines in bidi marks; strip them or the anchored
    // patterns never match on an iOS export.
    const line = rawLine.replace(/[‎‏‪-‮]/g, '').trim();
    if (!line) return;

    // Missed is checked FIRST and returns: "Missed video call" also contains
    // "video call", so testing the general pattern first would count every
    // missed call twice — once as missed and once as connected.
    if (matchesAny(line, CALL_PATTERNS.missedVideo)) { stats.missedVideo += 1; return; }
    if (matchesAny(line, CALL_PATTERNS.missedVoice)) { stats.missedVoice += 1; return; }
    if (matchesAny(line, CALL_PATTERNS.video)) { stats.video += 1; return; }
    if (matchesAny(line, CALL_PATTERNS.voice)) { stats.voice += 1; }
  });

  const total = stats.voice + stats.video + stats.missedVoice + stats.missedVideo;
  if (!total) return null;

  const missed = stats.missedVoice + stats.missedVideo;
  return {
    ...stats,
    connected: stats.voice + stats.video,
    missed,
    total,
    // The number worth reading: a high miss rate is the thing people
    // recognise instantly about a drifting relationship.
    missedShare: percent(missed, total),
  };
}

/* ------------------------------------------------------------------ *
 * Burstiness
 *
 * Whether a chat trickles or erupts. Two relationships can send the
 * same number of messages over the same year and feel nothing alike:
 * one texts most days, the other goes quiet for a fortnight and then
 * talks until 3am. People recognise which one they are instantly, and
 * no message count shows it.
 *
 * Uses the standard burstiness parameter from network science,
 * B = (σ − μ) / (σ + μ) over inter-message intervals:
 *   B → −1  perfectly regular (a metronome)
 *   B ≈  0  random / Poisson, which is what "normal" looks like
 *   B → +1  highly bursty (long silences, then floods)
 * ------------------------------------------------------------------ */
const BURST_GAP_MINUTES = 45; // within this, messages belong to one burst

export function computeBurstiness(messages = []) {
  const times = messages
    .map((message) => (message?.timestamp ? new Date(message.timestamp).getTime() : null))
    .filter((time) => time && !Number.isNaN(time))
    .sort((a, b) => a - b);
  if (times.length < 30) return null;

  const gaps = [];
  for (let i = 1; i < times.length; i += 1) {
    const gap = times[i] - times[i - 1];
    if (gap > 0) gaps.push(gap);
  }
  if (gaps.length < 20) return null;

  const mean = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  const variance = gaps.reduce((sum, gap) => sum + (gap - mean) ** 2, 0) / gaps.length;
  const sd = Math.sqrt(variance);
  const burstiness = (sd + mean) === 0 ? 0 : (sd - mean) / (sd + mean);

  // Bursts: runs of messages with no long pause between them.
  const bursts = [];
  let current = 1;
  for (let i = 1; i < times.length; i += 1) {
    if (times[i] - times[i - 1] <= BURST_GAP_MINUTES * 60000) {
      current += 1;
    } else {
      bursts.push(current);
      current = 1;
    }
  }
  bursts.push(current);

  const longest = Math.max(...bursts);
  const longestIndex = bursts.indexOf(longest);
  // Walk forward to the start of that burst so it can be dated.
  let seen = 0;
  for (let i = 0; i < longestIndex; i += 1) seen += bursts[i];
  const longestStart = times[Math.min(seen, times.length - 1)];

  const label = burstiness > 0.45
    ? 'Bursty'
    : burstiness > 0.15
      ? 'Uneven'
      : burstiness > -0.15
        ? 'Natural'
        : 'Steady';

  const reading = {
    Bursty: 'Long silences, then everything at once. This chat happens in floods.',
    Uneven: 'Quiet stretches broken by busy days, more than a steady rhythm.',
    Natural: 'The usual shape for a chat — busier some days, no strong pattern.',
    Steady: 'Unusually regular. You two talk at close to the same rate throughout.',
  }[label];

  return {
    burstiness: Math.round(burstiness * 100) / 100,
    label,
    reading,
    bursts: bursts.length,
    longestBurst: longest,
    longestBurstOn: prettyDate(new Date(longestStart)),
    medianGapMinutes: Math.round(gaps.slice().sort((a, b) => a - b)[Math.floor(gaps.length / 2)] / 60000),
  };
}
