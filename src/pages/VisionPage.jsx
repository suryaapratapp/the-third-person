import ParticleBackground from '../components/ParticleBackground.jsx';

const cards = [
  ['Conversation memory', 'Future versions will help users understand how relationships evolve across weeks, months, and years, not just from one isolated chat.'],
  ['Personality intelligence', 'ThirdPerson AI will build richer personality cards based on recurring communication patterns, emotional triggers, habits, curiosity loops, and engagement psychology.'],
  ['Multilingual emotional understanding', 'ThirdPerson AI is designed to understand English, Hindi, Hinglish, and mixed-language conversations with cultural and emotional context.'],
  ['Relationship timelines', 'Users will be able to see how affection, conflict, effort, distance, clarity, and trust change over time.'],
  ['Private by design', 'The product direction is built around user control, sensitive-data protection, and responsible AI interpretation.'],
  ['More human clarity', 'The goal is not to judge people. The goal is to help users reflect, understand, and communicate better.'],
];

const upcoming = [
  ['Relationship Guidance Chat', 'A private AI companion you can talk to about each relationship: what happened, what changed, what went wrong, what you may be feeling, and how you can communicate better.'],
  ['Deeper Personality Reports', 'Personality Reports will go beyond basic traits. They will analyse your humour, emotional style, favourite words, hobbies, reactions, habits, communication patterns, and the way you show care, curiosity, conflict, and affection.'],
  ['Yearly Relationship Memory', 'ThirdPerson AI will help you understand what you learned about someone across months or even a full year: their patterns, moods, humour, interests, emotional triggers, consistency, and how the connection evolved.'],
  ['Ideal Match Intelligence', 'Future updates will help users understand the kind of partner, friend, or emotional connection that may suit their personality, so they can spend less energy chasing mismatched connections and more energy building healthier ones.'],
  ['Ideal Friend Finder', 'ThirdPerson AI will help identify the type of people who naturally match your humour, emotional rhythm, communication style, and values.'],
  ['Better Communication Coaching', 'Get suggestions on how to reply, what to ask, what to avoid, and how to express yourself without sounding needy, cold, dramatic, or unclear.'],
  ['Relationship Growth Tracker', 'Track how affection, effort, clarity, conflict, trust, and emotional safety change across time.'],
  ['Shareable Insight Cards', 'Turn key moments, personality insights, and emotional patterns into beautiful cards you can save, download, or share.'],
];

export default function VisionPage() {
  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
      <ParticleBackground className="opacity-50" />
      <div className="relative mx-auto max-w-[1320px]">
        <div className="corner-frame accent-panel p-6 sm:p-12">
          <p className="tech-label text-smoke">Vision</p>
          <h1 className="serif-title mt-5 max-w-4xl text-5xl leading-tight sm:text-7xl">The vision behind ThirdPerson AI</h1>
          <p className="mt-6 max-w-3xl text-sm leading-8 text-smoke">
            We are building a private relationship intelligence layer for modern conversations, helping people understand emotional patterns, communication shifts, compatibility signals, and personality dynamics across the chats that shape their lives.
          </p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cards.map(([title, body], index) => (
            <article key={title} className="thin-panel p-6">
              <p className="tech-label text-purple-200">{String(index + 1).padStart(2, '0')}</p>
              <h2 className="serif-title mt-4 text-3xl">{title}</h2>
              <p className="mt-4 text-sm leading-7 text-smoke">{body}</p>
            </article>
          ))}
        </div>
        <section className="mt-12 accent-panel p-6 sm:p-10">
          <p className="tech-label text-orange-200">What’s coming next</p>
          <h2 className="serif-title mt-4 text-5xl leading-tight">A private guidance layer for every relationship.</h2>
          <p className="mt-5 max-w-3xl text-sm leading-8 text-smoke">
            ThirdPerson AI is growing into a private relationship guidance layer: a place where you can talk through every relationship, understand what went wrong, see what can improve, and make better emotional decisions.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {upcoming.map(([title, body], index) => (
              <article key={title} className="border border-white/10 bg-black/35 p-5">
                <p className="tech-label text-purple-200">{String(index + 1).padStart(2, '0')}</p>
                <h3 className="serif-title mt-3 text-3xl">{title}</h3>
                <p className="mt-4 text-sm leading-7 text-smoke">{body}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="mt-8 thin-panel p-6 sm:p-10">
          <p className="tech-label text-pink-200">Personality Reports</p>
          <h2 className="serif-title mt-4 text-5xl leading-tight">Understand the person behind the messages.</h2>
          <p className="mt-5 max-w-4xl text-sm leading-8 text-smoke">
            ThirdPerson AI looks beyond one conversation. Over time, it can help you understand your humour, habits, emotional triggers, favourite words, hobbies, reactions, communication style, and the kind of people you naturally connect with.
          </p>
          <p className="mt-4 max-w-4xl text-sm leading-8 text-smoke">
            When you analyse conversations across months, ThirdPerson AI can also help you understand what you have learned about the other person: their patterns, interests, emotional rhythm, communication habits, and how the relationship changed over time.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {['Type of person', 'Humour style', 'Favourite words', 'Hobbies', 'Triggers', 'Conflict style', 'Care language', 'Reassurance needs', 'Relationship patterns'].map((item) => (
              <span key={item} className="border border-purple-300/15 bg-purple-300/5 px-3 py-2 font-mono text-xs uppercase tracking-[0.13em] text-smoke">{item}</span>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
