import ParticleBackground from '../components/ParticleBackground.jsx';

const updated = new Intl.DateTimeFormat('en-IN', { dateStyle: 'long' }).format(new Date());

const refundSections = [
  ['What you are buying', 'Paid credit packs add a fixed number of Relationship Reports and Guide Chats to your account. Credits are consumed only when a report or Guide Chat is successfully generated.'],
  ['Failed generations are never charged', 'If a Relationship Report, Guide Chat, or Personality Card cannot be generated because of an AI provider error or a technical failure on our side, the credit for that attempt is automatically returned to your balance. You should never lose a credit for a generation that did not complete.'],
  ['Unused credit packs', 'If you have not used any credit from a pack, you can request a full refund within 7 days of purchase by contacting support@thethirdperson.ai with your account email and order details.'],
  ['Partially used credit packs', 'Once at least one credit from a pack has been used, the pack is treated as in use and is non-refundable, in line with standard practice for prepaid digital usage credits. Remaining unused credits stay on your account for future use.'],
  ['Accidental or duplicate purchases', 'If you were charged twice for the same pack due to a payment error, contact support@thethirdperson.ai with your payment reference and we will refund the duplicate charge.'],
  ['How refunds are paid', 'Approved refunds are returned to the original payment method through our payment processor. Processing time depends on your bank or card provider and is typically a few business days after approval.'],
  ['Cancelling your account', 'ThirdPerson AI has no recurring subscription today — you only pay for the credit packs you choose to buy. You can stop using the app or request account deletion at any time by contacting support@thethirdperson.ai; this does not entitle you to a refund for already-used credits.'],
  ['Changes to this policy', 'We may update this policy as our payment options evolve. Material changes will be reflected on this page with an updated date.'],
  ['Contact', 'For billing or refund questions, contact support@thethirdperson.ai.'],
];

export default function RefundPolicyPage() {
  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
      <ParticleBackground className="opacity-45" />
      <div className="relative mx-auto max-w-[1320px]">
        <div className="corner-frame accent-panel p-6 sm:p-12">
          <p className="tech-label text-smoke">Refund &amp; Cancellation Policy</p>
          <h1 className="serif-title mt-5 max-w-4xl text-5xl leading-tight sm:text-7xl">Fair rules for pay-as-you-go credits.</h1>
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-purple-200/80">Last updated: {updated}</p>
          <p className="mt-6 max-w-3xl text-sm leading-8 text-smoke">
            ThirdPerson AI is pay-as-you-go: there is no subscription to cancel, only credit packs you top up when you need them. This page explains when a refund is available.
          </p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="hidden h-fit border border-purple-300/15 bg-black/45 p-5 lg:sticky lg:top-28 lg:block">
            <p className="tech-label mb-4 text-smoke">Sections</p>
            <div className="space-y-2">
              {refundSections.map(([title], index) => (
                <a key={title} href={`#refund-${index}`} className="block text-sm leading-6 text-ash transition hover:text-bone">
                  {String(index + 1).padStart(2, '0')} {title}
                </a>
              ))}
            </div>
          </aside>
          <div className="space-y-5">
            {refundSections.map(([title, body], index) => (
              <section id={`refund-${index}`} key={title} className="thin-panel scroll-mt-28 p-6">
                <p className="tech-label text-purple-200">{String(index + 1).padStart(2, '0')}</p>
                <h2 className="serif-title mt-3 text-3xl">{title}</h2>
                <p className="mt-4 text-sm leading-8 text-smoke">{body}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
