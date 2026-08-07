// The trait engine behind Know Yourself — and, later, matchmaking.
//
// WHY A FIXED TAXONOMY
// --------------------
// The existing personality scores (humour, calmness, ego, patience…) were
// chosen ad hoc per report. That is fine for a one-off card and useless for
// matching: you cannot compute compatibility between two people unless both are
// scored on the SAME axes, with the same meaning, from the same scale. So the
// taxonomy is fixed and VERSIONED — when it changes, old vectors are not
// silently compared against new ones.
//
// WHAT IT MEASURES, HONESTLY
// --------------------------
// The five CORE traits are aligned to the Big Five, which is the only
// personality model with a serious research base. The rest are relational and
// expressive dimensions that are actually observable in written conversation.
//
// Being straight about the limits, because this product tells people who they
// are: a chat log is a sample of behaviour with one person, in one medium, at
// one time. Text-based inference of stable personality is directionally useful,
// not clinically valid. That is why every trait carries a confidence that rises
// only with accumulated evidence, and why the UI must never present a thin
// score as a fact. "Not enough evidence yet" is a real and expected answer.
//
// THE CORE-SELF IDEA
// ------------------
// People genuinely differ by relationship — warmer with a friend, guarded with
// a parent. So a single average would flatten the most interesting thing.
// Every trait therefore keeps BOTH a cross-relationship score (the core) and a
// per-relationship-type breakdown. The spread between them is `consistency`:
// how much someone shifts depending on who they are with. That spread is the
// product thesis made measurable.

export const TAXONOMY_VERSION = 1;

export const TRAIT_FAMILIES = [
  {
    key: 'core',
    label: 'Core Temperament',
    blurb: 'The five dimensions with the strongest research behind them.',
    traits: [
      { key: 'openness', label: 'Openness', short: 'Open', low: 'Grounded', high: 'Curious', about: 'Appetite for new ideas, plans and perspectives.' },
      { key: 'conscientiousness', label: 'Conscientiousness', short: 'Reliable', low: 'Spontaneous', high: 'Dependable', about: 'Follow-through — whether stated intentions become actions.' },
      { key: 'extraversion', label: 'Social Energy', short: 'Social', low: 'Reserved', high: 'Outgoing', about: 'How much they initiate, expand and drive conversation.' },
      { key: 'agreeableness', label: 'Agreeableness', short: 'Agreeable', low: 'Blunt', high: 'Accommodating', about: 'Warmth and willingness to yield in friction.' },
      { key: 'emotionalStability', label: 'Emotional Steadiness', short: 'Steady', low: 'Reactive', high: 'Steady', about: 'How evenly they hold under stress. Framed positively on purpose.' },
    ],
  },
  {
    key: 'relational',
    label: 'How You Relate',
    blurb: 'Patterns that shape what a relationship with you feels like.',
    traits: [
      { key: 'warmth', label: 'Warmth', short: 'Warm', low: 'Cool', high: 'Affectionate', about: 'How openly affection and appreciation get expressed.' },
      { key: 'directness', label: 'Directness', short: 'Direct', low: 'Hints', high: 'Says it plainly', about: 'Whether hard things are named or circled.' },
      { key: 'reassuranceNeed', label: 'Reassurance Need', short: 'Reassure', low: 'Self-settling', high: 'Seeks closeness', about: 'How much comfort is sought when things feel uncertain.' },
      { key: 'conflictRepair', label: 'Repair Instinct', short: 'Repair', low: 'Withdraws', high: 'Moves toward', about: 'What they do after friction — reach out, or go quiet.' },
      { key: 'autonomy', label: 'Need for Space', short: 'Space', low: 'Close-knit', high: 'Independent', about: 'How much separateness they need to feel comfortable.' },
    ],
  },
  {
    key: 'expressive',
    label: 'How You Come Across',
    blurb: 'The texture people actually notice in your messages.',
    traits: [
      { key: 'humour', label: 'Humour', short: 'Humour', low: 'Earnest', high: 'Playful', about: 'How much play runs through the conversation.' },
      { key: 'curiosity', label: 'Curiosity About Others', short: 'Curious', low: 'Tells', high: 'Asks', about: 'Whether questions come back the other way.' },
      { key: 'vulnerability', label: 'Openness About Feelings', short: 'Open Up', low: 'Guarded', high: 'Shares freely', about: 'Willingness to say what is actually going on inside.' },
      { key: 'responsiveness', label: 'Responsiveness', short: 'Replies', low: 'Takes time', high: 'Quick to reply', about: 'Attentiveness and pace of replying.' },
      { key: 'expressiveness', label: 'Expressiveness', short: 'Vivid', low: 'Spare', high: 'Vivid', about: 'Emoji, emphasis and length — how much colour is used.' },
    ],
  },
];

export const ALL_TRAITS = TRAIT_FAMILIES.flatMap((family) =>
  family.traits.map((trait) => ({ ...trait, family: family.key })));

export const TRAIT_KEYS = ALL_TRAITS.map((trait) => trait.key);

