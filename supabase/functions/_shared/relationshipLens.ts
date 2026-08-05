// Relationship-type lenses.
//
// The same conversation means very different things depending on who the two
// people are. A daily "where are you?" is caring from a partner, controlling
// from a manager, and ordinary from a parent. Previously the prompt only
// injected a list of focus words, so reports drifted toward one generic
// romantic-ish reading regardless of the relationship.
//
// Each lens tells the model what this relationship IS, what healthy and
// concerning look like INSIDE it, and — just as importantly — which framings to
// avoid, so it does not, for example, treat normal parental involvement as
// pathology or read sibling bluntness as contempt.

export type RelationshipLens = {
  category: string;
  label: string;
  framing: string;
  healthy: string[];
  concerning: string[];
  avoid: string[];
  timelineFocus: string;
  focusWords: string[];
};

const LENSES: Record<string, RelationshipLens> = {
  romantic_committed: {
    category: 'romantic_committed',
    label: 'an established romantic relationship',
    framing: 'Two people with an ongoing romantic commitment. Both have standing to expect consistency, honesty and shared effort, and both are allowed to ask for more.',
    healthy: [
      'repair attempts after conflict, and whether they land',
      'reciprocal effort in planning, initiating and reassuring',
      'being able to raise a problem without it escalating',
      'affection that shows up in actions, not only words',
    ],
    concerning: [
      'one person consistently carrying initiation and emotional labour',
      'stonewalling, silent treatment, or shutting a topic down repeatedly',
      'promises that repeat without behaviour changing',
      'contempt, mockery or score-keeping during conflict',
    ],
    avoid: [
      'do not treat one bad week as the definition of the relationship',
      'do not tell them to leave or stay — surface the pattern and let them decide',
    ],
    timelineFocus: 'Phases should track how closeness, effort and conflict-repair evolved together.',
    focusWords: ['affection', 'effort balance', 'consistency', 'emotional availability', 'repair', 'commitment signals', 'clarity'],
  },
  romantic_early: {
    category: 'romantic_early',
    label: 'an early-stage romantic connection (crush, talking, early dating)',
    framing: 'Nothing is established yet. Neither person owes the other consistency, so the useful question is what the behaviour suggests about interest and intent — not whether they are a good partner.',
    healthy: [
      'interest that shows up on both sides without chasing',
      'plans that actually get made and kept',
      'curiosity — asking questions back',
    ],
    concerning: [
      'warmth that only appears late at night or when convenient',
      'attention that arrives in bursts and then disappears',
      'plans repeatedly floated but never confirmed',
    ],
    avoid: [
      'do not over-read a small sample — early chats carry limited evidence and you must say so',
      'do not encourage pursuing someone whose messages suggest disinterest; respect that a no can be quiet',
      'do not use heavy attachment or trauma language for a few weeks of texting',
    ],
    timelineFocus: 'Phases should track whether interest is building, plateauing, or fading.',
    focusWords: ['interest signals', 'initiation', 'consistency', 'mixed signals', 'hesitation', 'clarity'],
  },
  romantic_past: {
    category: 'romantic_past',
    label: 'a relationship with an ex-partner',
    framing: 'This connection has already ended at least once. The goal is understanding what happened and what remains — not restarting or ending it for them.',
    healthy: [
      'clear boundaries about what contact now means',
      'accountability from either side without blame spirals',
      'closure-seeking that is honest rather than a reopening tactic',
    ],
    concerning: [
      'repeating the exact loop that ended it before',
      'contact that spikes when one person is lonely and vanishes after',
      'guilt, jealousy or nostalgia used to pull the other back',
    ],
    avoid: [
      'never push reconciliation or no-contact as the right answer — present what the pattern shows',
      'do not encourage any contact the other person appears to have asked to stop',
    ],
    timelineFocus: 'Phases should separate the pre-breakup dynamic, the ending, and what the contact has become since.',
    focusWords: ['closure', 'boundaries', 'repeated patterns', 'unresolved conflict', 'emotional residue'],
  },
  friendship: {
    category: 'friendship',
    label: 'a friendship',
    framing: 'A voluntary bond with no formal commitment. It runs on reciprocity and showing up over time, and long gaps are normal in a way they are not for partners.',
    healthy: [
      'support that flows both ways over time, even if unevenly in any one week',
      'humour, ease, and being able to pick up after a gap',
      'showing up when it actually costs something',
    ],
    concerning: [
      'one person is always the listener and never the listened-to',
      'contact only when something is needed',
      'jokes that consistently land as digs',
    ],
    avoid: [
      'never use romantic or attachment framing for a friendship',
      'do not treat a quiet stretch as abandonment — friendships tolerate distance',
    ],
    timelineFocus: 'Phases should track closeness, reciprocity, and whether the friendship survived life changes.',
    focusWords: ['loyalty', 'reciprocity', 'support', 'check-ins', 'one-sided energy', 'trust', 'distance'],
  },
  family_parent: {
    category: 'family_parent',
    label: 'a parent–child relationship',
    framing: 'A lifelong, non-optional bond with built-in generational and cultural differences. Care and pressure often arrive in the same sentence, and involvement that would be controlling from a partner can be ordinary from a parent.',
    healthy: [
      'care expressed through practical concern, food, checking in',
      'the adult child being able to state a limit and it being heard, even imperfectly',
      'repair after friction, even without an explicit apology',
    ],
    concerning: [
      'guilt used repeatedly to direct decisions',
      'a limit stated clearly and then ignored again and again',
      'affection that becomes conditional on compliance',
    ],
    avoid: [
      'never diagnose a parent or use clinical labels like narcissist or toxic',
      'do not assume Western norms — in many families frequent involvement, advice and expectations are affection, not control',
      'do not advise cutting family off; suggest boundaries in a way that respects the relationship continuing',
    ],
    timelineFocus: 'Phases should track recurring friction themes and whether limits are being heard over time.',
    focusWords: ['care', 'expectations', 'pressure', 'guilt patterns', 'respect', 'boundaries', 'duty'],
  },
  family_sibling: {
    category: 'family_sibling',
    label: 'a sibling or close-family relationship',
    framing: 'A lifelong peer bond inside a family. Bluntness, teasing and long silences are often normal here and should not be read as hostility without stronger evidence.',
    healthy: [
      'easy honesty and shorthand',
      'showing up during family stress',
      'conflict that flares and resolves without lasting damage',
    ],
    concerning: [
      'comparison or favouritism becoming a running theme',
      'one sibling absorbing all the family responsibility',
      'old roles being enforced long past childhood',
    ],
    avoid: [
      'do not read blunt sibling banter as contempt without repeated, clear evidence',
      'never use romantic framing',
    ],
    timelineFocus: 'Phases should track shared family events and shifts in who carries responsibility.',
    focusWords: ['loyalty', 'family roles', 'responsibility', 'comparison', 'repair', 'boundaries'],
  },
  generic: {
    category: 'generic',
    label: 'a personal relationship',
    framing: 'The exact relationship type is unclear, so infer it from how the two people actually speak to each other before drawing conclusions, and say what you inferred.',
    healthy: ['mutual respect', 'reciprocal effort', 'the ability to raise a problem and repair'],
    concerning: ['one-sided effort', 'repeated avoidance of the same topic', 'disrespect that goes unaddressed'],
    avoid: ['do not assume romance — state the relationship you inferred and analyse on that basis'],
    timelineFocus: 'Phases should track how the tone and effort balance changed over time.',
    focusWords: ['emotional clarity', 'effort balance', 'communication style', 'trust', 'repair', 'boundaries'],
  },
};

