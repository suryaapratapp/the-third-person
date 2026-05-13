const descriptions = {
  compatibility: 'Overall relational fit signalled by the sample.',
  communicationHealth: 'Clarity, responsiveness, and repair quality.',
  emotionalSafety: 'How safe the exchange appears for honesty.',
  effortBalance: 'Whether care and initiative seem reciprocal.',
  trustSignal: 'Language that may support reliability and openness.',
  conflictIntensity: 'Pressure, tension, and escalation signals.',
  clarity: 'How easy it is to understand intent and next steps.',
};

function labelFromKey(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}

function scoreTone(name, score) {
  const inverse = name === 'conflictIntensity';
  const good = inverse ? score <= 33 : score >= 70;
  const middle = inverse ? score <= 66 : score >= 45;
  if (good) return {
    bar: 'from-emerald-300 to-green-500',
    panel: 'border-emerald-300/20 bg-[radial-gradient(circle_at_20%_0%,rgba(52,211,153,0.10),transparent_16rem)]',
  };
  if (middle) return {
    bar: 'from-amber-200 to-orange-400',
    panel: 'border-orange-300/20 bg-[radial-gradient(circle_at_20%_0%,rgba(251,146,60,0.10),transparent_16rem)]',
  };
  return {
    bar: 'from-rose-300 to-red-500',
    panel: 'border-rose-300/20 bg-[radial-gradient(circle_at_20%_0%,rgba(244,63,94,0.10),transparent_16rem)]',
  };
}

export default function ScoreCard({ name, score }) {
  const tone = scoreTone(name, score);
  return (
    <div className={`thin-panel overflow-hidden p-5 ${tone.panel}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="tech-label text-smoke">{labelFromKey(name)}</p>
          <p className="mt-4 text-sm leading-6 text-ash">{descriptions[name]}</p>
        </div>
        <p className="font-mono text-3xl text-bone">{score}</p>
      </div>
      <div className="mt-6 h-1 bg-white/10">
        <div
          className={`h-1 bg-gradient-to-r ${tone.bar}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
