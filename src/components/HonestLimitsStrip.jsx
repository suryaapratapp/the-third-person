// Compact replacement for the old "Responsible Intelligence" section.
//
// That section ran to five full-height cards — roughly three phone screens — to
// make three points. The points themselves are worth keeping: they set honest
// expectations before someone pays, and they are the difference between a user
// treating a report as a conversation starter and treating it as a verdict.
// Kept as a strip so it is read rather than scrolled past.

const LIMITS = [
  ['Patterns, not verdicts', 'Reports show what repeats in the messages. They cannot tell you what someone privately meant or intended.'],
  ['Evidence you can check', 'Every claim is tied to quotes from your own chat, so you can disagree with it.'],
  ['You decide what it means', 'This is a tool for reflection. It is not therapy, and it will never tell you to stay or leave.'],
];

export default function HonestLimitsStrip() {
  return (
    <section className="rounded-[28px] border border-white/12 bg-white/[0.03] p-5 sm:p-7">
      <p className="tech-label text-ash">Where the honesty line sits</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {LIMITS.map(([title, body]) => (
          <div key={title}>
            <h3 className="text-base leading-6 text-bone">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-smoke">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
