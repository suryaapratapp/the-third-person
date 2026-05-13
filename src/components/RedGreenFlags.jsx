import CardActions from './CardActions.jsx';

export default function RedGreenFlags({ redFlags, greenFlags }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div id="card-red-flags" className="thin-panel relative p-5">
        <CardActions targetId="card-red-flags" name="red-flags" summary="Gentle red flag reflections from this conversation." />
        <p className="tech-label text-pink-200">Red Flags 🚩</p>
        <div className="mt-5 space-y-4">
          {redFlags.map((flag) => (
            <div key={flag.label || flag.title} className="border border-pink-300/15 bg-pink-300/[0.035] p-4">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-bone">{flag.label || flag.title}</h3>
                <span className="font-mono text-xs uppercase tracking-[0.12em] text-ash">{flag.severity}</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-smoke">{flag.explanation}</p>
              {flag.whyItMatters && <p className="mt-3 text-sm leading-7 text-smoke"><span className="text-pink-100">Why it may matter:</span> {flag.whyItMatters}</p>}
              {flag.reflectionQuestion && <p className="mt-3 text-sm leading-7 text-smoke"><span className="text-pink-100">Reflection:</span> {flag.reflectionQuestion}</p>}
            </div>
          ))}
        </div>
      </div>
      <div id="card-green-flags" className="thin-panel relative p-5">
        <CardActions targetId="card-green-flags" name="green-flags" summary="Green flag reflections from this conversation." />
        <p className="tech-label text-emerald-200">Green Flags 🟢</p>
        <div className="mt-5 space-y-4">
          {greenFlags.map((flag) => (
            <div key={flag.label || flag.title} className="border border-emerald-300/15 bg-emerald-300/[0.035] p-4">
              <h3 className="text-bone">{flag.label || flag.title}</h3>
              <p className="mt-3 text-sm leading-7 text-smoke">{flag.explanation}</p>
              {flag.whyItMatters && <p className="mt-3 text-sm leading-7 text-smoke"><span className="text-emerald-100">Why it may matter:</span> {flag.whyItMatters}</p>}
              {flag.howToBuildOnIt && <p className="mt-3 text-sm leading-7 text-smoke"><span className="text-emerald-100">Build on it:</span> {flag.howToBuildOnIt}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
