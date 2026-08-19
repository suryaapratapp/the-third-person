import { describe, expect, it } from 'vitest';
import {
  computeBurstiness,
  computeCallStats,
  computeMilestones,
  computeQuickStats,
  computeRhythm,
} from '../conversationRhythm.js';

// 2024-01-01 was a Monday, which makes the day-index assertions readable.
const MONDAY = '2024-01-01';

function at(day, hour, minute = 0) {
  return new Date(2024, 0, day, hour, minute).toISOString();
}

function messagesAt(spec) {
  return spec.map(([day, hour, sender, text = 'hello there']) => ({
    timestamp: at(day, hour),
    sender,
    message: text,
  }));
}

describe('computeRhythm', () => {
  it('returns null below the evidence floor', () => {
    expect(computeRhythm([])).toBeNull();
    expect(computeRhythm(messagesAt([[1, 9, 'Ana'], [1, 10, 'Bo']]))).toBeNull();
  });

  it('buckets messages by weekday and hour with Monday first', () => {
    // 12 messages, all Monday 1 Jan at 22:00.
    const messages = Array.from({ length: 12 }, () => ({
      timestamp: at(1, 22),
      sender: 'Ana',
      message: 'hi',
    }));
    const rhythm = computeRhythm(messages);
    expect(rhythm.grid[0][22]).toBe(12);
    expect(rhythm.peakCell).toEqual({ day: 0, hour: 22, count: 12 });
    expect(rhythm.peakLabel).toBe('Mon around 10pm');
    expect(rhythm.busiestDayLabel).toBe('Mon');
  });

  it('reports weekend and late-night share', () => {
    // 6 and 7 Jan 2024 are Saturday and Sunday.
    const weekend = Array.from({ length: 10 }, () => ({ timestamp: at(6, 14), sender: 'Ana', message: 'x' }));
    const weekday = Array.from({ length: 10 }, () => ({ timestamp: at(3, 14), sender: 'Bo', message: 'x' }));
    expect(computeRhythm([...weekend, ...weekday]).weekendShare).toBe(50);

    const lateNight = Array.from({ length: 10 }, () => ({ timestamp: at(3, 2), sender: 'Ana', message: 'x' }));
    const daytime = Array.from({ length: 30 }, () => ({ timestamp: at(3, 14), sender: 'Bo', message: 'x' }));
    expect(computeRhythm([...lateNight, ...daytime]).lateNightShare).toBe(25);
  });

  it('counts the 11pm hour as late night', () => {
    const messages = Array.from({ length: 20 }, () => ({ timestamp: at(3, 23), sender: 'Ana', message: 'x' }));
    expect(computeRhythm(messages).lateNightShare).toBe(100);
  });
});

describe('computeMilestones', () => {
  it('returns null below the evidence floor', () => {
    expect(computeMilestones(messagesAt([[1, 9, 'Ana']]))).toBeNull();
  });

  it('finds the longest consecutive-day streak', () => {
    // Days 1-5 then a jump to day 20.
    const messages = [];
    [1, 2, 3, 4, 5, 20].forEach((day) => {
      for (let i = 0; i < 3; i += 1) messages.push({ timestamp: at(day, 10 + i), sender: 'Ana', message: 'x' });
    });
    const milestones = computeMilestones(messages);
    expect(milestones.longestStreak.days).toBe(5);
    expect(milestones.activeDays).toBe(6);
  });

  it('measures the longest silence between messages, not between days', () => {
    const messages = [];
    [1, 2, 25].forEach((day) => {
      for (let i = 0; i < 4; i += 1) messages.push({ timestamp: at(day, 10 + i), sender: 'Ana', message: 'x' });
    });
    const milestones = computeMilestones(messages);
    expect(milestones.longestSilence.days).toBe(23);
  });

  it('has no longest silence when the chat never went quiet for a day', () => {
    const messages = [];
    for (let day = 1; day <= 6; day += 1) {
      for (let hour = 9; hour < 18; hour += 1) messages.push({ timestamp: at(day, hour), sender: 'Ana', message: 'x' });
    }
    expect(computeMilestones(messages).longestSilence).toBeNull();
  });

  it('picks the busiest calendar day by local time', () => {
    const messages = [];
    for (let i = 0; i < 4; i += 1) messages.push({ timestamp: at(1, 9 + i), sender: 'Ana', message: 'x' });
    for (let i = 0; i < 9; i += 1) messages.push({ timestamp: at(2, 9 + i), sender: 'Bo', message: 'x' });
    const milestones = computeMilestones(messages);
    expect(milestones.busiestDay.count).toBe(9);
    expect(milestones.busiestDay.date).toBe('2024-01-02');
  });

  it('keeps a late-evening message on its own local day', () => {
    // 23:30 local would roll into the next day under toISOString() east of UTC.
    const messages = Array.from({ length: 12 }, () => ({ timestamp: at(1, 23, 30), sender: 'Ana', message: 'x' }));
    expect(computeMilestones(messages).busiestDay.date).toBe(MONDAY);
  });
});

