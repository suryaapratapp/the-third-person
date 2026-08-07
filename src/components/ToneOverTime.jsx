// How warm each person's words looked, over time.
//
// Two lines, one per person, in the same two colours that person carries
// everywhere else in the report — so "who is who" is read once, not decoded
// from a legend on every chart.
//
// HONESTY: this is a word-and-emoji count, not sentiment analysis, and the
// caption says exactly that. It cannot detect sarcasm, it does not know what
// anyone meant, and a bucket with fewer than three messages reports nothing
// rather than inventing a spike. Overclaiming here would undermine the one
// thing the whole product sells, which is that its numbers are checkable.

const WIDTH = 720;
const HEIGHT = 200;
const PAD_X = 8;
const PAD_Y = 16;

function pointsFor(points) {
  const usable = points.filter((point) => point.score !== null);
  if (usable.length < 2) return [];
  const step = points.length > 1 ? (WIDTH - PAD_X * 2) / (points.length - 1) : 0;
  // Runs of nulls break the line rather than being interpolated across: a
  // straight segment over a month of silence would be a claim we cannot make.
  const runs = [];
  let run = [];
  points.forEach((point) => {
    if (point.score === null) {
      if (run.length) runs.push(run);
      run = [];
      return;
    }
    const x = PAD_X + point.index * step;
    const y = PAD_Y + ((100 - point.score) / 200) * (HEIGHT - PAD_Y * 2);
    run.push({ ...point, x, y });
  });
  if (run.length) runs.push(run);
  return runs.filter((segment) => segment.length > 1);
}

export default function ToneOverTime({ tone, colorFor }) {
  if (!tone?.people?.length) return null;

  const series = tone.people
    .map((person) => ({ ...person, runs: pointsFor(person.points) }))
    .filter((person) => person.runs.length);

  if (!series.length) return null;

  const midY = PAD_Y + (HEIGHT - PAD_Y * 2) / 2;

  return (
    <section aria-label="Warmth over time">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="tech-label">Warmth over time</p>
        <div className="flex items-center gap-3 text-xs">
          {series.map((person) => (
            <span key={person.sender} className="flex items-center gap-1.5 text-ash">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: colorFor(person.sender) }}
                aria-hidden="true"
              />
              {person.sender}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-line bg-paper p-3 sm:p-4">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Warmth of each person's words from ${tone.from} to ${tone.to}`}
          preserveAspectRatio="none"
        >
          {/* Neutral line. Above it the words skewed warm, below they skewed
              cold — the only reference the chart needs. */}
          <line x1={PAD_X} y1={midY} x2={WIDTH - PAD_X} y2={midY} stroke="var(--line-strong)" strokeWidth="1" strokeDasharray="4 4" />

          {series.map((person) => (
            <g key={person.sender}>
              {person.runs.map((run, index) => (
                <polyline
                  key={index}
                  points={run.map((point) => `${point.x},${point.y}`).join(' ')}
                  fill="none"
                  stroke={colorFor(person.sender)}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          ))}
        </svg>

        <div className="mt-2 flex items-center justify-between text-xs text-ash">
          <span>{tone.from}</span>
          <span>{tone.to}</span>
        </div>

        <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-ash">
          Counted from warm and cold words and emoji — not a read on what anyone
          meant. It cannot hear sarcasm, and stretches with too few messages to
          judge are left blank rather than guessed.
        </p>
      </div>
    </section>
  );
}
