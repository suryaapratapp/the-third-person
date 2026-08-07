import { useMemo, useState } from 'react';
import CardActions from './CardActions.jsx';
import TraitConstellation from './TraitConstellation.jsx';
import {
  TRAIT_FAMILIES,
  accumulateTraits,
  deriveArchetype,
  emptyProfile,
  profileView,
  shiftStory,
  standoutTraits,
  traitReading,
} from '../lib/personalityTraits.js';

// The accumulating core self.
//
// LAYOUT NOTE — this was rebuilt after measuring the phone version at 4.6
// screens of solid content with 18 separate sub-11px text elements. The problem
// was not spacing: it was showing all fifteen traits at equal weight, so a
// score of 52 (noise) occupied the same room as an 88 (the actual finding), and
// every row carried its own confidence chip.
//
// So the page now reads signal-first:
//   constellation + archetype  ->  what stands out  ->  what changed  ->
//   how you shift  ->  (opt-in) all fifteen, five at a time
//
// The full list is still one tap away — nothing was removed, it was ranked.

const CONFIDENCE_TONE = {
  'Strong Pattern': 'text-emerald-700 border-emerald-200 bg-emerald-50',
  'Repeated Pattern': 'text-violet-700 border-violet-200 bg-violet-50',
  'Early Signal': 'text-orange-700 border-orange-200 bg-orange-50',
  'Not Enough Evidence': 'text-ash border-line bg-paper',
};

const prettyRelationship = (value = '') => String(value)
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase());

function foldCards(cards) {
  return cards.reduce((acc, card) => accumulateTraits(acc, {
    scores: card.personalityScores.traits,
    relationshipType: card.personalityScores.relationshipType || card.relationshipType || 'unknown',
    messageCount: card.personalityScores.messageCount,
    parseConfidence: card.personalityScores.parseConfidence,
  }), emptyProfile());
}

function TraitBar({ trait, delta }) {
  const known = trait.observations > 0;
  const score = known ? trait.score : 50;
  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-[0.95rem] leading-6 text-bone">{trait.label}</h4>
        <div className="flex shrink-0 items-baseline gap-2">
          {delta ? (
            <span className={`font-mono text-xs tabular-nums ${delta > 0 ? 'text-emerald-700' : 'text-pink-700'}`}>
              {delta > 0 ? '+' : ''}{delta}
            </span>
          ) : null}
          <span className={`font-mono text-base tabular-nums ${known ? 'text-bone' : 'text-ash'}`}>
            {known ? Math.round(score) : '—'}
          </span>
        </div>
      </div>

      <div className="relative mt-2 h-1.5 rounded-full bg-well">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-signal transition-[width] duration-700"
          style={{ width: `${score}%`, opacity: known ? 1 : 0.25 }}
        />
        <span className="absolute inset-y-[-3px] left-1/2 w-px bg-well" aria-hidden="true" />
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-3 text-[0.68rem] leading-5 text-ash">
        <span>{trait.low}</span>
        {/* Confidence is only called out when it is weak. Labelling every row
            "Strong Pattern" was noise that made the thin ones harder to spot. */}
        {trait.confidence === 'Early Signal' && <span className="text-orange-700">thin evidence</span>}
        {trait.confidence === 'Not Enough Evidence' && <span>no data yet</span>}
        <span>{trait.high}</span>
      </div>
    </div>
  );
}

