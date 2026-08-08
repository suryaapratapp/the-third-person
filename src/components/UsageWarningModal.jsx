// Pricing is one bundle, not two separate credit types: ₹249 buys 1
// Relationship Report *with* 5 Coach Chats already included — you cannot buy
// Coach Chats on their own, and a report always brings chats with it. This
// modal used to say "packs add separate credits for Relationship Reports and
// Coach Chats", which described a pricing model that does not exist and would
// have told a coach-chat-exhausted user to expect a chats-only top-up they
// cannot actually buy. See PricingPage.jsx for the real shape.
export default function UsageWarningModal({ status = 'exhausted', feature = 'report', onContinue, onPlans, onBack }) {
  const isBestie = feature === 'bestie';
  const exhaustedCopy = isBestie
    ? {
        title: 'You’re out of Coach Chats',
        body: 'Every Relationship Report includes 5 Coach Chats. Buy another report to get 5 more.',
        primary: 'Buy a report',
        secondary: 'Back to Reports',
      }
    : {
        title: 'You’re out of Relationship Reports',
        body: 'Top up to generate more reports — each one includes 5 Coach Chats.',
        primary: 'Buy a report',
        secondary: 'Back to Reports',
      };
  const nearingCopy = isBestie
    ? {
        title: 'Your Coach Chat balance is running low',
        body: 'Your next report will bring 5 more Coach Chats with it, whenever you need them.',
        primary: 'View pricing',
        secondary: 'Continue for now',
      }
    : {
        title: 'Your Relationship Report balance is running low',
        body: 'Top up anytime to keep generating deeper ThirdPerson POV reports when you need clarity.',
        primary: 'View pricing',
        secondary: 'Continue for now',
      };
  const copy = status === 'exhausted' ? exhaustedCopy : nearingCopy;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-well px-4 "
      role="dialog"
      aria-modal="true"
      aria-labelledby="usage-warning-heading"
      onKeyDown={(event) => { if (event.key === 'Escape') (status === 'exhausted' ? onBack : onContinue)?.(); }}
    >
      <div className="relative max-w-xl overflow-hidden rounded-sm border border-signal/35 bg-paper p-6 shadow-glow sm:p-8">
        <div className="relative">
          <p className="tech-label text-warn">ThirdPerson AI</p>
          <h2 id="usage-warning-heading" className="serif-title mt-4 text-4xl leading-tight text-bone sm:text-5xl">{copy.title}</h2>
          <p className="mt-5 text-sm leading-8 text-smoke">{copy.body}</p>
          <p className="mt-4 rounded-2xl border border-line bg-paper p-4 text-xs leading-6 text-ash">
            One price per report — ₹249 gets you 1 Relationship Report and 5 Coach Chats together. There is no separate chats-only top-up.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button onClick={onPlans} className="rounded-sm border border-signal/35 bg-signal/10 px-5 py-3 text-xs text-bone hover:border-signal/35">
              {copy.primary}
            </button>
            <button onClick={status === 'exhausted' ? onBack : onContinue} className="rounded-sm border border-line bg-paper px-5 py-3 text-xs text-smoke hover:border-you/35 hover:text-bone">
              {copy.secondary}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
