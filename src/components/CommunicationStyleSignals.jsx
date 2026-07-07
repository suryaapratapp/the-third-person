import CardActions from './CardActions.jsx';

function PersonStyle({ title, data = {} }) {
  return (
    <div className="border border-white/10 bg-black/35 p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="tech-label text-purple-200">{title}</p>
        <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-smoke">{data.traitIntensity || 'medium'} signal</span>
      </div>
      <div className="mt-4 space-y-4 text-sm leading-7 text-smoke">
        <p><span className="text-bone">Processing:</span> {data.emotionalProcessingStyle}</p>
        <p><span className="text-bone">Social energy:</span> {data.socialEnergyPattern}</p>
        <p><span className="text-bone">Attention:</span> {(data.attentionStyleSignals || []).join(', ') || 'Not enough data'}</p>
        <p><span className="text-bone">Overwhelm signals:</span> {(data.possibleOverwhelmSignals || []).join(', ') || 'Not enough data'}</p>
        <p><span className="text-bone">Tips:</span> {(data.communicationTips || []).join(', ') || 'Not enough data'}</p>
      </div>
    </div>
  );
}

export default function CommunicationStyleSignals({ signals, personName = 'Their' }) {
  if (!signals) return null;
  return (
    <section id="card-communication-style-signals" className="thin-panel relative p-5">
      <CardActions targetId="card-communication-style-signals" name="communication-style-signals" summary={signals.disclaimer} />
      <p className="tech-label text-purple-200">Thinking & Communication Style</p>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-smoke">
        This is a reflective read, not a fixed label. It simply highlights communication traits that may affect how someone processes emotions, attention, routine, conflict, or social energy.
      </p>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <PersonStyle title="You" data={signals.user} />
        <PersonStyle title={`${personName}’s Style`} data={signals.otherPerson} />
      </div>
      <p className="mt-4 text-xs leading-6 text-ash">{signals.disclaimer}</p>
    </section>
  );
}
