import { useId } from 'react';

// The AI Relationship Coach's mascot.
//
// Brief: "a cute robo like Clippy with a heart". Clippy's whole trick was that
// it felt like a small helper watching over your shoulder — expressive eyes, a
// friendly tilt, a bit of personality. This is that idea as a floating robot
// whose antenna is a heart: a helper whose entire reason to exist is the
// relationship stuff.
//
// Three moods drive tiny state changes so it feels alive without a sprite
// sheet:
//   idle     — slow blink, gentle bob, steady heart pulse
//   thinking — eyes squint to a scanning line, antenna heart spins up
//   happy    — eyes become arcs, a brighter heart
// All motion is CSS (keyframes in styles.css) and is disabled under
// prefers-reduced-motion, so this degrades to a clean static mark.
//
// useId keeps gradient/glow ids unique when several bots share a page.

export default function CoachBot({ size = 96, mood = 'idle', className = '', float = true }) {
  const id = useId();
  const bodyGrad = `cb-body-${id}`;
  const faceGrad = `cb-face-${id}`;
  const heartGrad = `cb-heart-${id}`;
  const glow = `cb-glow-${id}`;

  const thinking = mood === 'thinking';
  const happy = mood === 'happy';

  return (
    <span
      className={`coachbot ${float ? 'coachbot-float' : ''} inline-block ${className}`}
      data-mood={mood}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="AI Relationship Coach">
        <defs>
          <linearGradient id={bodyGrad} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e8e2ff" />
            <stop offset="50%" stopColor="#c3b3ff" />
            <stop offset="100%" stopColor="#9d86f0" />
          </linearGradient>
          <linearGradient id={faceGrad} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#12101f" />
            <stop offset="100%" stopColor="#241d3a" />
          </linearGradient>
          <linearGradient id={heartGrad} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff9ecb" />
            <stop offset="100%" stopColor="#fb5f8f" />
          </linearGradient>
          <radialGradient id={glow} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Aura */}
        <circle cx="60" cy="62" r="52" fill={`url(#${glow})`} className="coachbot-aura" />

        {/*
          Antenna + heart. Position and animation are deliberately split
          across two nested groups: the outer <g> holds the SVG `transform`
          ATTRIBUTE that places the heart above the head, and the inner <g>
          carries the CSS pulse animation. A CSS `transform` (from an
          animation or any stylesheet rule) replaces an element's SVG
          `transform` attribute outright rather than composing with it — so
          putting the animation on the SAME <g> as `transform="translate(...)"`
          throws the translate away every frame and snaps the heart back to
          its raw path coordinates near the SVG's top-left corner, where it
          gets clipped by the SVG viewport edge. Keeping them on separate
          elements means neither transform ever overwrites the other.
        */}
        <line x1="60" y1="26" x2="60" y2="14" stroke="#c3b3ff" strokeWidth="2.4" strokeLinecap="round" />
        <g transform="translate(60 8)">
          <g className="coachbot-heart">
            <path
              d="M0 4.2 C -3.2 -1.4 -9 0.2 -9 5 C -9 8.8 -4.6 11.6 0 15 C 4.6 11.6 9 8.8 9 5 C 9 0.2 3.2 -1.4 0 4.2 Z"
              fill={`url(#${heartGrad})`}
              stroke="#ffd0e4"
              strokeWidth="0.8"
            />
          </g>
        </g>

        {/* Head shell */}
        <rect x="24" y="26" width="72" height="60" rx="24" fill={`url(#${bodyGrad})`} stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1.5" />
        {/* Ear pods */}
        <rect x="16" y="46" width="9" height="20" rx="4.5" fill="#c3b3ff" />
        <rect x="95" y="46" width="9" height="20" rx="4.5" fill="#c3b3ff" />

        {/* Face screen */}
        <rect x="33" y="35" width="54" height="42" rx="17" fill={`url(#${faceGrad})`} />
        <rect x="33" y="35" width="54" height="42" rx="17" fill="none" stroke="#a78bfa" strokeOpacity="0.4" strokeWidth="1" />

        {/* Eyes — swap by mood */}
        {thinking ? (
          <g className="coachbot-scan">
            <rect x="43" y="54" width="12" height="3" rx="1.5" fill="#8be9ff" />
            <rect x="65" y="54" width="12" height="3" rx="1.5" fill="#8be9ff" />
          </g>
        ) : happy ? (
          <g stroke="#8be9ff" strokeWidth="3.4" strokeLinecap="round" fill="none">
            <path d="M43 57 Q49 50 55 57" />
            <path d="M65 57 Q71 50 77 57" />
          </g>
        ) : (
          <g className="coachbot-eyes" fill="#8be9ff">
            <circle cx="49" cy="55" r="5.2" />
            <circle cx="71" cy="55" r="5.2" />
          </g>
        )}

        {/* Mouth */}
        {happy ? (
          <path d="M50 66 Q60 74 70 66" stroke="#8be9ff" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        ) : (
          <rect x="53" y="66" width="14" height="3" rx="1.5" fill="#8be9ff" opacity="0.7" />
        )}

        {/* Little cheek lights */}
        <circle cx="39" cy="63" r="2.2" fill="#fb7ba6" opacity="0.75" />
        <circle cx="81" cy="63" r="2.2" fill="#fb7ba6" opacity="0.75" />

        {/* Hovering base ring instead of feet */}
        <ellipse cx="60" cy="96" rx="22" ry="5" fill="#a78bfa" opacity="0.28" className="coachbot-shadow" />
      </svg>
    </span>
  );
}