export function traitMeta(key) {
  return ALL_TRAITS.find((trait) => trait.key === key) || null;
}

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

// Weight of a single analysis.
//
// A 40-message crush chat should not move the profile as much as three years of
// history. Weight rises with volume but saturates — beyond a few hundred
// messages you are not learning proportionally more about the person — and is
// cut hard when the parser was unsure, so a badly-parsed export cannot quietly
// dominate someone's core self.
export function observationWeight({ messageCount = 0, parseConfidence = '' } = {}) {
  const volume = Math.log10(Math.max(10, Number(messageCount) || 0) / 10 + 1); // ~0 at 10 msgs, ~1.0 at 300
  const confidence = /high/i.test(parseConfidence) ? 1
    : /medium/i.test(parseConfidence) ? 0.7
      : /low/i.test(parseConfidence) ? 0.4
        : 0.85;
  return Number((clamp(volume, 0.15, 1.4) * confidence).toFixed(3));
}

// Confidence for a trait, driven by how much independent evidence backs it.
// Deliberately conservative: one analysis is never "strong", because one
// relationship is not a personality.
export function traitConfidence({ observations = 0, weight = 0, relationshipTypes = 0 } = {}) {
  if (observations === 0) return 'Not Enough Evidence';
  if (observations === 1 || weight < 0.8) return 'Early Signal';
  if (relationshipTypes >= 3 && weight >= 2.5) return 'Strong Pattern';
  if (observations >= 2 && weight >= 1.5) return 'Repeated Pattern';
  return 'Early Signal';
}

function emptyTrait() {
  return { score: 50, observations: 0, weight: 0, byRelationship: {} };
}

export function emptyProfile() {
  return {
    version: TAXONOMY_VERSION,
    traits: Object.fromEntries(TRAIT_KEYS.map((key) => [key, emptyTrait()])),
    analyses: 0,
  };
}

// Folds one analysis into the running profile.
//
// A weighted running mean, not a replace and not a naive average: early
// analyses move the profile a lot, later ones refine it, and nothing ever
// wipes accumulated evidence. This is what makes the numbers "change after
// every analysis" while still converging on something stable.
export function accumulateTraits(existing, observation = {}) {
  const base = existing && existing.version === TAXONOMY_VERSION && existing.traits
    ? { ...existing, traits: { ...existing.traits } }
    : emptyProfile();

  const { scores = {}, relationshipType = 'unknown', messageCount, parseConfidence } = observation;
  const weight = observationWeight({ messageCount, parseConfidence });

  for (const key of TRAIT_KEYS) {
    const incoming = Number(scores[key]);
    if (!Number.isFinite(incoming)) continue; // silence is not a score of 0

    const current = base.traits[key] || emptyTrait();
    const nextWeight = current.weight + weight;
    const nextScore = nextWeight > 0
      ? (current.score * current.weight + clamp(incoming) * weight) / nextWeight
      : clamp(incoming);

    // Per-relationship-type mean, kept separately so the core self can be told
    // apart from how someone is with one particular person.
    const bucket = current.byRelationship[relationshipType] || { score: 50, weight: 0 };
    const bucketWeight = bucket.weight + weight;
    const bucketScore = bucketWeight > 0
      ? (bucket.score * bucket.weight + clamp(incoming) * weight) / bucketWeight
      : clamp(incoming);

    base.traits[key] = {
      score: Number(nextScore.toFixed(1)),
      observations: current.observations + 1,
      weight: Number(nextWeight.toFixed(3)),
      byRelationship: {
        ...current.byRelationship,
        [relationshipType]: { score: Number(bucketScore.toFixed(1)), weight: Number(bucketWeight.toFixed(3)) },
      },
    };
  }

  base.analyses = (base.analyses || 0) + 1;
  base.version = TAXONOMY_VERSION;
  base.updatedAt = new Date().toISOString();
  return base;
}

// How much someone shifts between relationship contexts. High spread is not a
// flaw — it is the interesting finding, and the thing a quiz can never see.
export function contextSpread(profile, traitKey) {
  const trait = profile?.traits?.[traitKey];
  const buckets = Object.values(trait?.byRelationship || {});
  if (buckets.length < 2) return null;
  const scores = buckets.map((bucket) => bucket.score);
  return Number((Math.max(...scores) - Math.min(...scores)).toFixed(1));
}

export function profileView(profile) {
  const source = profile?.version === TAXONOMY_VERSION ? profile : emptyProfile();
  return ALL_TRAITS.map((meta) => {
    const trait = source.traits?.[meta.key] || emptyTrait();
    const relationshipTypes = Object.keys(trait.byRelationship || {}).length;
    return {
      ...meta,
      score: trait.score,
      observations: trait.observations,
      confidence: traitConfidence({ observations: trait.observations, weight: trait.weight, relationshipTypes }),
      spread: contextSpread(source, meta.key),
      byRelationship: trait.byRelationship || {},
    };
  });
}

