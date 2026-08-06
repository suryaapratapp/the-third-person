import { useMemo } from 'react';
import {
  TRAIT_FAMILIES,
  accumulateTraits,
  deriveArchetype,
  emptyProfile,
  profileView,
} from '../lib/personalityTraits.js';

// The accumulating core self.
//
// Every analysed relationship contributes one trait vector. Those vectors are
// folded here, weighted by how much evidence each carried, rather than being
// summed into a running total in the database — so improving the maths later
// upgrades every existing profile without anyone re-running an analysis.
//
// The spread badge is the point of the whole product: a quiz sees one version
// of you, this sees how far you move between your mother and your best friend,
// and treats the constant underneath as the real answer.

const CONFIDENCE_TONE = {
  'Strong Pattern': 'text-emerald-100 border-emerald-200/30 bg-emerald-300/10',
  'Repeated Pattern': 'text-violet-100 border-violet-200/30 bg-violet-300/10',
  'Early Signal': 'text-orange-100 border-orange-200/25 bg-orange-300/10',
  'Not Enough Evidence': 'text-ash border-white/12 bg-white/[0.04]',
};

function TraitRow({ trait }) {
  const known = trait.observations > 0;
  const score = known ? trait.score : 50;
  return (
    <div className="py-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h4 className="text-base leading-6 text-bone">{trait.label}</h4>
        <div className="flex items-center gap-2">
          {trait.spread !== null && trait.spread > 25 && (
            <span
              className="rounded-full border border-pink-200/30 bg-pink-300/10 px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.1em] text-pink-100"
              title="How far this shifts depending on who you are with"
            >
              shifts {Math.round(trait.spread)}
            </span>
          )}
          <span className={`rounded-full border px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.1em] ${CONFIDENCE_TONE[trait.confidence] || CONFIDENCE_TONE['Not Enough Evidence']}`}>
            {trait.confidence === 'Not Enough Evidence' ? 'no data' : trait.confidence}
          </span>
          <span className={`w-9 text-right font-mono text-base tabular-nums ${known ? 'text-bone' : 'text-ash'}`}>
            {known ? Math.round(score) : '—'}
          </span>
        </div>
      </div>

      <div className="relative mt-2 h-1.5 rounded-full bg-white/10">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-300 to-pink-300"
          style={{ width: `${score}%`, opacity: known ? 1 : 0.25 }}
        />
        {/* Midpoint marker: 50 means "this chat does not show it", not "average person". */}
        <span className="absolute inset-y-[-3px] left-1/2 w-px bg-white/25" aria-hidden="true" />
      </div>

      <div className="mt-1.5 flex justify-between font-mono text-[0.55rem] uppercase tracking-[0.1em] text-ash">
        <span>{trait.low}</span>
        <span>{trait.high}</span>
      </div>
    </div>
  );
}

export default function CorePersonality({ cards = [] }) {
  const { profile, contributing } = useMemo(() => {
    // Only cards carrying a fixed-taxonomy vector can be folded in. Older cards
    // predate it and are skipped rather than guessed at.
    const usable = cards.filter((card) => card?.personalityScores?.traits);
    const folded = usable.reduce((acc, card) => accumulateTraits(acc, {
      scores: card.personalityScores.traits,
      relationshipType: card.personalityScores.relationshipType || card.relationshipType || 'unknown',
      messageCount: card.personalityScores.messageCount,
      parseConfidence: card.personalityScores.parseConfidence,
    }), emptyProfile());
    return { profile: folded, contributing: usable.length };
  }, [cards]);

  const view = profileView(profile);
  const archetype = deriveArchetype(profile);
  const byKey = Object.fromEntries(view.map((trait) => [trait.key, trait]));

  if (contributing === 0) {
    return (
      <section className="accent-panel hud-frame p-5 sm:p-8">
        <span className="hud-corner hud-corner-tl" aria-hidden="true" />
        <span className="hud-corner hud-corner-br" aria-hidden="true" />
        <p className="tech-label text-violet-100">Core personality</p>
        <h2 className="serif-title mt-3 text-3xl leading-tight sm:text-4xl">Your traits start forming with your next analysis.</h2>
        <p className="mt-4 max-w-xl text-sm leading-7 text-smoke">
          Each relationship you analyse adds one reading to fifteen traits. One chat gives a rough
          sketch; three or four across different kinds of relationship is where the constant
          underneath starts to show.
        </p>
      </section>
    );
  }

  return (
    <section className="accent-panel hud-frame overflow-hidden p-5 sm:p-8">
      <span className="hud-corner hud-corner-tl" aria-hidden="true" />
      <span className="hud-corner hud-corner-br" aria-hidden="true" />

      <div className="relative">
        <p className="tech-label text-violet-100">Core personality</p>
        <h2 className="serif-title mt-3 text-4xl leading-tight sm:text-5xl">{archetype.name}</h2>
        <p className="mt-3 max-w-2xl text-base leading-8 text-smoke">{archetype.blurb}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="neon-chip">{contributing} {contributing === 1 ? 'relationship' : 'relationships'} read</span>
          <span className="neon-chip">{view.filter((t) => t.observations > 0).length} / {view.length} traits with evidence</span>
          {!archetype.confident && <span className="neon-chip">still forming</span>}
        </div>

        {/* Honesty rail. This page tells someone who they are, so the limits are
            stated on the page rather than buried in a policy. */}
        <p className="mt-5 max-w-2xl text-xs leading-6 text-ash">
          Read from how you actually write, not from a questionnaire — which also means it only sees
          the relationships you have analysed. A score of 50 means those conversations did not show
          it either way, not that you sit in the middle.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {TRAIT_FAMILIES.map((family) => (
            <div key={family.key}>
              <h3 className="text-lg leading-6 text-bone">{family.label}</h3>
              <p className="mt-1 text-xs leading-5 text-ash">{family.blurb}</p>
              <div className="mt-2 divide-y divide-white/8">
                {family.traits.map((meta) => (
                  <TraitRow key={meta.key} trait={byKey[meta.key]} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-7 text-xs leading-6 text-ash">
          A <span className="text-pink-100">shifts</span> badge means that trait changes a lot depending on
          who you are talking to. That gap is not inconsistency — it is the part a personality quiz
          can never see.
        </p>
      </div>
    </section>
  );
}
