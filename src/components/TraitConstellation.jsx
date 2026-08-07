import { useId } from 'react';
import { ALL_TRAITS } from '../lib/personalityTraits.js';

// The shape of a person, drawn as a constellation.
//
// Fifteen traits on fifteen axes. Radius carries the score, so the polygon IS
// the personality — two people can be compared at a glance long before any
// number is read, which is what the eventual matching screen needs.
//
// SVG rather than canvas: the geometry is computed (no hand-authored paths),
// the labels stay crisp at any size, and the whole thing is exportable as an
// image by the existing share tooling.
//
// Traits with no evidence are drawn dim and small rather than omitted. An
// absent axis would silently change the polygon's shape and make a thin profile
// look like a considered one — showing the gap is more honest than hiding it.

// The viewBox carries a deliberate margin around the chart: labels are drawn
// OUTSIDE the outer ring, so sizing the box to the ring clipped the left-hand
// ones ("Curious" rendered as "urious"). Widest label is ~9 characters at
// 10.5px mono, so LABEL_R must leave at least that much room inside CENTER.
const SIZE = 480;
const CENTER = SIZE / 2;
const INNER = 48;   // floor, so a 0 score is still visible rather than collapsing to a dot
const OUTER = 150;
const LABEL_R = 178;

const FAMILY_COLOR = {
  core: '#b3a0ff',
  relational: '#ff9ec4',
  expressive: '#8be9ff',
};

const pointFor = (index, count, radius) => {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2; // start at 12 o'clock
  return [CENTER + Math.cos(angle) * radius, CENTER + Math.sin(angle) * radius];
};

export default function TraitConstellation({ view = [], size = 340, showLabels = true }) {
  const id = useId();
  const glowId = `tc-glow-${id}`;
  const fillId = `tc-fill-${id}`;
  const count = ALL_TRAITS.length;

  const nodes = ALL_TRAITS.map((meta, index) => {
    const trait = view.find((item) => item.key === meta.key);
    const score = trait?.observations > 0 ? trait.score : 50;
    const known = (trait?.observations || 0) > 0;
    const radius = INNER + (score / 100) * (OUTER - INNER);
    const [x, y] = pointFor(index, count, radius);
    const [lx, ly] = pointFor(index, count, LABEL_R);
    return { ...meta, score, known, x, y, lx, ly, confidence: trait?.confidence, spread: trait?.spread };
  });

  const polygon = nodes.map((node) => `${node.x.toFixed(1)},${node.y.toFixed(1)}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={size}
      height={size}
      className="tc-root max-w-full"
      role="img"
      aria-label={`Personality constellation across ${count} traits`}
    >
      <defs>
        <radialGradient id={fillId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#b3a0ff" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#ff9ec4" stopOpacity="0.12" />
        </radialGradient>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Scale rings. The 50 ring is emphasised because 50 means "these
          conversations did not show it", not "average person". */}
      {[0.25, 0.5, 0.75, 1].map((step) => (
        <circle
          key={step}
          cx={CENTER}
          cy={CENTER}
          r={INNER + step * (OUTER - INNER)}
          fill="none"
          stroke="#8be9ff"
          strokeOpacity={step === 0.5 ? 0.22 : 0.09}
          strokeDasharray={step === 0.5 ? '3 4' : undefined}
        />
      ))}

      {/* Axes */}
      {nodes.map((node, index) => {
        const [ax, ay] = pointFor(index, count, OUTER);
        return (
          <line key={node.key} x1={CENTER} y1={CENTER} x2={ax} y2={ay} stroke="#ffffff" strokeOpacity="0.07" />
        );
      })}

      {/* The shape itself */}
      <polygon points={polygon} fill={`url(#${fillId})`} stroke="#c9b8ff" strokeOpacity="0.75" strokeWidth="1.6" className="tc-shape" />

      {/* Stars */}
      {nodes.map((node) => (
        <g key={node.key} className="tc-star" filter={node.known ? `url(#${glowId})` : undefined}>
          <circle
            cx={node.x}
            cy={node.y}
            r={node.known ? 4.2 : 2.4}
            fill={FAMILY_COLOR[node.family] || '#c9b8ff'}
            opacity={node.known ? 1 : 0.3}
          />
          {node.known && node.spread !== null && node.spread > 25 && (
            // A trait that swings a lot between relationships gets a halo: the
            // visual cue for "this depends on who you are with".
            <circle cx={node.x} cy={node.y} r="8.5" fill="none" stroke={FAMILY_COLOR[node.family]} strokeOpacity="0.4" strokeDasharray="2 3" />
          )}
        </g>
      ))}

      {showLabels && nodes.map((node) => {
        const anchor = Math.abs(node.lx - CENTER) < 12 ? 'middle' : node.lx > CENTER ? 'start' : 'end';
        return (
          <text
            key={node.key}
            x={node.lx}
            y={node.ly}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize="10.5"
            fontFamily="ui-monospace, monospace"
            letterSpacing="0.06em"
            fill={node.known ? '#ddd6ee' : '#6f6885'}
          >
            {node.short || node.label}
          </text>
        );
      })}
    </svg>
  );
}
