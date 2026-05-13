import { useState } from 'react';
import ParticleBackground from '../components/ParticleBackground.jsx';

const plans = [
  {
    name: 'Starter Clarity',
    price: 'Coming soon',
    audience: 'For casual relationship checks.',
    summaries: 'Up to 5 Relationship Intelligence Summaries / week',
    questions: 'Up to 100 Bestie questions / week',
    intelligence: 'Standard Intelligence',
    cta: 'Choose Starter',
    accent: 'from-purple-300/20 via-pink-300/10 to-blue-300/10',
  },
  {
    name: 'Deep Insight',
    price: 'Coming soon',
    audience: 'For people actively trying to understand a relationship.',
    summaries: 'Up to 10 Relationship Intelligence Summaries / week',
    questions: 'Up to 250 Bestie questions / week',
    intelligence: 'Advanced Relationship Intelligence',
    cta: 'Choose Deep Insight',
    accent: 'from-pink-300/20 via-purple-300/12 to-orange-300/12',
  },
];

export default function PricingPage() {
  const [message, setMessage] = useState('');
  const reason = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('reason') : '';

  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
      <ParticleBackground className="opacity-45" />
      <div className="relative mx-auto max-w-[1180px]">
        {reason === 'usage-limit' && (
          <div className="mb-6 rounded-[28px] border border-orange-200/25 bg-orange-300/[0.055] p-5">
            <p className="tech-label text-orange-100">Continue your ThirdPerson POV</p>
            <p className="mt-3 text-sm leading-7 text-smoke">Choose a plan to unlock more Bestie questions, more relationship reports, and deeper relationship intelligence.</p>
          </div>
        )}
        <div className="corner-frame accent-panel p-6 text-center sm:p-12">
          <p className="tech-label text-purple-200">Pricing</p>
          <h1 className="serif-title mt-4 text-5xl leading-tight sm:text-7xl">Choose your clarity level.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-smoke">
            Paid plans are being prepared for deeper ThirdPerson POV, stronger Bestie reasoning, and more relationship intelligence.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {plans.map((plan) => (
            <article key={plan.name} className={`rounded-[32px] border border-white/14 bg-gradient-to-br ${plan.accent} p-6 shadow-[0_0_70px_rgba(168,85,247,0.08)]`}>
              <p className="tech-label text-pink-100">{plan.intelligence}</p>
              <h2 className="serif-title mt-4 text-5xl">{plan.name}</h2>
              <p className="mt-3 text-sm leading-7 text-smoke">{plan.audience}</p>
              <p className="mt-6 text-2xl text-bone">{plan.price}</p>
              <div className="mt-6 space-y-3 text-sm leading-7 text-smoke">
                <p className="rounded-2xl border border-white/10 bg-black/25 p-4">{plan.summaries}</p>
                <p className="rounded-2xl border border-white/10 bg-black/25 p-4">{plan.questions}</p>
                <p className="rounded-2xl border border-white/10 bg-black/25 p-4">Deeper emotional pattern analysis and shareable ThirdPerson POV insights</p>
              </div>
              <button onClick={() => setMessage('Payments are coming soon. Your plan selection is saved for this session.')} className="glass-button mt-7 w-full rounded-full px-5 py-4 font-mono text-xs uppercase tracking-[0.16em] text-bone">
                {plan.cta}
              </button>
            </article>
          ))}
        </div>

        <div className="mt-8 thin-panel overflow-hidden rounded-[28px] p-5">
          <p className="tech-label text-blue-200">Plan comparison</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {['Relationship reports', 'Bestie questions', 'ThirdPerson POV depth'].map((label) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="tech-label text-ash">{label}</p>
                <p className="mt-3 text-sm leading-7 text-smoke">Starter gives light weekly access. Deep Insight unlocks more room for active reflection.</p>
              </div>
            ))}
          </div>
        </div>
        {message && <p className="mt-5 rounded-2xl border border-purple-200/20 bg-purple-300/[0.06] p-4 text-sm text-smoke">{message}</p>}
      </div>
    </section>
  );
}
