export default function UsageWarningModal({ status = 'warning', onContinue, onPlans, onBack }) {
  const copy = {
    warning: {
      title: 'Your free relationship insights are almost finished',
      body: 'You’re close to the end of your free analysis allowance. Upgrade to continue generating deeper Relationship Intelligence Summaries, ask more Bestie questions, and unlock stronger ThirdPerson POV insights.',
      primary: 'View Plans',
      secondary: 'Continue for now',
    },
    critical: {
      title: 'Your free demo is nearly complete',
      body: 'You have very little free analysis usage remaining. Upgrade to keep your Bestie chat active and continue creating detailed relationship reports with better intelligence.',
      primary: 'Upgrade ThirdPerson',
      secondary: 'Use remaining free access',
    },
    exhausted: {
      title: 'Your free relationship intelligence access has ended',
      body: 'You’ve used your available free analysis allowance. Upgrade to continue using Bestie Chat, Relationship Intelligence Summaries, Personality insights, and ThirdPerson POV guidance.',
      primary: 'See Paid Plans',
      secondary: 'Back to Reports',
    },
  }[status] || {
    title: 'Your free relationship insights are almost finished',
    body: 'Upgrade to continue generating deeper ThirdPerson POV insights.',
    primary: 'View Plans',
    secondary: 'Continue for now',
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 px-4 backdrop-blur-md">
      <div className="relative max-w-xl overflow-hidden rounded-[32px] border border-purple-200/25 bg-[#110d18] p-6 shadow-[0_0_80px_rgba(168,85,247,0.18)] sm:p-8">
        <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-pink-300/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-blue-300/12 blur-3xl" />
        <div className="relative">
          <p className="tech-label text-orange-200">ThirdPerson AI</p>
          <h2 className="serif-title mt-4 text-4xl leading-tight text-bone sm:text-5xl">{copy.title}</h2>
          <p className="mt-5 text-sm leading-8 text-smoke">{copy.body}</p>
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs leading-6 text-ash">
            Paid plans unlock higher-quality analysis, more Bestie messages, and deeper ThirdPerson POV insights.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button onClick={onPlans} className="rounded-full border border-purple-200/40 bg-purple-300/14 px-5 py-3 font-mono text-xs uppercase tracking-[0.14em] text-bone hover:border-purple-100/80">
              {copy.primary}
            </button>
            <button onClick={status === 'exhausted' ? onBack : onContinue} className="rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 font-mono text-xs uppercase tracking-[0.14em] text-smoke hover:border-pink-200/50 hover:text-bone">
              {copy.secondary}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
