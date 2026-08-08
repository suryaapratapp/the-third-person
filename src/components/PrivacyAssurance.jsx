// Privacy reassurance shown at the moment people actually feel the worry:
// right before they hand over a private conversation.
//
// Every line here is deliberately TRUE and specific. We do not claim "nobody
// can ever see your data" — an absolute claim we cannot honour (a database
// administrator exists, and the AI provider retains data briefly for abuse
// monitoring). Concrete, verifiable promises earn more trust than absolutes,
// and overstating privacy is a legal risk as well as a dishonest one.
const POINTS = [
  {
    icon: '🔒',
    title: 'Only you can open your reports',
    body: 'Every report is locked to your account at the database level, so no other user of ThirdPerson AI can reach your conversations or results.',
  },
  {
    icon: '🧼',
    title: 'Sensitive details are stripped first',
    body: 'Phone numbers, emails, OTPs, card and ID-looking numbers are removed from your chat before any analysis begins.',
  },
  {
    icon: '🤖',
    title: 'Analysed by software, not by staff',
    body: 'Your conversation is processed automatically to produce your report. We do not read your chats to browse them, and nobody reviews them as part of the product.',
  },
  {
    icon: '🚫',
    title: 'Never sold, never used to train AI',
    body: 'We do not sell your data, and your conversations are not used to train AI models — not ours, and not our AI provider’s.',
  },
  {
    icon: '🗑️',
    title: 'Delete it whenever you want',
    body: 'You can delete any single report, or wipe every analysis, personality profile and coach message from your Profile page. Deletion is immediate.',
  },
];

export default function PrivacyAssurance({ compact = false, className = '' }) {
  if (compact) {
    return (
      <div className={`rounded-sm border border-good/35 bg-good/10 p-4 ${className}`}>
        <p className="tech-label text-good">Your privacy</p>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-smoke">
          <li>🔒 Locked to your account — no other user can see it</li>
          <li>🧼 Phone numbers, emails and IDs stripped before analysis</li>
          <li>🤖 Analysed by software, not read by staff</li>
          <li>🗑️ Delete everything anytime from your profile</li>
        </ul>
      </div>
    );
  }

  // The icon sits inline with the title rather than on its own line: five
  // stacked cards on a phone, and that one change is most of a screen back.
  return (
    <section className={`accent-panel relative overflow-hidden p-5 sm:p-8 ${className}`}>
      <div className="relative">
        <p className="tech-label text-good">Privacy first</p>
        <h2 className="serif-title mt-3 text-4xl leading-tight sm:text-5xl">
          Your conversations stay yours.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-smoke">
          Sharing a private chat is a big deal. Here is exactly what happens to it — in plain words, with nothing exaggerated.
        </p>
        <div className="mt-6 grid gap-2.5 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {POINTS.map((point) => (
            <div key={point.title} className="rounded-sm border border-line bg-paper p-4 sm:p-5">
              <h3 className="flex items-center gap-2.5 text-base leading-6 text-bone sm:text-lg">
                <span className="text-xl leading-none" aria-hidden="true">{point.icon}</span>
                {point.title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-smoke">{point.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs leading-6 text-ash">
          Full detail — including which AI provider processes your text and how long anything is kept — is in our{' '}
          <a href="/privacy" className="-my-3 inline-block py-3 text-signal underline hover:text-bone">Privacy Policy</a>.
        </p>
      </div>
    </section>
  );
}
