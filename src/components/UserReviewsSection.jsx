const reviews = [
  ['Aditi', 'Delhi', 'It helped me understand the pattern, not just the problem.', 'I uploaded a long WhatsApp conversation and the analysis showed how the same argument kept repeating in different ways. It did not tell me what to do, but it helped me understand what I was feeling and what I needed to ask clearly.'],
  ['Rohan', 'Bengaluru', 'Surprisingly thoughtful and balanced.', 'I expected a basic sentiment score, but the insights were much deeper. The timeline helped me see when the communication started changing and where both sides became distant.'],
  ['Simran', 'Faridabad', 'The Hinglish understanding felt natural.', 'My chats were mostly Hinglish, and the app still understood the tone really well. It picked up hesitation, emotional effort, and the moments where the conversation became one-sided.'],
  ['Arjun', 'Jaipur', 'Useful after a breakup.', 'It gave me a calmer way to look at the conversation. The red flags and green flags were written carefully, not dramatically. It felt like a reflection tool, not a judgment.'],
];

export default function UserReviewsSection() {
  return (
    <section className="border-b border-white/12 px-4 py-20 sm:px-8">
      <div className="mx-auto max-w-[1320px]">
        <div className="text-center">
          <p className="tech-label text-smoke">User Reviews</p>
          <h2 className="serif-title mt-4 text-5xl leading-none sm:text-6xl">Trusted by people looking for clarity.</h2>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-8 text-smoke">
            Real conversations are complicated. ThirdPerson AI helps people slow down, reflect, and understand the patterns.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {reviews.map(([name, city, heading, text]) => (
            <article key={name} className="thin-panel p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-lg text-bone">{name}</p>
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-ash">{city}</p>
                </div>
                <p className="text-purple-200">★★★★★</p>
              </div>
              <h3 className="mt-6 serif-title text-3xl">{heading}</h3>
              <p className="mt-4 text-sm leading-7 text-smoke">“{text}”</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
