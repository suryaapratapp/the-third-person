import { describe, expect, it } from 'vitest';
import {
  TRAIT_KEYS,
  accumulateTraits,
  compatibilityBetween,
  contextSpread,
  deriveArchetype,
  emptyProfile,
  observationWeight,
  profileView,
  traitConfidence,
} from '../personalityTraits.js';

const analysis = (scores, extra = {}) => ({
  scores,
  relationshipType: 'partner',
  messageCount: 400,
  parseConfidence: 'high',
  ...extra,
});

describe('observationWeight', () => {
  it('gives a long history more weight than a handful of messages', () => {
    expect(observationWeight({ messageCount: 800, parseConfidence: 'high' }))
      .toBeGreaterThan(observationWeight({ messageCount: 30, parseConfidence: 'high' }));
  });

  it('discounts a badly parsed export so it cannot dominate the core self', () => {
    const clean = observationWeight({ messageCount: 400, parseConfidence: 'high' });
    const messy = observationWeight({ messageCount: 400, parseConfidence: 'low' });
    expect(messy).toBeLessThan(clean * 0.5);
  });

  it('saturates rather than growing without bound', () => {
    expect(observationWeight({ messageCount: 100000, parseConfidence: 'high' })).toBeLessThanOrEqual(1.4);
  });
});

describe('accumulateTraits', () => {
  it('starts every trait neutral with no evidence', () => {
    const view = profileView(emptyProfile());
    expect(view).toHaveLength(TRAIT_KEYS.length);
    expect(view.every((trait) => trait.score === 50 && trait.observations === 0)).toBe(true);
  });

  it('moves toward the observed score', () => {
    const next = accumulateTraits(emptyProfile(), analysis({ warmth: 90 }));
    expect(next.traits.warmth.score).toBeGreaterThan(50);
    expect(next.traits.warmth.observations).toBe(1);
  });

  it('lets later analyses refine rather than overwrite', () => {
    let profile = accumulateTraits(emptyProfile(), analysis({ warmth: 100 }));
    const afterFirst = profile.traits.warmth.score;
    profile = accumulateTraits(profile, analysis({ warmth: 0 }));
    // A contradicting second reading pulls toward the middle, not to zero.
    expect(profile.traits.warmth.score).toBeLessThan(afterFirst);
    expect(profile.traits.warmth.score).toBeGreaterThan(20);
  });

  it('converges — the tenth analysis moves the needle less than the second', () => {
    let profile = accumulateTraits(emptyProfile(), analysis({ warmth: 50 }));
    const before = profile.traits.warmth.score;
    profile = accumulateTraits(profile, analysis({ warmth: 90 }));
    const earlyJump = Math.abs(profile.traits.warmth.score - before);

    for (let i = 0; i < 8; i += 1) profile = accumulateTraits(profile, analysis({ warmth: 50 }));
    const settled = profile.traits.warmth.score;
    profile = accumulateTraits(profile, analysis({ warmth: 90 }));
    const lateJump = Math.abs(profile.traits.warmth.score - settled);

    expect(lateJump).toBeLessThan(earlyJump);
  });

  it('treats a missing trait as silence, not as a score of zero', () => {
    let profile = accumulateTraits(emptyProfile(), analysis({ warmth: 80 }));
    profile = accumulateTraits(profile, analysis({ humour: 70 })); // warmth absent
    expect(profile.traits.warmth.score).toBeGreaterThan(70);
    expect(profile.traits.warmth.observations).toBe(1);
  });

  it('never wipes accumulated evidence', () => {
    let profile = accumulateTraits(emptyProfile(), analysis({ warmth: 80 }));
    profile = accumulateTraits(profile, analysis({ warmth: 60 }));
    expect(profile.traits.warmth.observations).toBe(2);
    expect(profile.analyses).toBe(2);
  });

  it('resets cleanly if the stored taxonomy version is stale', () => {
    const stale = { version: 0, traits: { warmth: { score: 99, observations: 9, weight: 9, byRelationship: {} } } };
    const next = accumulateTraits(stale, analysis({ warmth: 10 }));
    expect(next.traits.warmth.observations).toBe(1);
    expect(next.version).toBe(1);
  });
});

