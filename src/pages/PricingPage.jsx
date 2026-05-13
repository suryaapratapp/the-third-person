import { useEffect, useState } from 'react';
import ParticleBackground from '../components/ParticleBackground.jsx';
import { fetchCreditBalances } from '../lib/creditsService.js';

const plans = [
  {
    name: 'Clarity Pack',
    eyebrow: 'Start here',
    price: 'Launch pricing soon',
    audience: 'For casual relationship checks and focused clarity moments.',
    reports: 5,
    chats: 50,
    intelligence: 'Pay-As-You-Go Clarity',
    cta: 'Buy Clarity Pack',
    accent: 'from-purple-300/22 via-pink-300/10 to-blue-300/12',
    glow: 'bg-purple-300/20',
    note: 'Perfect when you want clarity on one connection without committing to anything heavy.',
    features: ['5 full relationship reads', '50 Bestie follow-up chats', 'Separate credits for reports and chat', 'Top up anytime'],
  },
  {
    name: 'Deep Clarity Pack',
    eyebrow: 'Best value',
    price: 'Launch pricing soon',
    audience: 'For deeper reflection when a connection needs more attention.',
    reports: 10,
    chats: 100,
    intelligence: 'Advanced Relationship Intelligence',
    cta: 'Buy Deep Clarity Pack',
    accent: 'from-pink-300/22 via-purple-300/14 to-orange-300/16',
    glow: 'bg-pink-300/20',
    note: 'More room to understand patterns, ask “what should I do?”, and revisit the same relationship with context.',
    features: ['10 full relationship reads', '100 Bestie follow-up chats', 'Better for ongoing situations', 'Top up anytime'],
  },
];

