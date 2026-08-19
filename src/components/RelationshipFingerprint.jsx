import { useMemo } from 'react';

// A picture of the relationship, drawn from its own numbers.
//
// Not an AI image. An image model would cost real money per report, add
// 10-20 seconds, occasionally return something absurd in a paid product, and —
// the reason it is disqualified rather than merely expensive — require sending
// relationship detail to an image endpoint when the whole promise is that the
// conversation is discarded once the report exists.
//
// Everything here is computed from `localMetrics`, which is already on the
// device. Nothing leaves. It renders instantly, costs nothing, and is
// genuinely unique to the pair, because every mark is load-bearing:
//
//   outer ring segments  months of the chat, height = messages that month
//   the two arcs         message share, thickness = who spoke more
//   arc colour           each person's own colour, opacity = their positivity
//   radial spikes        bursts — long ones mean floods after silence
//   inner ring gaps      missed calls, as literal breaks in the circle
//   core size            compatibility
//   core ring            how steady the rhythm is
//
// Two people with identical message counts still get different pictures,
// because tone, rhythm and calls all move independently.

const SIZE = 420;
const CENTRE = SIZE / 2;
const TAU = Math.PI * 2;

const polar = (angle, radius) => [
  CENTRE + Math.cos(angle - Math.PI / 2) * radius,
  CENTRE + Math.sin(angle - Math.PI / 2) * radius,
];

function arcPath(from, to, radius) {
  const [x1, y1] = polar(from, radius);
  const [x2, y2] = polar(to, radius);
  const large = to - from > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
}

export default function RelationshipFingerprint({ metrics, colorFor, compatibility = 50 }) {
  const art = useMemo(() => {
    const effort = metrics?.effort;
    const people = effort?.people || [];
    if (people.length < 2) return null;

    const buckets = metrics?.activity?.buckets || [];
    const peak = Math.max(1, ...buckets.map((bucket) => bucket.count));
    const sentiment = metrics?.sentiment?.people || [];
    const calls = metrics?.calls;
    const burst = metrics?.burstiness;

    const sentimentFor = (sender) => sentiment.find((entry) => entry.sender === sender);

    return {
      people: people.slice(0, 2).map((person) => {
        const tone = sentimentFor(person.sender);
        return {
          sender: person.sender,
          share: Math.max(0.08, Math.min(0.92, (person.messageShare || 50) / 100)),
          // Positivity drives opacity, so a warm person's arc is solid and a
          // cool one's is faint — visible before any label is read.
          positivity: tone ? Math.max(0.28, Math.min(1, 0.35 + (tone.positiveShare / 100) * 0.75)) : 0.7,
        };
      }),
      months: buckets.map((bucket) => bucket.count / peak),
      // Burstiness sets how far the spikes reach. A steady chat has a smooth
      // rim; a bursty one throws long spokes.
      spikes: burst ? Math.max(0, Math.min(1, (burst.burstiness + 1) / 2)) : 0.5,
      burstCount: burst ? Math.min(48, burst.bursts) : 24,
      missedShare: calls ? Math.min(0.5, (calls.missedShare || 0) / 100) : 0,
      steady: burst ? burst.label : null,
    };
  }, [metrics]);

  if (!art) return null;

  const [first, second] = art.people;
  const firstColour = colorFor(first.sender);
  const secondColour = colorFor(second.sender);
  const split = first.share * TAU;
  const core = 34 + (Math.max(0, Math.min(100, compatibility)) / 100) * 26;

  return (
    <figure className="m-0">
      <div className="mx-auto max-w-[420px]">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-auto w-full"
          role="img"
          aria-label={`An abstract mark generated from this conversation: ${first.sender} and ${second.sender}, ${art.months.length} periods of history${art.steady ? `, ${art.steady.toLowerCase()} rhythm` : ''}.`}
        >
          <defs>
            <radialGradient id="fp-core">
              <stop offset="0%" stopColor={firstColour} stopOpacity="0.85" />
              <stop offset="100%" stopColor={secondColour} stopOpacity="0.55" />
            </radialGradient>
          </defs>

          {/* Months, as a ring of bars. The shape of the whole history in one
              glance: a long quiet stretch is visibly a flat run of stubs. */}
          {art.months.map((height, index) => {
            const angle = (index / Math.max(1, art.months.length)) * TAU;
            const inner = 150;
            const outer = inner + 14 + height * 44;
            const [x1, y1] = polar(angle, inner);
            const [x2, y2] = polar(angle, outer);
            return (
              <line
                key={index}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={index / art.months.length < first.share ? firstColour : secondColour}
                strokeWidth="3"
                strokeLinecap="round"
                opacity={0.25 + height * 0.6}
              />
            );
          })}

          {/* Burst spokes — fine hairlines, long when the chat runs in floods. */}
          {Array.from({ length: art.burstCount }).map((_, index) => {
            const angle = (index / art.burstCount) * TAU;
            const [x1, y1] = polar(angle, 108);
            const [x2, y2] = polar(angle, 108 + art.spikes * 34);
            return (
              <line key={`s${index}`} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={secondColour} strokeWidth="0.7" opacity="0.3" />
            );
          })}

          {/* The two arcs. Thickness is who spoke more; the gap between them
              is the split. */}
          <path d={arcPath(0.02, split - 0.04, 96)} fill="none" stroke={firstColour}
            strokeWidth={10 + first.share * 16} strokeLinecap="round" opacity={first.positivity} />
          <path d={arcPath(split + 0.04, TAU - 0.02, 96)} fill="none" stroke={secondColour}
            strokeWidth={10 + second.share * 16} strokeLinecap="round" opacity={second.positivity} />

          {/* Missed calls, as literal breaks in an inner ring. A relationship
              full of unanswered calls has a visibly broken circle. */}
          <circle cx={CENTRE} cy={CENTRE} r="74" fill="none" stroke="var(--line-strong)" strokeWidth="1.5"
            strokeDasharray={art.missedShare > 0 ? `${Math.max(3, 26 - art.missedShare * 44)} ${art.missedShare * 30}` : ''}
            opacity="0.8" />

          <circle cx={CENTRE} cy={CENTRE} r={core} fill="url(#fp-core)" />
          <circle cx={CENTRE} cy={CENTRE} r={core} fill="none" stroke="var(--paper)" strokeWidth="2" opacity="0.35" />
        </svg>
      </div>

      <figcaption className="mt-4 grid gap-2 text-xs leading-5 text-ash sm:grid-cols-2">
        <span><span className="font-medium text-ink">Outer bars</span> — messages per period</span>
        <span><span className="font-medium text-ink">Two arcs</span> — who spoke more, and how warmly</span>
        <span><span className="font-medium text-ink">Spokes</span> — how much it runs in bursts</span>
        <span><span className="font-medium text-ink">Broken ring</span> — missed calls</span>
      </figcaption>
    </figure>
  );
}
