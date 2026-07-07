export default function UsageWarningModal({ status = 'exhausted', feature = 'report', onContinue, onPlans, onBack }) {
  const isBestie = feature === 'bestie';
  const exhaustedCopy = isBestie
    ? {
        title: 'You’re out of Guide Chats',
        body: 'You’re out of Guide Chats. Top up to keep asking for relationship guidance.',
        primary: 'Top up Guide Chats',
        secondary: 'Back to Reports',
      }
    : {
        title: 'You’re out of Relationship Reports',
        body: 'You’re out of Relationship Reports. Top up to generate more relationship intelligence summaries.',
        primary: 'Top up Reports',
        secondary: 'Back to Reports',
      };
  const nearingCopy = isBestie
    ? {
        title: 'Your Guide Chat balance is running low',
        body: 'Top up anytime to keep asking for guidance without interrupting your relationship clarity flow.',
        primary: 'View Packs',
        secondary: 'Continue for now',
      }
    : {
        title: 'Your Relationship Report balance is running low',
        body: 'Top up anytime to keep generating deeper ThirdPerson POV reports when you need clarity.',
        primary: 'View Packs',
        secondary: 'Continue for now',
      };
  const copy = status === 'exhausted' ? exhaustedCopy : nearingCopy;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 px-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="usage-warning-heading"
      onKeyDown={(event) => { if (event.key === 'Escape') (status === 'exhausted' ? onBack : onContinue)?.(); }}
    >
      <div className="relative max-w-xl overflow-hidden rounded-[32px] border border-purple-200/25 bg-[#110d18] p-6 shadow-[0_0_80px_rgba(168,85,247,0.18)] sm:p-8">
        <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-pink-300/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-blue-300/12 blur-3xl" />
        <div className="relative">
          <p className="tech-label text-orange-200">ThirdPerson AI</p>
          <h2 id="usage-warning-heading" className="serif-title mt-4 text-4xl leading-tight text-bone sm:text-5xl">{copy.title}</h2>
          <p className="mt-5 text-sm leading-8 text-smoke">{copy.body}</p>
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs leading-6 text-ash">
            Pay-as-you-go packs add separate credits for Relationship Reports and Guide Chats, so you only top up what you need next.
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
