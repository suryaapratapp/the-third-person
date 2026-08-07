// Dev-only fixtures for inspecting the signed-in screens.
//
// Know Yourself renders nothing until several relationships have been analysed,
// which makes it the hardest page in the product to check for layout
// regressions — you would need real paid analyses across several relationship
// types just to see the populated state.
//
// These cards have the exact shape `relationship_personality_cards` rows take,
// so the page exercises the real accumulation path rather than a mock of it.
//
// Cannot reach production: guarded by import.meta.env.DEV, which Vite replaces
// with `false` at build time, so the whole module is dead-code-eliminated.
// Verified by grepping a production bundle for these names.

const vector = (overrides = {}) => ({
  openness: 55, conscientiousness: 62, extraversion: 48, agreeableness: 66,
  emotionalStability: 57, warmth: 68, directness: 44, reassuranceNeed: 60,
  conflictRepair: 58, autonomy: 42, humour: 66, curiosity: 54,
  vulnerability: 59, responsiveness: 70, expressiveness: 72, ...overrides,
});

// Deliberately spread across relationship types with contradicting readings,
// so the "shifts" badges and per-context spread actually have something to show
// — a fixture where every relationship looks the same would hide the bug where
// per-relationship breakdown silently collapses into the core score.
const RAW = [
  {
    id: 'preview-partner', relationshipType: 'Partner', otherPersonName: 'Riya',
    title: 'Your Personality With Partner', personalityLabel: 'Warm & All-In',
    shortSummary: 'You lead with warmth and stay in the room when things get hard.',
    traits: vector({ warmth: 88, reassuranceNeed: 78, vulnerability: 74, autonomy: 28, conflictRepair: 72 }),
    messageCount: 1400, parseConfidence: 'high',
  },
  {
    id: 'preview-mom', relationshipType: 'Mom', otherPersonName: 'Mom',
    title: 'Your Personality With Family', personalityLabel: 'Dutiful & Guarded',
    shortSummary: 'Warmth turns practical here, and you say less about how you actually feel.',
    traits: vector({ warmth: 34, vulnerability: 26, directness: 72, agreeableness: 44, humour: 38 }),
    messageCount: 620, parseConfidence: 'high',
  },
  {
    id: 'preview-friend', relationshipType: 'Friend', otherPersonName: 'Arjun',
    title: 'Your Personality With Friends', personalityLabel: 'The Funny One',
    shortSummary: 'Fastest replies, loudest jokes, least guarded.',
    traits: vector({ humour: 92, expressiveness: 86, extraversion: 74, responsiveness: 84, reassuranceNeed: 34 }),
    messageCount: 980, parseConfidence: 'high',
  },
  {
    id: 'preview-ex', relationshipType: 'Ex', otherPersonName: 'Sam',
    title: 'Your Personality With Ex', personalityLabel: 'Careful & Closing',
    shortSummary: 'More measured, slower to reply, holding a line you did not hold before.',
    traits: vector({ warmth: 46, autonomy: 70, directness: 66, responsiveness: 40, conflictRepair: 44 }),
    messageCount: 310, parseConfidence: 'medium',
  },
];

// Newest-first, matching how Supabase returns them.
export const PREVIEW_PERSONALITY_CARDS = RAW.slice().reverse().map((card) => ({
  id: card.id,
  relationshipType: card.relationshipType,
  otherPersonName: card.otherPersonName,
  title: card.title,
  shortSummary: card.shortSummary,
  personalityLabel: card.personalityLabel,
  personalityTypeSignal: 'Preview fixture',
  greenFlagsSummary: 'Shows up • Repairs after friction • Remembers detail',
  redFlagsSummary: 'Goes quiet when overwhelmed • Over-explains',
  communicationStyleSummary: 'Warm, fast, a little over-expressive.',
  emotionalSignatureSummary: 'Steady with people you trust.',
  keywords: ['Warm', 'Playful', 'Loyal'],
  confidenceLevel: 'Repeated Pattern',
  personalityScores: {
    display: null,
    traits: card.traits,
    relationshipType: card.relationshipType,
    messageCount: card.messageCount,
    parseConfidence: card.parseConfidence,
    taxonomyVersion: 1,
  },
}));