describe('computeQuickStats', () => {
  it('returns null with no usable messages', () => {
    expect(computeQuickStats({ messages: [] })).toBeNull();
  });

  it('reports messages a day against active days, not elapsed days', () => {
    const messages = [];
    // 20 messages across 2 active days, 100 days apart.
    for (let i = 0; i < 10; i += 1) messages.push({ timestamp: at(1, 9 + i), sender: 'Ana', message: 'a b c' });
    for (let i = 0; i < 10; i += 1) messages.push({ timestamp: at(100, 9 + i), sender: 'Bo', message: 'a b c' });
    const milestones = computeMilestones(messages);
    const stats = computeQuickStats({ messages, milestones });
    const perDay = stats.find((stat) => stat.key === 'perDay');
    expect(perDay.value).toBe('10');
  });

  it('counts words across every message', () => {
    const messages = Array.from({ length: 5 }, () => ({ timestamp: at(1, 9), sender: 'Ana', message: 'one two three' }));
    const stats = computeQuickStats({ messages });
    expect(stats.find((stat) => stat.key === 'words').value).toBe('15');
  });

  it('includes the top emoji when one exists', () => {
    const messages = [{ timestamp: at(1, 9), sender: 'Ana', message: 'hi' }];
    const stats = computeQuickStats({ messages, emojis: [{ emoji: '😂', count: 42, share: 30 }] });
    const emoji = stats.find((stat) => stat.key === 'emoji');
    expect(emoji.value).toBe('😂');
    expect(emoji.hint).toBe('42 times');
  });
});

describe('computeCallStats', () => {
  const raw = [
    '[05/05/2024, 14:00:00] Surya: Missed voice call',
    '[06/05/2024, 14:00:00] Manhar: Missed video call',
    '[07/05/2024, 14:00:00] Surya: Voice call, 12 min',
    '[08/05/2024, 14:00:00] Manhar: Video call, 3 min',
    // iOS exports wrap system lines in bidi marks.
    '‎[09/05/2024, 14:00:00] Surya: ‎Missed voice call',
    '[10/05/2024, 14:00:00] Surya: hey how are you',
  ].join('\n');

  it('returns null when the chat contains no calls', () => {
    expect(computeCallStats('')).toBeNull();
    expect(computeCallStats('[01/01/2024, 10:00:00] A: just talking')).toBeNull();
  });

  it('counts voice, video and missed separately', () => {
    const stats = computeCallStats(raw);
    expect(stats.missedVoice).toBe(2);
    expect(stats.missedVideo).toBe(1);
    expect(stats.voice).toBe(1);
    expect(stats.video).toBe(1);
  });

  it('never double-counts a missed call as a connected one', () => {
    // "Missed video call" also contains "video call"; testing the general
    // pattern first would count it twice.
    const stats = computeCallStats('[01/01/2024, 10:00:00] A: Missed video call');
    expect(stats.video).toBe(0);
    expect(stats.missedVideo).toBe(1);
    expect(stats.total).toBe(1);
  });

  it('reports the miss rate across all calls', () => {
    const stats = computeCallStats(raw);
    expect(stats.total).toBe(5);
    expect(stats.missed).toBe(3);
    expect(stats.missedShare).toBe(60);
  });
});

describe('computeBurstiness', () => {
  const at = (day, hour, minute = 0) => new Date(2024, 0, day, hour, minute).toISOString();

  it('returns null below the evidence floor', () => {
    expect(computeBurstiness([])).toBeNull();
    expect(computeBurstiness(Array.from({ length: 10 }, (_, i) => ({ timestamp: at(1, i) })))).toBeNull();
  });

  it('reports a perfectly regular chat as steady', () => {
    // One message every hour, no variation at all.
    const messages = Array.from({ length: 60 }, (_, i) => ({
      timestamp: at(1 + Math.floor(i / 24), i % 24),
    }));
    const result = computeBurstiness(messages);
    expect(result.burstiness).toBeLessThan(0);
    expect(['Steady', 'Natural']).toContain(result.label);
  });

  it('reports floods separated by silence as bursty', () => {
    // Three tight clusters, weeks apart — the shape people recognise as
    // "we go quiet then talk all night".
    const messages = [];
    [1, 20, 45].forEach((day) => {
      for (let i = 0; i < 20; i += 1) messages.push({ timestamp: at(day, 22, i) });
    });
    const result = computeBurstiness(messages);
    expect(result.burstiness).toBeGreaterThan(0.45);
    expect(result.label).toBe('Bursty');
  });

  it('counts the longest unbroken run of messages', () => {
    const messages = [];
    for (let i = 0; i < 25; i += 1) messages.push({ timestamp: at(1, 20, i) });   // one run
    for (let i = 0; i < 10; i += 1) messages.push({ timestamp: at(9, 20, i) });   // shorter
    const result = computeBurstiness(messages);
    expect(result.longestBurst).toBe(25);
    expect(result.bursts).toBe(2);
  });

  it('carries a plain-English reading for every label', () => {
    const messages = [];
    [1, 20, 45].forEach((day) => {
      for (let i = 0; i < 20; i += 1) messages.push({ timestamp: at(day, 22, i) });
    });
    expect(computeBurstiness(messages).reading).toMatch(/floods/);
  });
});
