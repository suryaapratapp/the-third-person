import { useMemo } from 'react';
import CardActions from './CardActions.jsx';
import TraitConstellation from './TraitConstellation.jsx';
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
// folded here — weighted by how much evidence each carried — rather than being
// summed into a running total in the database, so improving the maths later
// upgrades every existing profile without anyone re-running an analysis.
//
// The two ideas the page has to land:
//   1. There is a constant underneath, and here is its shape.
//   2. You are genuinely different depending on who you are with, and the size
//      of that difference is itself the interesting finding.
// Hence the constellation for (1) and the "shifts" badges for (2).

const CONFIDENCE_TONE = {
  'Strong Pattern': 'text-emerald-100 border-emerald-200/30 bg-emerald-300/10',
  'Repeated Pattern': 'text-violet-100 border-violet-200/30 bg-violet-300/10',
  'Early Signal': 'text-orange-100 border-orange-200/25 bg-orange-300/10',
  'Not Enough Evidence': 'text-ash border-white/12 bg-white/[0.04]',
};

function foldCards(cards) {
  return cards.reduce((acc, card) => accumulateTraits(acc, {
    scores: card.personalityScores.traits,
    relationshipType: card.personalityScores.relationshipType || card.relationshipType || 'unknown',
    messageCount: card.personalityScores.messageCount,
    parseConfidence: card.personalityScores.parseConfidence,
  }), emptyProfile());
}

function TraitRow({ trait, delta }) {
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
          {delta ? (
            <span className={`trait-delta w-9 font-mono text-xs tabular-nums ${delta > 0 ? 'text-emerald-100' : 'text-pink-100'}`}>
              {delta > 0 ? '+' : ''}{delta}
            </span>
          ) : <span className="w-9" aria-hidden="true" />}
        </div>
      </div>

      <div className="relative mt-2 h-1.5 rounded-full bg-white/10">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-300 to-pink-300 transition-[width] duration-700"
          style={{ width: `${score}%`, opacity: known ? 1 : 0.25 }}
        />
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
  const { view, archetype, contributing, deltas, worlds } = useMemo(() => {
    // Only cards carrying a fixed-taxonomy vector can be folded in; older cards
    // predate it and are skipped rather than guessed at.
    const usable = cards.filter((card) => card?.personalityScores?.traits);
    // Cards arrive newest-first, so fold oldest-first to accumulate in the
    // order the analyses actually happened.
    const chronological = [...usable].reverse();

    const current = foldCards(chronological);
    const currentView = profileView(current);

    // What the most recent analysis changed. Comparing "all but the last" to
    // "all" is what makes the profile feel alive after each new report.
    let change = {};
    if (chronological.length > 1) {
      const previousView = profileView(foldCards(chronological.slice(0, -1)));
      const before = Object.fromEntries(previousView.map((trait) => [trait.key, trait.score]));
      change = Object.fromEntries(currentView.map((trait) => {
        const diff = Math.round(trait.score - (before[trait.key] ?? trait.score));
        return [trait.key, diff];
      }).filter(([, diff]) => diff !== 0));
    }

    return {
      view: currentView,
      archetype: deriveArchetype(current),
      contributing: usable.length,
      deltas: change,
      worlds: new Set(chronological.map((card) => card.personalityScores.relationshipType || card.relationshipType)).size,
    };
  }, [cards]);

  const byKey = Object.fromEntries(view.map((trait) => [trait.key, trait]));
  const withEvidence = view.filter((trait) => trait.observations > 0).length;
  const movers = Object.entries(deltas)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 4);

  if (contributing === 0) {
    return (
      <section className="accent-panel hud-frame p-5 sm:p-8">
        <span className="hud-corner hud-corner-tl" aria-hidden="true" />
        <span className="hud-corner hud-corner-br" aria-hidden="true" />
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="tech-label text-violet-100">Core personality</p>
            <h2 className="serif-title mt-3 text-3xl leading-tight sm:text-4xl">Your constellation is empty.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-smoke">
              Each relationship you analyse adds one reading across fifteen traits. One chat sketches
              a rough shape; three or four across different kinds of relationship is where the
              constant underneath starts to show.
            </p>
          </div>
          <div className="opacity-30">
            <TraitConstellation view={[]} size={280} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="core-personality" className="accent-panel hud-frame relative overflow-hidden p-5 sm:p-8">
      <span className="hud-corner hud-corner-tl" aria-hidden="true" />
      <span className="hud-corner hud-corner-br" aria-hidden="true" />
      <CardActions targetId="core-personality" name="core-personality" summary={`${archetype.name} — ${archetype.blurb}`} />

      <div className="relative grid gap-8 lg:grid-cols-[1.05fr_auto] lg:items-center">
        <div>
          <p className="tech-label text-violet-100">Core personality</p>
          <h2 className="serif-title mt-3 text-4xl leading-[1.05] sm:text-6xl">{archetype.name}</h2>
          <p className="mt-4 max-w-xl text-base leading-8 text-smoke">{archetype.blurb}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="neon-chip">{contributing} {contributing === 1 ? 'relationship' : 'relationships'}</span>
            <span className="neon-chip">{worlds} {worlds === 1 ? 'world' : 'worlds'}</span>
            <span className="neon-chip">{withEvidence}/{view.length} traits</span>
            {!archetype.confident && <span className="neon-chip">still forming</span>}
          </div>

          {movers.length > 0 && (
            <div className="trait-delta mt-6 rounded-[22px] border border-violet-200/25 bg-violet-300/[0.07] p-4">
              <p className="tech-label text-violet-100">What your last analysis changed</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                {movers.map(([key, diff]) => (
                  <span key={key} className="font-mono text-sm text-bone">
                    {byKey[key]?.short || key}{' '}
                    <span className={diff > 0 ? 'text-emerald-100' : 'text-pink-100'}>
                      {diff > 0 ? '+' : ''}{diff}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="justify-self-center">
          <TraitConstellation view={view} size={340} />
        </div>
      </div>

      {/* Honesty rail. This page tells someone who they are, so the limits sit
          on the page rather than buried in a policy. */}
      <p className="relative mt-7 max-w-2xl text-xs leading-6 text-ash">
        Read from how you actually write, not from a questionnaire — which also means it only sees
        the relationships you have analysed. A score of 50 means those conversations did not show it
        either way, not that you sit in the middle. A dashed halo marks a trait that changes a lot
        depending on who you are with.
      </p>

      <div className="relative mt-8 grid gap-6 lg:grid-cols-3">
        {TRAIT_FAMILIES.map((family) => (
          <div key={family.key}>
            <h3 className="text-lg leading-6 text-bone">{family.label}</h3>
            <p className="mt-1 text-xs leading-5 text-ash">{family.blurb}</p>
            <div className="mt-2 divide-y divide-white/8">
              {family.traits.map((meta) => (
                <TraitRow key={meta.key} trait={byKey[meta.key]} delta={deltas[meta.key]} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
