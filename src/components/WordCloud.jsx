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

// Sizes come from each person's OWN top count, so the biggest word in a
// column is always their most-used one and the smallest is their least. A
// shared scale would size both columns against whoever typed more, which made
// the quieter person's cloud uniformly tiny.
const MIN_REM = 0.8;
const MAX_REM = 2.6;

// Square-root rather than linear. Word frequency is Zipfian — the top word can
// occur ten times as often as the tenth — so a linear scale makes one word
// enormous and crushes everything else to the floor. sqrt keeps the ordering
// exactly right while leaving the tail readable.
function sizeFor(count, top, floor) {
  if (top <= floor) return (MIN_REM + MAX_REM) / 2;
  const ratio = (Math.sqrt(count) - Math.sqrt(floor)) / (Math.sqrt(top) - Math.sqrt(floor));
  return MIN_REM + ratio * (MAX_REM - MIN_REM);
}

function Cloud({ entry, color }) {
  const words = (entry.words || []).slice(0, 44);
  if (words.length < 3) return null;

  const top = words[0].count;
  const floor = words[words.length - 1].count;

  return (
    <div className="rounded-lg border border-line bg-paper p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-sm font-semibold" style={{ color }}>{entry.sender}</h3>
        <p className="text-xs text-ash">{entry.messages.toLocaleString()} messages</p>
      </div>

      {/* Kept in rank order rather than shuffled. Shuffling looked more like a
          classic word cloud but made the size scale impossible to read: with
          the biggest word buried in the middle, nobody could tell whether size
          meant anything at all. Reading order now matches frequency order. */}
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5">
        {words.map((word, index) => {
          const rem = sizeFor(word.count, top, floor);
          return (
            <span
              key={word.word}
              title={`${word.word} — used ${word.count.toLocaleString()} times`}
              className="whitespace-nowrap leading-none"
              style={{
                fontSize: `${rem.toFixed(2)}rem`,
                // Weight and colour follow size, so the hierarchy reads even
                // in a screenshot where the tooltip is not available.
                fontWeight: rem > 1.9 ? 700 : rem > 1.3 ? 600 : 500,
                color: index < 6 ? color : 'var(--graphite)',
                opacity: index < 6 ? 1 : Math.max(0.55, rem / MAX_REM),
                letterSpacing: '-0.015em',
              }}
            >
              {word.word}
            </span>
          );
        })}
      </div>
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
        {usable.slice(0, 2).map((entry) => (
          <Cloud key={entry.sender} entry={entry} color={colorFor(entry.sender)} />
        ))}
      </div>
      <p className="mt-2 text-xs leading-5 text-ash">
        Counted from the messages themselves, with filler words removed. Biggest
        word is that person’s most-used one.
      </p>
    </section>
  );
}
