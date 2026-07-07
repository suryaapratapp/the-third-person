const cards = [
  ['Understanding requires context.', 'No analysis can fully capture the entirety of a human experience.'],
  ['Interpretation is not certainty.', 'AI detects possibilities, not definitive truths.'],
  ['Human judgment remains essential.', 'You bring your values, wisdom, and lived experience to every decision.'],
  ['Signals are meaningful, not absolute.', 'Patterns highlight what to explore, not what to assume.'],
  ['AI assists perception, not truth itself.', 'We illuminate the unseen; you decide the way forward.'],
];

export default function ResponsibleIntelligenceSection() {
  return (
    <section className="px-4 py-20 sm:px-8">
      <div className="corner-frame relative mx-auto max-w-[1540px] overflow-hidden border border-white/14 px-5 py-20 text-center sm:px-9">
        <div className="absolute inset-0 dot-field opacity-10" />
        <p className="tech-label relative mb-8 text-smoke">Responsible Intelligence</p>
        <h2 className="serif-title relative mx-auto max-w-5xl text-5xl leading-tight sm:text-7xl">
          AI can reveal patterns.<br /><em>Human judgment gives them meaning.</em>
        </h2>
        <p className="relative mx-auto mt-8 max-w-2xl text-sm leading-8 text-smoke">
          ThirdPerson AI analyses signals, emotions, and behaviours, but understanding people is never binary.
          Our insights are probabilistic, contextual, and interpretive. They are here to support clarity, not replace judgment.
        </p>
        <div className="relative mt-16 grid border border-white/10 md:grid-cols-5">
          {cards.map(([title, body]) => (
            <div key={title} className="border-b border-white/10 p-7 md:border-b-0 md:border-r md:last:border-r-0">
              <div className="mx-auto mb-7 h-9 w-9 border border-white/20 p-2">
                <div className="h-full w-full rounded-full border border-white/45" />
              </div>
              <h3 className="tech-label text-bone">{title}</h3>
              <p className="mt-6 text-sm leading-7 text-smoke">{body}</p>
            </div>
          ))}
        </div>
        <div className="relative mx-auto mt-10 max-w-4xl border border-white/16 px-4 py-5">
          <p className="tech-label text-smoke">The goal isn’t to know everything — it’s to understand enough to act wisely.</p>
        </div>
      </div>
    </section>
  );
}