describe('per-relationship breakdown', () => {
  it('keeps the core self separate from how someone is with one person', () => {
    let profile = accumulateTraits(emptyProfile(), analysis({ warmth: 90 }, { relationshipType: 'friend' }));
    profile = accumulateTraits(profile, analysis({ warmth: 20 }, { relationshipType: 'mom' }));

    expect(profile.traits.warmth.byRelationship.friend.score).toBeGreaterThan(80);
    expect(profile.traits.warmth.byRelationship.mom.score).toBeLessThan(30);
    // The core sits between the two contexts.
    const core = profile.traits.warmth.score;
    expect(core).toBeGreaterThan(30);
    expect(core).toBeLessThan(80);
  });

  it('reports the spread between contexts, and nothing when there is only one', () => {
    let profile = accumulateTraits(emptyProfile(), analysis({ warmth: 90 }, { relationshipType: 'friend' }));
    expect(contextSpread(profile, 'warmth')).toBeNull();
    profile = accumulateTraits(profile, analysis({ warmth: 20 }, { relationshipType: 'mom' }));
    expect(contextSpread(profile, 'warmth')).toBeGreaterThan(50);
  });
});

describe('traitConfidence', () => {
  it('never calls a single relationship a strong pattern', () => {
    expect(traitConfidence({ observations: 1, weight: 1.4, relationshipTypes: 1 })).toBe('Early Signal');
  });

  it('requires several relationship types before claiming a strong pattern', () => {
    expect(traitConfidence({ observations: 4, weight: 3, relationshipTypes: 3 })).toBe('Strong Pattern');
    expect(traitConfidence({ observations: 4, weight: 3, relationshipTypes: 1 })).toBe('Repeated Pattern');
  });

  it('says so plainly when there is nothing', () => {
    expect(traitConfidence({ observations: 0 })).toBe('Not Enough Evidence');
  });
});

describe('deriveArchetype', () => {
  it('refuses to type someone on almost no evidence', () => {
    const result = deriveArchetype(accumulateTraits(emptyProfile(), analysis({ warmth: 90 })));
    expect(result.confident).toBe(false);
    expect(result.name).toBe('Still Forming');
  });

  it('names an archetype once the profile is populated', () => {
    const full = Object.fromEntries(TRAIT_KEYS.map((key) => [key, 50]));
    const profile = accumulateTraits(emptyProfile(), analysis({ ...full, directness: 85 }));
    const result = deriveArchetype(profile);
    expect(result.confident).toBe(true);
    expect(result.name).toBe('The Straight Talker');
  });
});

describe('compatibilityBetween', () => {
  const profileWith = (overrides) => {
    const full = Object.fromEntries(TRAIT_KEYS.map((key) => [key, 50]));
    return accumulateTraits(emptyProfile(), analysis({ ...full, ...overrides }));
  };

  it('scores identical people high', () => {
    const a = profileWith({ warmth: 70, humour: 70 });
    expect(compatibilityBetween(a, a).score).toBeGreaterThan(80);
  });

  it('scores opposites lower than near-twins', () => {
    const a = profileWith({ openness: 95, conscientiousness: 95, humour: 95 });
    const b = profileWith({ openness: 5, conscientiousness: 5, humour: 5 });
    const twin = profileWith({ openness: 90, conscientiousness: 90, humour: 90 });
    expect(compatibilityBetween(a, b).score).toBeLessThan(compatibilityBetween(a, twin).score);
  });

  it('flags the pursue/withdraw pattern in either direction', () => {
    const seeker = profileWith({ reassuranceNeed: 95, autonomy: 20 });
    const distancer = profileWith({ reassuranceNeed: 20, autonomy: 95 });
    const result = compatibilityBetween(seeker, distancer);
    expect(result.pursueWithdrawRisk).toBeGreaterThan(0);
    expect(compatibilityBetween(distancer, seeker).pursueWithdrawRisk).toBe(result.pursueWithdrawRisk);
  });

  it('rewards two steady people over two volatile ones', () => {
    const steadyA = profileWith({ emotionalStability: 90 });
    const steadyB = profileWith({ emotionalStability: 88 });
    const volatileA = profileWith({ emotionalStability: 12 });
    const volatileB = profileWith({ emotionalStability: 10 });
    expect(compatibilityBetween(steadyA, steadyB).score)
      .toBeGreaterThan(compatibilityBetween(volatileA, volatileB).score);
  });

  it('always returns a score inside 0-100', () => {
    const extremeA = profileWith(Object.fromEntries(TRAIT_KEYS.map((k) => [k, 100])));
    const extremeB = profileWith(Object.fromEntries(TRAIT_KEYS.map((k) => [k, 0])));
    const result = compatibilityBetween(extremeA, extremeB);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
