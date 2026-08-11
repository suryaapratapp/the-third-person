import { useMemo } from 'react';

// One cloud per person, side by side.
//
// A single merged cloud is dominated by whoever typed more and says nothing
// about either person. Split by sender and the comparison IS the insight — one
// column full of "missed", "sorry", "busy" beside another full of "haha",
// "chal", "plan" tells you the shape of the relationship before you read a
// word of the report.
//
// Laid out as inline-flowing text rather than a packed spiral. A real spiral
// packer needs collision detection and per-word measurement, reflows on every
// resize, and on a 375px phone the small words end up unreadably rotated. Flow
// layout wraps naturally at any width, stays selectable and searchable, and
// costs nothing.

const STEPS = 7;

// Font sizes are assigned by RANK, not by raw count. Word frequency is
// Zipfian: the top word often occurs three times as often as the fifth, so
// scaling linearly by count makes one word enormous and flattens the rest into
// identical mush. Ranking spreads the sizes evenly across the tail.
const SIZE_REM = [2.35, 1.9, 1.55, 1.3, 1.1, 0.95, 0.82];
const WEIGHT = [700, 700, 650, 600, 550, 500, 500];
const OPACITY = [1, 1, 0.94, 0.86, 0.78, 0.68, 0.6];

function bucketFor(index, total) {
  if (total <= 1) return 0;
  return Math.min(STEPS - 1, Math.floor((index / total) * STEPS));
}

// Deterministic shuffle. A cloud in strict frequency order reads as a ranked
// list and looks like a bar chart in disguise; a random order looks like a
// cloud. Seeded so it does not reshuffle on every render.
function scatter(words, seed) {
  const out = [...words];
  let state = seed || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    state = (state * 1103515245 + 12345) % 2147483648;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function Cloud({ entry, color, seed }) {
  const laidOut = useMemo(() => {
    const words = entry.words || [];
    return scatter(words.map((word, index) => ({ ...word, bucket: bucketFor(index, words.length) })), seed);
  }, [entry, seed]);

  if (!laidOut.length) return null;

  return (
    <div className="rounded-lg border border-line bg-paper p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-sm font-semibold" style={{ color }}>
          {entry.sender}
        </h3>
        <p className="text-xs text-ash">{entry.messages.toLocaleString()} messages</p>
      </div>

      <p className="mt-3 flex flex-wrap items-baseline justify-center gap-x-2.5 gap-y-1 leading-tight">
        {laidOut.map((word) => (
          <span
            key={word.word}
            title={`${word.word} — ${word.count} times`}
            className="whitespace-nowrap transition-opacity hover:!opacity-100"
            style={{
              fontSize: `${SIZE_REM[word.bucket]}rem`,
              fontWeight: WEIGHT[word.bucket],
              opacity: OPACITY[word.bucket],
              // Top two buckets carry the person's colour, the rest are ink.
              // Colouring everything turns the cloud into a solid block; this
              // keeps the frequent words legible as the subject.
              color: word.bucket <= 1 ? color : 'var(--graphite)',
              letterSpacing: '-0.01em',
            }}
          >
            {word.word}
          </span>
        ))}
      </p>
    </div>
  );
}

export default function WordCloud({ bySender = [], colorFor }) {
  const usable = bySender.filter((entry) => entry?.words?.length);
  if (!usable.length) return null;

  return (
    <section aria-label="Most used words">
      <p className="tech-label">What each of you actually says</p>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {usable.slice(0, 2).map((entry, index) => (
          <Cloud
            key={entry.sender}
            entry={entry}
            color={colorFor(entry.sender)}
            seed={index + 7}
          />
        ))}
      </div>
      <p className="mt-2 text-xs leading-5 text-ash">
        Counted from the messages themselves, with filler words removed. Size is
        rank, not raw count.
      </p>
    </section>
  );
}
