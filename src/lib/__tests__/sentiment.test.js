import { describe, expect, it } from 'vitest';
import { classifySentiment, computeSentimentProfile, sentimentOf } from '../sentiment.js';

const score = (text) => sentimentOf(text).compound;

describe('sentimentOf — VADER heuristics', () => {
  it('scores plain positive and negative statements', () => {
    expect(score('i love this')).toBeGreaterThan(0.3);
    expect(score('this is terrible')).toBeLessThan(-0.3);
    expect(score('ok')).toBe(0);
  });

  it('handles negation, which is what separates it from word counting', () => {
    expect(score('good')).toBeGreaterThan(0);
    expect(score('not good')).toBeLessThan(0);
    expect(score('i am not happy')).toBeLessThan(0);
    // Hindi negation too.
    expect(score('accha nahi hai')).toBeLessThan(score('accha hai'));
  });

  it('scales with intensifiers and dampens with downtoners', () => {
    expect(score('very good')).toBeGreaterThan(score('good'));
    expect(score('bahut sahi')).toBeGreaterThan(score('sahi'));
    expect(score('slightly good')).toBeLessThan(score('good'));
  });

  it('treats ALL CAPS as emphasis, but not when everything is caps', () => {
    expect(score('this is AMAZING')).toBeGreaterThan(score('this is amazing'));
    // A person who types entirely in caps is not shouting one word.
    expect(score('THIS IS AMAZING')).toBeCloseTo(score('this is amazing'), 1);
  });

  it('amplifies with exclamation marks', () => {
    expect(score('great!!!')).toBeGreaterThan(score('great'));
  });

  it('weights what comes after "but" over what comes before', () => {
    // The complaint is the point of the sentence, not the compliment.
    expect(score('i love you but you never call')).toBeLessThan(score('i love you'));
  });

  it('reads Hinglish, which upstream VADER has no lexicon for', () => {
    expect(score('bahut sahi yaar')).toBeGreaterThan(0.3);
    expect(score('bekar hai sab')).toBeLessThan(-0.2);
  });

  it('counts emoji valence', () => {
    expect(score('done 😂')).toBeGreaterThan(0);
    expect(score('done 😭')).toBeLessThan(0);
  });

  it('keeps affectionate insults near neutral by design', () => {
    // Between close friends these are warmth. Scoring them as profanity
    // mislabels the whole relationship.
    expect(Math.abs(score('bsdk kahan hai tu'))).toBeLessThan(0.2);
  });

  it('always returns a compound inside -1..1', () => {
    const extreme = 'love love love amazing perfect best wonderful!!!';
    expect(score(extreme)).toBeLessThanOrEqual(1);
    expect(score('hate awful terrible worst disgusting!!!')).toBeGreaterThanOrEqual(-1);
  });
});

describe('classifySentiment', () => {
  it('uses VADER cutoffs', () => {
    expect(classifySentiment(0.5)).toBe('positive');
    expect(classifySentiment(-0.5)).toBe('negative');
    expect(classifySentiment(0)).toBe('neutral');
  });
});

describe('computeSentimentProfile', () => {
  const build = (aText, bText, count = 20) => Array.from({ length: count * 2 }, (_, i) => ({
    sender: i % 2 ? 'Bo' : 'Ana',
    rawBody: i % 2 ? bText : aText,
    timestamp: new Date(2024, 0, 1 + Math.floor(i / 2)).toISOString(),
  }));

  it('returns null below the evidence floor or with one participant', () => {
    expect(computeSentimentProfile([])).toBeNull();
    const solo = Array.from({ length: 30 }, () => ({ sender: 'Ana', rawBody: 'hi' }));
    expect(computeSentimentProfile(solo)).toBeNull();
  });

  it('identifies the warmer person', () => {
    const profile = computeSentimentProfile(build('love you so much', 'whatever, busy'));
    expect(profile.warmerPerson).toBe('Ana');
    expect(profile.warmerBy).toBeGreaterThan(0);
  });

  it('reports shares, not just a mean', () => {
    // A mean near zero can be "all mild" or "half ecstatic, half furious" —
    // completely different relationships, so shares have to be separate.
    const profile = computeSentimentProfile(build('amazing perfect', 'awful terrible'));
    const ana = profile.people.find((p) => p.sender === 'Ana');
    expect(ana.positiveShare).toBeGreaterThan(90);
    expect(ana.negativeShare).toBe(0);
  });

  it('reports volatility separately from average', () => {
    const steady = computeSentimentProfile(build('good', 'good'));
    expect(steady.people[0].volatility).toBeCloseTo(0, 1);
  });
});
