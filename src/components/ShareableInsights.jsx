import CardActions from './CardActions.jsx';

function InfoCard({ title, children, accent = 'border-purple-300/15 bg-purple-300/[0.035]' }) {
  return (
    <div className={`border p-4 ${accent}`}>
      <p className="tech-label text-ash">{title}</p>
      <div className="mt-3 text-sm leading-7 text-smoke">{children}</div>
    </div>
  );
}

export default function ShareableInsights({ analysis, personName = 'Their' }) {
  const b = analysis.bestieBreakdown || {};
  const e = analysis.energyMatchScore || {};
  const m = analysis.mixedSignalsMap || {};
  const a = analysis.attachmentVibe || {};
  const friends = analysis.friendsWouldNotice || {};

  return (
    <div className="grid gap-5">
      <section id="card-bestie-breakdown" className="accent-panel relative p-5">
        <CardActions targetId="card-bestie-breakdown" name="relationship-breakdown" summary={b.whatItLooksLike} />
        <p className="tech-label text-pink-200">Relationship Breakdown</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard title="What it looks like">{b.whatItLooksLike}</InfoCard>
          <InfoCard title="What it may mean">{b.whatItMayMean}</InfoCard>
          <InfoCard title="Don’t ignore">{b.whatNotToIgnore}</InfoCard>
          <InfoCard title="What to do next">{b.whatToDoNext}</InfoCard>
        </div>
      </section>

      <section id="card-energy-match" className="thin-panel relative p-5">
        <CardActions targetId="card-energy-match" name="energy-match-score" summary={e.explanation} />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="tech-label text-orange-200">Energy Match Score ⚡</p>
            <h2 className="serif-title mt-2 text-5xl">{e.score || 0}/100</h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-smoke">{e.explanation}</p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-5">
          <InfoCard title="Your energy">{e.userEnergy}</InfoCard>
          <InfoCard title={`${personName}’s energy`}>{e.otherPersonEnergy}</InfoCard>
          <InfoCard title="Effort">{e.effortBalance}</InfoCard>
          <InfoCard title="Availability">{e.emotionalAvailability}</InfoCard>
          <InfoCard title="Consistency">{e.consistency}</InfoCard>
        </div>
      </section>

      <section id="card-mixed-signals" className="thin-panel relative p-5">
        <CardActions targetId="card-mixed-signals" name="mixed-signals-map" summary={m.bestieNote} />
        <p className="tech-label text-blue-200">Mixed Signals Map 🧭</p>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <InfoCard title="Warm signals">{(m.warmSignals || []).join(', ') || 'Not enough data'}</InfoCard>
          <InfoCard title="Distant signals">{(m.distantSignals || []).join(', ') || 'Not enough data'}</InfoCard>
          <InfoCard title="Confusing signals">{(m.confusingSignals || []).join(', ') || 'Not enough data'}</InfoCard>
          <InfoCard title="Stable signals">{(m.stableSignals || []).join(', ') || 'Not enough data'}</InfoCard>
        </div>
        <p className="mt-5 text-sm leading-7 text-smoke">{m.bestieNote}</p>
      </section>

      <section id="card-attachment-vibe" className="thin-panel relative p-5">
        <CardActions targetId="card-attachment-vibe" name="attachment-vibe" summary={a.dynamicCreated} />
        <p className="tech-label text-purple-200">Communication Pattern, Not a Label</p>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <InfoCard title="Your pattern">{a.userCommunicationVibe}</InfoCard>
          <InfoCard title={`${personName}’s pattern`}>{a.otherCommunicationVibe}</InfoCard>
          <InfoCard title="Dynamic created">{a.dynamicCreated}</InfoCard>
          <InfoCard title="Communicate better">{a.howToCommunicateBetter}</InfoCard>
        </div>
        <p className="mt-4 text-xs leading-6 text-ash">{a.disclaimer || 'This is a reflective read, not a fixed label.'}</p>
      </section>

      <section id="card-turning-points" className="thin-panel relative p-5">
        <CardActions targetId="card-turning-points" name="turning-points" summary={analysis.turningPoints?.[0]?.whatChanged} />
        <p className="tech-label text-orange-200">The Moment Things Changed</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {(analysis.turningPoints || []).map((point) => (
            <InfoCard key={`${point.period}-${point.title}`} title={`${point.period} • ${point.title}`}>
              <p>{point.whatChanged}</p>
              <p className="mt-2">{point.whyItMatters}</p>
              {point.quote && <p className="mt-2 font-mono text-bone">“{point.quote}”</p>}
            </InfoCard>
          ))}
        </div>
      </section>

      <section id="card-friends-would-notice" className="thin-panel relative p-5">
        <CardActions targetId="card-friends-would-notice" name="friends-would-notice" summary={friends.theyWouldNotice} />
        <p className="tech-label text-pink-200">What Your Friends Would Notice</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <InfoCard title="They would probably notice">{friends.theyWouldNotice}</InfoCard>
          <InfoCard title="They might warn you about">{friends.theyMightWarnYouAbout}</InfoCard>
          <InfoCard title="They might remind you">{friends.theyMightRemindYou}</InfoCard>
        </div>
      </section>

      <section id="card-screenshot-summary" className="accent-panel relative p-6 text-center">
        <CardActions targetId="card-screenshot-summary" name="screenshot-worthy-summary" summary={analysis.screenshotWorthySummary} />
        <p className="tech-label text-purple-200">Screenshot-Worthy Summary</p>
        <p className="serif-title mx-auto mt-5 max-w-4xl text-4xl leading-tight text-bone">{analysis.screenshotWorthySummary}</p>
      </section>
    </div>
  );
}
