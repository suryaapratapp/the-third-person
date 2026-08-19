import { describe, expect, it } from 'vitest';
import { prepareConversationForAnalysis } from '../conversationPreprocessor.js';

// A realistic WhatsApp export: real talk mixed with the lines the app writes
// on the user's behalf, plus links that the sensitive-data filter redacts.
const EXPORT = [
  '[01/05/2024, 09:00:00] Surya: Messages and calls are end-to-end encrypted. No one outside of this chat can read them.',
  '[01/05/2024, 09:01:00] Surya: dekho ye link https://example.com/deal bahut badhiya hai',
  '[01/05/2024, 09:02:00] Rajjo: haan bhej de mujhe https://another.example/thing',
  '[01/05/2024, 09:03:00] Surya: Voice call, 12 min',
  '[01/05/2024, 09:04:00] Rajjo: Missed video call',
  '[01/05/2024, 09:05:00] Surya: <Media omitted>',
  '[01/05/2024, 09:06:00] Rajjo: image omitted',
  '[01/05/2024, 09:07:00] Surya: Tap to learn more',
  '[01/05/2024, 09:08:00] Rajjo: This message was deleted',
  '[01/05/2024, 09:09:00] Surya: gym chalte hain shaam ko',
  '[01/05/2024, 09:10:00] Rajjo: haan bilkul chalte hain gym',
  '[01/05/2024, 09:11:00] Surya: gym ke baad khana khayenge',
  '[01/05/2024, 09:12:00] Rajjo: khana ghar pe hi banayenge',
].join('\n');

function words(prepared) {
  return (prepared.topWords || []).map((entry) => entry.word);
}

describe('word counts exclude export artefacts', () => {
  const prepared = prepareConversationForAnalysis(EXPORT, { platform: 'WhatsApp' });

  it('never surfaces the redaction tokens as vocabulary', () => {
    // `[URL_PROTECTED]` used to split into "url" and "protected", so any chat
    // with a few links had "protected" among its most-used words.
    expect(words(prepared)).not.toContain('protected');
    expect(words(prepared)).not.toContain('url');
  });

  it('never surfaces call-line words', () => {
    ['voice', 'video', 'missed', 'call'].forEach((word) => {
      expect(words(prepared)).not.toContain(word);
    });
  });

  it('never surfaces media, system or encryption words', () => {
    ['omitted', 'media', 'encrypted', 'deleted', 'tap', 'learn'].forEach((word) => {
      expect(words(prepared)).not.toContain(word);
    });
  });

  it('drops bare domains that a missed link would leak', () => {
    // One unredacted link puts its domain in the cloud once per share.
    expect(words(prepared)).not.toContain('example');
    expect(words(prepared)).not.toContain('another');
  });

  it('still counts what the people actually said', () => {
    // The whole point: filtering must not take the conversation with it.
    expect(words(prepared)).toContain('gym');
    expect(words(prepared)).toContain('khana');
  });

  it('applies the same filtering per person', () => {
    const perSender = prepared.topWordsBySender || [];
    const all = perSender.flatMap((entry) => entry.words.map((w) => w.word));
    ['protected', 'url', 'voice', 'video', 'omitted'].forEach((word) => {
      expect(all).not.toContain(word);
    });
  });
});
