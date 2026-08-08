import { useState } from 'react';
import { PiMinus, PiPlus } from 'react-icons/pi';

// One answer here used to end "...partners, exes, crushes, friends, family
// members, colleagues, and more" — colleagues stopped being an option when the
// work relationship types and their prompt lenses were removed. The list now
// matches what the wizard actually offers.
//
// Cost and refunds were missing entirely, which are the two things people
// search an FAQ for once a product charges money.
const faqs = [
  ['What does ThirdPerson AI do?', 'You give it a real conversation and it reads the patterns in it: who puts in the effort, how the tone shifted over time, where conflict repeats, and what the mixed signals look like. Every claim is tied to quotes from your own chat.'],
  ['What does it cost?', '₹249 for one report including 5 coach chats, or ₹199 for a single report on its own if you buy during an analysis. There is no subscription, credits do not expire, and re-opening a report you already own is always free.'],
  ['Which relationships can I analyse?', 'Partners, early dating and crushes, exes, friends, and family — parents, siblings and cousins. Work relationships are deliberately not supported: they need a different lens than this product is built for.'],
  ['Is my chat private?', 'Reports are locked to your account at the database level, so no other user can reach them. Phone numbers, emails, OTPs and ID-like numbers are stripped before analysis, your chats are never used to train AI models, and you can delete everything from your profile at any time.'],
  ['Can it tell me if someone loves me?', 'No, and it will not pretend to. It can show warmth, effort, consistency, distance and mixed signals as they appear in the messages. What those mean is yours to judge.'],
  ['Which languages does it support?', 'Dozens — pick your languages on your Profile page. English, Hindi and Hinglish are supported, along with most major world languages, mixed-language chats, and languages typed phonetically in English letters rather than their native script.'],
  ['How much chat history do I need?', 'More is better. A few dozen messages produces a directional first impression, and the report will say so. Months of history is where the timeline and effort patterns get genuinely useful.'],
  ['Can I get a refund?', 'Unused credits can be refunded — see the Refund Policy for the details. If a report or coach reply fails to generate, your balance is not touched in the first place.'],
  ['Is this therapy?', 'No. It is a reflection tool, not therapy, counselling, or legal advice, and it will never tell you to stay in or leave a relationship.'],
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
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-24 sm:px-8 sm:pt-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="relative mx-auto max-w-[720px]">
        <div className="text-center">
          <p className="tech-label text-signal">FAQs</p>
          <h1 className="serif-title mt-4 text-4xl leading-tight sm:text-6xl">Questions worth asking.</h1>
        </div>

        <div className="mt-8 grid gap-2.5">
          {faqs.map(([question, answer], index) => {
            const isOpen = open === index;
            return (
              <div
                key={question}
                className={`overflow-hidden rounded-sm border transition ${
                  isOpen ? 'border-signal/35 bg-signal/10' : 'border-line bg-paper'
                }`}
              >
                <button
                  onClick={() => setOpen(isOpen ? -1 : index)}
                  aria-expanded={isOpen}
                  className="flex min-h-[60px] w-full items-center justify-between gap-4 p-4 text-left sm:p-5"
                >
                  <span className="text-base leading-6 text-bone sm:text-lg">{question}</span>
                  <span className="shrink-0 text-signal" aria-hidden="true">
                    {isOpen ? <PiMinus /> : <PiPlus />}
                  </span>
                </button>
                {isOpen && (
                  <p className="border-t border-line px-4 pb-4 pt-3.5 text-sm leading-7 text-smoke sm:px-5 sm:pb-5">
                    {answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
