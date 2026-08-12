import { describe, expect, it } from 'vitest';
import {
  computeEmojiUsage,
  computeLocalMetrics,
  isEmojiCluster,
  messageBodiesFor,
} from '../conversationMetrics.js';

// The bug this file exists for: WhatsApp repeats the sender on every line, and
// people put an emoji in their display name. Counting the raw export made that
// emoji the "most used" one in almost every report from such a chat.
const RAW_EXPORT = [
  '[18/05/2022, 15:40:41] Surya 🚀: Gaaaaiinnzzzzz',
  '[18/05/2022, 15:41:02] Surya 🚀: gym done',
  '[18/05/2022, 15:42:11] Surya 🚀: legs tomorrow',
  '[18/05/2022, 15:43:00] Bittu: haha nice 😂',
  '[18/05/2022, 15:44:00] Bittu: proud of you 😂',
].join('\n');

const PARSED = [
  { timestamp: '2022-05-18T15:40:41Z', sender: 'Surya 🚀', message: 'Gaaaaiinnzzzzz', rawBody: 'Gaaaaiinnzzzzz' },
  { timestamp: '2022-05-18T15:41:02Z', sender: 'Surya 🚀', message: 'gym done', rawBody: 'gym done' },
  { timestamp: '2022-05-18T15:42:11Z', sender: 'Surya 🚀', message: 'legs tomorrow', rawBody: 'legs tomorrow' },
  { timestamp: '2022-05-18T15:43:00Z', sender: 'Bittu', message: 'haha nice', rawBody: 'haha nice 😂' },
  { timestamp: '2022-05-18T15:44:00Z', sender: 'Bittu', message: 'proud of you', rawBody: 'proud of you 😂' },
];

describe('emoji counting source', () => {
  it('would rank a name emoji first if given the raw export', () => {
    // Documents the old behaviour, so the regression is obvious if it returns.
    expect(computeEmojiUsage(RAW_EXPORT)[0].emoji).toBe('🚀');
  });

  it('ignores an emoji that only ever appears in the sender name', () => {
    const emojis = computeEmojiUsage(messageBodiesFor(PARSED, RAW_EXPORT));
    expect(emojis.map((entry) => entry.emoji)).not.toContain('🚀');
    expect(emojis[0].emoji).toBe('😂');
    expect(emojis[0].count).toBe(2);
  });

  it('still counts an emoji a person actually typed, name or not', () => {
    const messages = [...PARSED, { timestamp: '2022-05-18T15:45:00Z', sender: 'Surya 🚀', message: 'yes', rawBody: 'yes 🚀🚀' }];
    const emojis = computeEmojiUsage(messageBodiesFor(messages, RAW_EXPORT));
    expect(emojis.find((entry) => entry.emoji === '🚀').count).toBe(2);
  });

  it('falls back to the raw upload when no message body was parsed', () => {
    // The untimestamped-fallback path produces messages without rawBody. A
    // slightly wrong count beats no count at all.
    const noBodies = [{ sender: 'You', message: 'hi' }];
    expect(messageBodiesFor(noBodies, RAW_EXPORT)).toBe(RAW_EXPORT);
    expect(messageBodiesFor([], RAW_EXPORT)).toBe(RAW_EXPORT);
  });

  it('wires the body-only source through computeLocalMetrics', () => {
    const metrics = computeLocalMetrics({ messages: PARSED, rawText: RAW_EXPORT });
    expect(metrics.emojis.map((entry) => entry.emoji)).not.toContain('🚀');
  });
});

describe('emoji cluster detection', () => {
  it('rejects trademark and copyright symbols', () => {
    // These are Extended_Pictographic but are typed as punctuation. They were
    // beating real emoji to the top of the list on forwarded messages.
    expect(isEmojiCluster('™')).toBe(false);
    expect(isEmojiCluster('©')).toBe(false);
    expect(isEmojiCluster('®')).toBe(false);
  });

  it('accepts country flags, which are regional-indicator pairs', () => {
    expect(isEmojiCluster('🇮🇳')).toBe(true);
  });

  it('accepts keycaps, whose base is an ASCII digit', () => {
    expect(isEmojiCluster('1️⃣')).toBe(true);
  });

  it('accepts hearts, skin tones and ZWJ families as single clusters', () => {
    expect(isEmojiCluster('❤️')).toBe(true);
    expect(isEmojiCluster('👍🏽')).toBe(true);
    expect(isEmojiCluster('👨‍👩‍👧‍👦')).toBe(true);
  });

  it('keeps plain text out', () => {
    expect(isEmojiCluster('a')).toBe(false);
    expect(isEmojiCluster(' ')).toBe(false);
    expect(isEmojiCluster('')).toBe(false);
  });

  it('counts a flag through the full usage path', () => {
    const usage = computeEmojiUsage('proud 🇮🇳 today ™ ™ ™');
    expect(usage.map((entry) => entry.emoji)).toEqual(['🇮🇳']);
  });
});