// A shareable archetype derived from the trait vector.
//
// Deliberately NOT an MBTI-style four-letter code: those imply a validated
// typology this is not, and a made-up code borrowing that authority would be
// dishonest. This is a readable label built from whichever traits actually
// stand out, and it says so when nothing stands out yet.
const ARCHETYPES = [
  { name: 'The Steady Anchor', when: (t) => t.emotionalStability >= 65 && t.conflictRepair >= 60, blurb: 'You hold steady when things wobble, and you move toward repair instead of away from it.' },
  { name: 'The Warm Instigator', when: (t) => t.warmth >= 65 && t.extraversion >= 60, blurb: 'You start things and you start them warmly — people feel invited in.' },
  { name: 'The Quiet Deep End', when: (t) => t.vulnerability >= 60 && t.extraversion < 45, blurb: 'You do not say much, but what you do say goes straight to the real thing.' },
  { name: 'The Straight Talker', when: (t) => t.directness >= 68, blurb: 'You name what others circle. It costs you comfort and buys you clarity.' },
  { name: 'The Devoted Orbiter', when: (t) => t.reassuranceNeed >= 62 && t.warmth >= 55, blurb: 'You give a lot and you feel the distance early — closeness is where you settle.' },
  { name: 'The Free Signal', when: (t) => t.autonomy >= 65, blurb: 'You need room to stay yourself, and you are honest about needing it.' },
  { name: 'The Playful Mirror', when: (t) => t.humour >= 65 && t.curiosity >= 55, blurb: 'You keep it light and you keep asking — people talk more around you than they meant to.' },
  { name: 'The Careful Builder', when: (t) => t.conscientiousness >= 65, blurb: 'You follow through. What you say will happen tends to happen.' },
];

export function deriveArchetype(profile) {
  const view = profileView(profile);
  const scores = Object.fromEntries(view.map((trait) => [trait.key, trait.score]));
  const evidence = view.filter((trait) => trait.observations > 0).length;

  if (evidence < TRAIT_KEYS.length / 2) {
    return {
      name: 'Still Forming',
      blurb: 'One conversation is not a personality. Analyse a few more relationships and this sharpens fast.',
      confident: false,
    };
  }
  const match = ARCHETYPES.find((archetype) => archetype.when(scores));
  return match
    ? { name: match.name, blurb: match.blurb, confident: true }
    : { name: 'The Balanced Read', blurb: 'Nothing spikes — you adapt to whoever you are with rather than running one setting.', confident: true };
}

// COMPATIBILITY — the eventual matchmaking core.
//
// Weighted per trait rather than one blanket rule, because the research does not
// support a single answer. Similarity helps most on values and follow-through;
// steadiness is good in both people regardless of match; and the genuinely
// predictive friction is a mismatch between one person needing reassurance and
// the other needing space, which is why that pair is scored as a clash rather
// than as mere difference.
const SIMILARITY_WEIGHTS = {
  openness: 1.0, conscientiousness: 1.2, agreeableness: 0.8, extraversion: 0.5,
  humour: 1.0, warmth: 1.0, directness: 0.9, vulnerability: 0.7,
  curiosity: 0.6, expressiveness: 0.4, responsiveness: 0.5, conflictRepair: 1.1,
};

export function compatibilityBetween(profileA, profileB) {
  const a = Object.fromEntries(profileView(profileA).map((trait) => [trait.key, trait.score]));
  const b = Object.fromEntries(profileView(profileB).map((trait) => [trait.key, trait.score]));

  let weighted = 0;
  let total = 0;
  const drivers = [];
  for (const [key, weight] of Object.entries(SIMILARITY_WEIGHTS)) {
    const closeness = 100 - Math.abs(a[key] - b[key]); // 100 = identical
    weighted += closeness * weight;
    total += weight;
    drivers.push({ key, closeness: Number(closeness.toFixed(1)), weight });
  }
  let score = total > 0 ? weighted / total : 50;

  // Both steady is a genuine bonus; both volatile is a genuine risk.
  const steadiness = (a.emotionalStability + b.emotionalStability) / 2;
  score += (steadiness - 50) * 0.12;

  // The classic pursue/withdraw pattern: one seeks closeness while the other
  // needs space. Penalised in BOTH directions.
  // Fires when one person runs high on seeking closeness while the OTHER runs
  // high on needing space. Both orderings are checked, so it does not matter
  // which profile was passed first.
  const clash = Math.max(
    a.reassuranceNeed + b.autonomy - 100,
    b.reassuranceNeed + a.autonomy - 100,
  );
  if (clash > 0) score -= clash * 0.25;

  drivers.sort((x, y) => y.closeness * y.weight - x.closeness * x.weight);
  return {
    score: Math.round(clamp(score)),
    strongest: drivers.slice(0, 3).map((driver) => driver.key),
    weakest: drivers.slice(-3).reverse().map((driver) => driver.key),
    pursueWithdrawRisk: clash > 0 ? Math.round(clash) : 0,
  };
}
