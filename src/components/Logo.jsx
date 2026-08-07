import { useId } from 'react';

// The mark.
//
// Two circles are two people in a conversation. Where they overlap, a lens
// appears — and that lens is the product: the thing that is only visible from
// where both sides meet, which is exactly what a third person can see and the
// two people inside it cannot. The dot at the centre is the self underneath,
// the part that stays constant across every relationship and that the
// matchmaking layer is eventually built on.
//
// It reads as an aperture at favicon size, which suits "AI that sees between
// the lines", and survives being rendered in one colour on a dark or light
// background.
//
// `useId` keeps the gradient and clip-path ids unique — two Logos on one page
// (header and footer) would otherwise share ids and the second would inherit
// the first's fill.

// `pupil` must match whatever sits behind the mark — it is a hole punched in
// the lens, not a dot drawn on top, so on a light surface it has to be light or
// it turns into a solid blob.
export default function Logo({ size = 28, withWordmark = false, className = '', pupil = '#ffffff' }) {
  const id = useId();
  const lensId = `lens-${id}`;
  const clipId = `clip-${id}`;

  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className="shrink-0"
      aria-hidden={withWordmark ? 'true' : undefined}
      role={withWordmark ? undefined : 'img'}
      aria-label={withWordmark ? undefined : 'ThirdPerson AI'}
    >
      <defs>
        <linearGradient id={lensId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5546d6" />
          <stop offset="55%" stopColor="#8d3fc0" />
          <stop offset="100%" stopColor="#c62a63" />
        </linearGradient>
        <clipPath id={clipId}>
          <circle cx="24" cy="32" r="17" />
        </clipPath>
      </defs>
      <circle cx="24" cy="32" r="17" fill="none" stroke="#5546d6" strokeWidth="2.4" opacity="0.85" />
      <circle cx="40" cy="32" r="17" fill="none" stroke="#c62a63" strokeWidth="2.4" opacity="0.85" />
      <g clipPath={`url(#${clipId})`}>
        <circle cx="40" cy="32" r="17" fill={`url(#${lensId})`} />
      </g>
      <circle cx="32" cy="32" r="3.4" fill={pupil} />
    </svg>
  );

  if (!withWordmark) return <span className={className}>{mark}</span>;

  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      {mark}
      <span className="whitespace-nowrap text-base font-semibold tracking-tight text-ink">
        ThirdPerson AI
      </span>
    </span>
  );
}