export function lensFor(relationshipType = ''): RelationshipLens {
  const value = String(relationshipType || '').toLowerCase().trim();
  if (/\bex\b|ex-|ex /.test(value)) return LENSES.romantic_past;
  if (/crush|early stage|seeing each other|talking stage|dating/.test(value)) return LENSES.romantic_early;
  if (/partner|boyfriend|girlfriend|spouse|husband|wife|fiance/.test(value)) return LENSES.romantic_committed;
  if (/best friend|friend/.test(value)) return LENSES.friendship;
  if (/mom|mum|mother|dad|father|parent/.test(value)) return LENSES.family_parent;
  if (/brother|sister|sibling|cousin|family/.test(value)) return LENSES.family_sibling;
  return LENSES.generic;
}

// Rendered into the developer prompt so the model establishes WHAT this
// relationship is before it interprets anything inside it.
export function lensInstructions(relationshipType = ''): string {
  const lens = lensFor(relationshipType);
  return [
    `RELATIONSHIP CONTEXT — READ THIS BEFORE ANALYSING. The user selected "${relationshipType || 'Unspecified'}", which is ${lens.label}. ${lens.framing}`,
    `Interpret every message through that lens. The same behaviour means different things in different relationships, so anchor your reading to this one specifically and never produce analysis that would read identically for a different relationship type.`,
    `In this relationship, healthy looks like: ${lens.healthy.join('; ')}.`,
    `In this relationship, worth flagging: ${lens.concerning.join('; ')}.`,
    `Framings to avoid here: ${lens.avoid.join('; ')}.`,
    `Timeline emphasis: ${lens.timelineFocus}`,
    `Prioritise these dimensions: ${lens.focusWords.join(', ')}.`,
  ].join('\n');
}
