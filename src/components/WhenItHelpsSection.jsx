const useCases = [
  ['Dating & New Relationships', 'Analyse early communication patterns, emotional availability, consistency, and compatibility before getting too invested.'],
  ['Long-Term Relationships', 'Understand how your relationship dynamics have evolved over time, including effort balance, conflict patterns, affection, distance, and repair.'],
  ['Post-Breakup Clarity', 'Get objective, AI-assisted insights into what changed, what repeated, and what may have gone wrong without turning pain into blame.'],
  ['Friendships', 'Reflect on effort, reliability, emotional availability, and repeated misunderstanding in close friendships.'],
  ['Family Conversations', 'Notice recurring tension, care signals, boundaries, and repair attempts in sensitive family exchanges.'],
  ['Workplace Communication', 'Review communication tone, clarity, expectation gaps, and professional relationship dynamics with care.'],
];

export default function WhenItHelpsSection() {
  return (
    <section className="border-b border-white/12 px-4 py-20 sm:px-8">
      <div className="mx-auto max-w-[1540px]">
        <p className="tech-label text-smoke">When it helps</p>
        <div className="mt-5 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <h2 className="serif-title text-5xl leading-none sm:text-6xl">For every stage of a relationship.</h2>
          <p className="max-w-2xl text-sm leading-8 text-smoke">
            From the first DM to making sense of what just ended, ThirdPerson AI helps you reflect with more clarity.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {useCases.map(([title, text]) => (
            <article key={title} className="accent-panel p-6">
              <h3 className="serif-title text-3xl">{title}</h3>
              <p className="mt-4 text-sm leading-7 text-smoke">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