export default function PricingPage() {
  const [message, setMessage] = useState('');
  const [balances, setBalances] = useState(null);
  const reason = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('reason') : '';

  useEffect(() => {
    let mounted = true;
    fetchCreditBalances().then((result) => {
      if (mounted) setBalances(result);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const reportBalance = balances?.paidRelationshipReportsLeft ?? '—';
  const bestieBalance = balances?.paidBestieChatsLeft ?? '—';
  const bestieLow = typeof bestieBalance === 'number' && bestieBalance <= 5;
  const reportLow = typeof reportBalance === 'number' && reportBalance <= 1;

  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
      <ParticleBackground className="opacity-45" />
      <div className="relative mx-auto max-w-[1180px]">
        {reason === 'usage-limit' && (
          <div className="mb-6 rounded-[28px] border border-orange-200/25 bg-orange-300/[0.055] p-5">
            <p className="tech-label text-orange-100">Continue your ThirdPerson POV</p>
            <p className="mt-3 text-sm leading-7 text-smoke">Top up to unlock more Bestie Chats, more Relationship Reports, and deeper relationship intelligence.</p>
          </div>
        )}
        <div className="corner-frame accent-panel overflow-hidden p-6 text-center sm:p-12">
          <div className="pointer-events-none absolute left-1/2 top-10 h-64 w-64 -translate-x-1/2 rounded-full bg-purple-300/10 blur-3xl" />
          <p className="tech-label text-purple-200">Pricing</p>
          <h1 className="serif-title mt-4 text-5xl leading-tight sm:text-7xl">Choose your Pay-As-You-Go clarity pack</h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-smoke">
            Buy credits when you need them. Relationship Reports and Bestie Chats are tracked separately, and you can top up another pack anytime.
          </p>
          <div className="mx-auto mt-7 flex max-w-3xl flex-wrap justify-center gap-3">
            {['No recurring commitment', 'Reports and chats tracked separately', 'Old reports stay free to open'].map((item) => (
              <span key={item} className="rounded-full border border-white/12 bg-white/[0.045] px-4 py-2 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-smoke">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-[30px] border border-purple-200/20 bg-gradient-to-br from-purple-300/[0.12] via-white/[0.045] to-blue-300/[0.05] p-5 shadow-[0_18px_80px_rgba(168,85,247,0.08)]">
            <div className="absolute -right-10 -top-14 h-36 w-36 rounded-full bg-purple-300/20 blur-3xl" />
            <div className="relative flex items-end justify-between gap-4">
              <div>
                <p className="tech-label text-purple-100">Report balance</p>
                <p className="mt-3 text-sm leading-6 text-smoke">For new Relationship Intelligence Summaries</p>
              </div>
              <div className="text-right">
                <p className="serif-title text-6xl leading-none text-bone">{reportBalance}</p>
                <p className="mt-2 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-smoke">Reports left</p>
              </div>
            </div>
            <p className={`relative mt-5 rounded-2xl border px-4 py-3 text-xs leading-6 ${reportLow ? 'border-orange-200/30 bg-orange-300/[0.08] text-orange-100' : 'border-white/10 bg-black/20 text-ash'}`}>
              {reportLow ? 'You are close to needing a top-up for new reports.' : 'Opening your old reports does not use credits.'}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-[30px] border border-pink-200/20 bg-gradient-to-br from-pink-300/[0.10] via-white/[0.045] to-orange-300/[0.055] p-5 shadow-[0_18px_80px_rgba(236,72,153,0.08)]">
            <div className="absolute -right-10 -top-14 h-36 w-36 rounded-full bg-pink-300/20 blur-3xl" />
            <div className="relative flex items-end justify-between gap-4">
              <div>
                <p className="tech-label text-pink-100">Bestie balance</p>
                <p className="mt-3 text-sm leading-6 text-smoke">For successful Bestie replies and guidance</p>
              </div>
              <div className="text-right">
                <p className="serif-title text-6xl leading-none text-bone">{bestieBalance}</p>
                <p className="mt-2 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-smoke">Chats left</p>
              </div>
            </div>
            <p className={`relative mt-5 rounded-2xl border px-4 py-3 text-xs leading-6 ${bestieLow ? 'border-orange-200/30 bg-orange-300/[0.08] text-orange-100' : 'border-white/10 bg-black/20 text-ash'}`}>
              {bestieLow ? 'Top up Bestie Chats to keep asking for advice without stopping mid-thought.' : 'Failed replies do not use Bestie Chat credits.'}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {plans.map((plan, index) => (
            <article key={plan.name} className={`group relative overflow-hidden rounded-[36px] border ${index === 1 ? 'border-pink-200/35' : 'border-white/14'} bg-gradient-to-br ${plan.accent} p-6 shadow-[0_0_80px_rgba(168,85,247,0.10)] transition duration-300 hover:-translate-y-1 hover:border-purple-100/45 hover:shadow-[0_28px_110px_rgba(236,72,153,0.12)]`}>
              <div className={`absolute -right-20 -top-24 h-64 w-64 rounded-full ${plan.glow} blur-3xl transition group-hover:scale-110`} />
              <div className="relative flex items-center justify-between gap-4">
                <p className="tech-label text-pink-100">{plan.eyebrow}</p>
                {index === 1 && <span className="rounded-full border border-orange-200/30 bg-orange-300/[0.10] px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-orange-100">More room</span>}
              </div>
              <p className="relative mt-4 tech-label text-blue-100">{plan.intelligence}</p>
              <h2 className="relative mt-4 serif-title text-5xl leading-tight">{plan.name}</h2>
              <p className="mt-3 text-sm leading-7 text-smoke">{plan.audience}</p>
              <div className="relative mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-[26px] border border-purple-200/18 bg-black/24 p-4">
                  <p className="serif-title text-5xl leading-none text-bone">{plan.reports}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.12em] text-smoke">Relationship Reports</p>
                </div>
                <div className="rounded-[26px] border border-pink-200/18 bg-black/24 p-4">
                  <p className="serif-title text-5xl leading-none text-bone">{plan.chats}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.12em] text-smoke">Bestie Chats</p>
                </div>
              </div>
              <p className="relative mt-5 rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-sm leading-7 text-smoke">{plan.note}</p>
              <div className="relative mt-5 space-y-2">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-smoke">
                    <span className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-200 via-pink-200 to-orange-200" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <p className="relative mt-6 text-2xl text-bone">{plan.price}</p>
              <button onClick={() => setMessage(`${plan.name} selected. Secure checkout is coming soon, and top-up selection is saved for this session.`)} className="glass-button mt-7 w-full rounded-full px-5 py-4 font-mono text-xs uppercase tracking-[0.16em] text-bone">
                {plan.cta}
              </button>
            </article>
          ))}
        </div>

        <div className="mt-8 thin-panel overflow-hidden rounded-[28px] p-5">
          <p className="tech-label text-blue-200">Pack comparison</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              ['Relationship Reports', 'Use these when you want a fresh full read of a conversation. Cached or old reports do not use credits.'],
              ['Bestie Chats', 'Use these when you want advice, reply help, or a calmer read on what is happening.'],
              ['ThirdPerson POV depth', 'Pick the deeper pack when the relationship is ongoing and you know you will want follow-up guidance.'],
            ].map(([label, copy]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="tech-label text-ash">{label}</p>
                <p className="mt-3 text-sm leading-7 text-smoke">{copy}</p>
              </div>
            ))}
          </div>
        </div>
        {message && <p className="mt-5 rounded-2xl border border-purple-200/20 bg-purple-300/[0.06] p-4 text-sm text-smoke">{message}</p>}
      </div>
    </section>
  );
}