export default function CorePersonality({ cards = [] }) {
  const [showAll, setShowAll] = useState(false);
  const [family, setFamily] = useState(TRAIT_FAMILIES[0].key);

  const { view, archetype, contributing, deltas, worlds, standouts, shifts } = useMemo(() => {
    const usable = cards.filter((card) => card?.personalityScores?.traits);
    // Cards arrive newest-first; fold oldest-first so accumulation runs in the
    // order the analyses actually happened.
    const chronological = [...usable].reverse();
    const current = foldCards(chronological);
    const currentView = profileView(current);

    let change = {};
    if (chronological.length > 1) {
      const before = Object.fromEntries(
        profileView(foldCards(chronological.slice(0, -1))).map((trait) => [trait.key, trait.score]),
      );
      change = Object.fromEntries(
        currentView
          .map((trait) => [trait.key, Math.round(trait.score - (before[trait.key] ?? trait.score))])
          .filter(([, diff]) => diff !== 0),
      );
    }

    return {
      view: currentView,
      archetype: deriveArchetype(current),
      contributing: usable.length,
      deltas: change,
      worlds: new Set(chronological.map((c) => c.personalityScores.relationshipType || c.relationshipType)).size,
      standouts: standoutTraits(currentView, 4),
      shifts: shiftStory(currentView, 3),
    };
  }, [cards]);

  const byKey = Object.fromEntries(view.map((trait) => [trait.key, trait]));
  const movers = Object.entries(deltas).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 4);
  const activeFamily = TRAIT_FAMILIES.find((item) => item.key === family) || TRAIT_FAMILIES[0];

  if (contributing === 0) {
    return (
      <section className="accent-panel hud-frame p-5 sm:p-8">
        <span className="hud-corner hud-corner-tl" aria-hidden="true" />
        <span className="hud-corner hud-corner-br" aria-hidden="true" />
        <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="tech-label text-violet-700">Core personality</p>
            <h2 className="serif-title mt-3 text-3xl leading-tight">Your constellation is empty.</h2>
            <p className="mt-3 max-w-md text-sm leading-7 text-smoke">
              Each relationship you analyse adds one reading across fifteen traits. One chat sketches
              a shape; three or four across different kinds of relationship is where the constant
              underneath shows.
            </p>
          </div>
          <div className="justify-self-center opacity-25">
            <TraitConstellation view={[]} size={200} />
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

      {/* HERO — the constellation is the headline, not a decoration beside one.
          On a phone it sits above the name so the first thing seen is the shape. */}
      <div className="relative grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-10">
        <div className="justify-self-center">
          <TraitConstellation view={view} size={280} />
        </div>
        <div className="text-center lg:text-left">
          <p className="tech-label text-violet-700">Core personality</p>
          <h2 className="serif-title mt-2 text-4xl leading-[1.05] sm:text-5xl">{archetype.name}</h2>
          <p className="mt-3 text-base leading-7 text-smoke">{archetype.blurb}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 lg:justify-start">
            <span className="neon-chip">{contributing} {contributing === 1 ? 'relationship' : 'relationships'}</span>
            <span className="neon-chip">{worlds} {worlds === 1 ? 'world' : 'worlds'}</span>
            {!archetype.confident && <span className="neon-chip">still forming</span>}
          </div>
        </div>
      </div>

      {/* WHAT STANDS OUT — the payoff. Four sentences beat fifteen bars. */}
      {standouts.length > 0 && (
        <div className="relative mt-8">
          <h3 className="tech-label text-pink-700">What stands out</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {standouts.map((trait) => {
              const reading = traitReading(trait);
              return (
                <div key={trait.key} className="rounded-sm border border-line bg-paper p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h4 className="text-lg leading-6 text-bone">{reading.pole}</h4>
                    <span className="font-mono text-lg tabular-nums text-bone">{Math.round(trait.score)}</span>
                  </div>
                  {/* `trait.about` is a definition written for the legend, so
                      appending it here produced "…reads slightly playful. How
                      much play runs through the conversation." — a dictionary
                      entry glued to a personal statement. Where the trait swings
                      between relationships, that is the more interesting second
                      sentence anyway. */}
                  <p className="mt-1.5 text-sm leading-6 text-smoke">
                    Your <span className="text-bone">{trait.label.toLowerCase()}</span> reads {reading.strength} {reading.pole.toLowerCase()}.
                    {trait.spread !== null && trait.spread > 25
                      ? <> Though it moves a lot depending on who you are with.</>
                      : null}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* HOW YOU SHIFT — the thing a questionnaire cannot produce. */}
      {shifts.length > 0 && (
        <div className="relative mt-8 rounded-sm border border-pink-200 bg-pink-50 p-4 sm:p-5">
          <h3 className="tech-label text-pink-700">You are not the same with everyone</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {shifts.map((trait) => (
              <div key={trait.key}>
                <p className="text-base leading-6 text-bone">{trait.label}</p>
                <div className="mt-2 flex items-baseline gap-2 font-mono text-sm">
                  <span className="text-emerald-700">{Math.round(trait.highest.score)}</span>
                  <span className="text-ash">with {prettyRelationship(trait.highest.relationship)}</span>
                </div>
                <div className="mt-1 flex items-baseline gap-2 font-mono text-sm">
                  <span className="text-pink-700">{Math.round(trait.lowest.score)}</span>
                  <span className="text-ash">with {prettyRelationship(trait.lowest.relationship)}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-6 text-ash">
            That gap is not inconsistency. It is the part a personality quiz cannot see.
          </p>
        </div>
      )}

      {movers.length > 0 && (
        <div className="trait-delta relative mt-6 rounded-sm border border-violet-200 bg-violet-50 p-4">
          <h3 className="tech-label text-violet-700">What your last analysis changed</h3>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {movers.map(([key, diff]) => (
              <span key={key} className="font-mono text-sm text-bone">
                {byKey[key]?.short || key}{' '}
                <span className={diff > 0 ? 'text-emerald-700' : 'text-pink-700'}>
                  {diff > 0 ? '+' : ''}{diff}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ALL FIFTEEN — opt-in, and shown one family at a time so a phone gets
          five rows rather than fifteen. */}
      <div className="relative mt-8 border-t border-line pt-6">
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          aria-expanded={showAll}
          className="btn btn-ghost w-full text-xs sm:w-auto"
        >
          {showAll ? 'Hide all traits' : `See all ${view.length} traits`}
        </button>

        {showAll && (
          <div className="mt-5">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Trait families">
              {TRAIT_FAMILIES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={item.key === family}
                  onClick={() => setFamily(item.key)}
                  className={`min-h-[40px] rounded-sm border px-4 text-xs transition ${
                    item.key === family
                      ? 'border-violet-200 bg-violet-50 text-bone'
                      : 'border-line bg-paper text-smoke hover:text-bone'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <p className="mt-4 text-xs leading-6 text-ash">{activeFamily.blurb}</p>
            <div className="mt-1 divide-y divide-line">
              {activeFamily.traits.map((meta) => (
                <TraitBar key={meta.key} trait={byKey[meta.key]} delta={deltas[meta.key]} />
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {['Strong Pattern', 'Repeated Pattern', 'Early Signal'].map((level) => (
                <span key={level} className={`rounded-sm border px-2.5 py-1 text-xs ${CONFIDENCE_TONE[level]}`}>
                  {level}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="relative mt-6 text-xs leading-6 text-ash">
        Read from how you actually write, not a questionnaire — so it only sees the relationships
        you have analysed. A score of 50 means those conversations did not show it either way.
      </p>
    </section>
  );
}
