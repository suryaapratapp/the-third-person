import { useState } from 'react';
import ParticleBackground from '../components/ParticleBackground.jsx';

const faqs = [
  ['What does ThirdPerson AI do?', 'ThirdPerson AI helps you understand conversations by analysing emotional patterns, communication style, effort, tension, clarity, compatibility, and personality signals.'],
  ['Is ThirdPerson AI judging my relationship?', 'No. ThirdPerson AI provides reflective insights, not final judgments. It helps you notice possible patterns so you can think more clearly.'],
  ['Can it tell me if someone loves me?', 'It cannot know someone’s heart with certainty. It can only highlight patterns such as warmth, effort, consistency, affection, distance, and mixed signals.'],
  ['Does it work with Hindi conversations?', 'Yes. ThirdPerson AI is designed to understand English, Hindi or Hinglish conversations.'],
  ['Is my chat private?', 'Your conversations are treated as sensitive data. The app is designed to protect private details and prepare conversations carefully before analysis.'],
  ['Can I use it after a breakup?', 'Yes. It can help you understand what changed, what repeated, what hurt, and what you may want to learn before moving forward.'],
  ['Can it analyse friendships and family chats?', 'Yes. You can analyse partners, exes, crushes, friends, family members, colleagues, and more.'],
  ['Is this therapy?', 'No. ThirdPerson AI is a reflection and relationship clarity tool. It is not therapy, legal advice, or a final judgment.'],
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(([question, answer]) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: answer,
    },
  })),
};

export default function FaqsPage() {
  const [open, setOpen] = useState(0);
  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <ParticleBackground className="opacity-45" />
      <div className="relative mx-auto max-w-5xl">
        <div className="corner-frame accent-panel p-6 text-center sm:p-12">
          <p className="tech-label text-smoke">FAQs</p>
          <h1 className="serif-title mt-4 text-5xl leading-tight sm:text-7xl">Clear answers before you analyse.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-smoke">
            Simple, privacy-first answers about what ThirdPerson AI can and cannot do.
          </p>
        </div>
        <div className="mt-8 space-y-4">
          {faqs.map(([question, answer], index) => (
            <div key={question} className="thin-panel overflow-hidden">
              <button
                onClick={() => setOpen(open === index ? -1 : index)}
                className="flex w-full items-center justify-between gap-5 p-5 text-left"
              >
                <span className="serif-title text-2xl text-bone">{question}</span>
                <span className="text-purple-200">{open === index ? '−' : '+'}</span>
              </button>
              {open === index && (
                <p className="border-t border-white/10 px-5 pb-5 pt-4 text-sm leading-8 text-smoke">{answer}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
