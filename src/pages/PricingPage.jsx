import { useEffect, useState } from 'react';
import ParticleBackground from '../components/ParticleBackground.jsx';
import { fetchCreditBalances } from '../lib/creditsService.js';
import { useRouter } from '../state/RouterContext.jsx';

const PRICE_PER_REPORT = 199;
const CHATS_PER_REPORT = 10;
const MIN_REPORTS = 1;
const MAX_REPORTS = 50;

function formatInr(value) {
  return new Intl.NumberFormat('en-IN').format(value);
}

function clampReports(value) {
  const next = Number.parseInt(value, 10);
  if (!Number.isFinite(next)) return MIN_REPORTS;
  return Math.min(MAX_REPORTS, Math.max(MIN_REPORTS, next));
}

export default function PricingPage() {
  const { navigate } = useRouter();
  const [reportCount, setReportCount] = useState(1);
  const [message, setMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [balances, setBalances] = useState(null);
  const reason = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('reason') : '';
  const guideChats = reportCount * CHATS_PER_REPORT;
  const totalPrice = reportCount * PRICE_PER_REPORT;

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
  const guideBalance = balances?.paidBestieChatsLeft ?? '—';

  function updateReports(value) {
    setReportCount(clampReports(value));
  }

  function handleCheckout() {
    setMessage('');
    setModalOpen(true);
  }

  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
      <ParticleBackground className="opacity-45" />
      <div className="relative mx-auto max-w-[1180px]">
        {reason === 'usage-limit' && (
          <div className="mb-6 rounded-[28px] border border-orange-200/25 bg-orange-300/[0.055] p-5">
            <p className="tech-label text-orange-100">Continue your ThirdPerson POV</p>
            <p className="mt-3 text-sm leading-7 text-smoke">Top up to unlock more Guide Chats, more Relationship Reports, and deeper relationship intelligence.</p>
          </div>
        )}

        <div className="corner-frame accent-panel overflow-hidden p-6 text-center sm:p-12">
          <div className="pointer-events-none absolute left-1/2 top-10 h-64 w-64 -translate-x-1/2 rounded-full bg-purple-300/10 blur-3xl" />
          <p className="tech-label text-purple-200">Pricing</p>
          <h1 className="serif-title mt-4 text-5xl leading-tight sm:text-7xl">Build your clarity pack</h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-smoke">
            Choose the number of Relationship Reports you need. Every report adds 10 Guide Chats, so your follow-up guidance grows with your analysis balance.
          </p>
          <div className="mx-auto mt-7 flex max-w-3xl flex-wrap justify-center gap-3">
            {['Pay only for what you need', 'Top up anytime', 'Old reports stay free to open'].map((item) => (
              <span key={item} className="rounded-full border border-white/12 bg-white/[0.045] px-4 py-2 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-smoke">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-[30px] border border-purple-200/20 bg-gradient-to-br from-purple-300/[0.12] via-white/[0.045] to-violet-300/[0.05] p-5 shadow-[0_18px_80px_rgba(168,85,247,0.08)]">
            <div className="absolute -right-10 -top-14 h-36 w-36 rounded-full bg-purple-300/20 blur-3xl" />
            <p className="tech-label text-purple-100">Relationship Reports left</p>
            <p className="relative mt-4 serif-title text-6xl leading-none text-bone">{reportBalance}</p>
          </div>
          <div className="relative overflow-hidden rounded-[30px] border border-pink-200/20 bg-gradient-to-br from-pink-300/[0.10] via-white/[0.045] to-orange-300/[0.055] p-5 shadow-[0_18px_80px_rgba(236,72,153,0.08)]">
            <div className="absolute -right-10 -top-14 h-36 w-36 rounded-full bg-pink-300/20 blur-3xl" />
            <p className="tech-label text-pink-100">Guide Chats left</p>
            <p className="relative mt-4 serif-title text-6xl leading-none text-bone">{guideBalance}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <article className="relative overflow-hidden rounded-[38px] border border-purple-200/24 bg-gradient-to-br from-white/[0.07] via-purple-300/[0.08] to-pink-300/[0.045] p-6 shadow-[0_28px_120px_rgba(168,85,247,0.12)] sm:p-8">
            <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-purple-300/15 blur-3xl" />
            <div className="absolute -right-24 -top-20 h-64 w-64 rounded-full bg-pink-300/15 blur-3xl" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="tech-label text-purple-100">Smart credit builder</p>
                <h2 className="serif-title mt-4 text-5xl leading-tight">Shape your top-up.</h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-smoke">
                  1 Relationship Report includes 10 Guide Chats. Pick the amount that matches how much clarity you want right now.
                </p>
              </div>
              <div className="rounded-full border border-orange-200/25 bg-orange-300/[0.08] px-4 py-2 font-mono text-xs uppercase tracking-[0.13em] text-orange-100">
                ₹199 each
              </div>
            </div>

            <div className="relative mt-8 rounded-[30px] border border-white/12 bg-black/25 p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="tech-label text-smoke">Number of reports</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateReports(reportCount - 1)}
                    className="grid h-11 w-11 place-items-center rounded-full border border-white/12 bg-white/[0.045] text-2xl text-bone transition hover:border-purple-200/50"
                    aria-label="Decrease reports"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={MIN_REPORTS}
                    max={MAX_REPORTS}
                    value={reportCount}
                    onChange={(event) => updateReports(event.target.value)}
                    className="h-12 w-24 rounded-full border border-purple-200/25 bg-black/40 text-center text-lg text-bone outline-none focus:border-purple-100/70"
                    aria-label="Relationship report count"
                  />
                  <button
                    type="button"
                    onClick={() => updateReports(reportCount + 1)}
                    className="grid h-11 w-11 place-items-center rounded-full border border-white/12 bg-white/[0.045] text-2xl text-bone transition hover:border-purple-200/50"
                    aria-label="Increase reports"
                  >
                    +
                  </button>
                </div>
              </div>
              <input
                type="range"
                min={MIN_REPORTS}
                max={MAX_REPORTS}
                value={reportCount}
                onChange={(event) => updateReports(event.target.value)}
                className="mt-7 w-full accent-purple-300"
                aria-label="Relationship report slider"
              />
              <div className="mt-4 flex justify-between font-mono text-[0.65rem] uppercase tracking-[0.12em] text-ash">
                <span>1 report</span>
                <span>50 reports</span>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-4">
                {[
                  [1, 'Quick read'],
                  [3, 'Compare patterns'],
                  [5, 'Ongoing situation'],
                  [10, 'Deep archive'],
                ].map(([count, label]) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => updateReports(count)}
                    className={`rounded-2xl border px-3 py-3 text-left transition ${reportCount === count ? 'border-purple-200/55 bg-purple-300/12 text-bone' : 'border-white/10 bg-white/[0.035] text-smoke hover:border-purple-200/35 hover:text-bone'}`}
                  >
                    <span className="block font-mono text-[0.62rem] uppercase tracking-[0.12em]">{label}</span>
                    <span className="mt-1 block text-xs text-ash">{count} report{count > 1 ? 's' : ''}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[26px] border border-purple-200/18 bg-black/24 p-5">
                <p className="serif-title text-5xl leading-none text-bone">{reportCount}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.12em] text-smoke">Relationship Reports</p>
              </div>
              <div className="rounded-[26px] border border-pink-200/18 bg-black/24 p-5">
                <p className="serif-title text-5xl leading-none text-bone">{guideChats}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.12em] text-smoke">Guide Chats</p>
              </div>
              <div className="rounded-[26px] border border-orange-200/20 bg-orange-300/[0.055] p-5">
                <p className="serif-title text-5xl leading-none text-bone">₹{formatInr(totalPrice)}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.12em] text-smoke">Total</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              className="btn btn-primary relative mt-8 w-full"
            >
              Continue with ₹{formatInr(totalPrice)}
            </button>
            <p className="relative mt-4 text-center text-sm leading-7 text-smoke">
              Pay only for what you need. Top up anytime when your reports or Guide Chats run out.
            </p>
            <p className="relative mt-3 text-center text-xs leading-6 text-ash">
              By continuing you agree to our{' '}
              <button type="button" onClick={() => navigate('/terms')} className="text-purple-200 underline hover:text-bone">Terms of Service</button>
              {' '}and{' '}
              <button type="button" onClick={() => navigate('/refund-policy')} className="text-purple-200 underline hover:text-bone">Refund Policy</button>.
            </p>
          </article>

          <aside className="thin-panel rounded-[34px] p-6 sm:p-8">
            <p className="tech-label text-purple-200">How it works</p>
            <div className="mt-6 space-y-4">
              {[
                ['1', 'Choose the number of reports you want.'],
                ['2', 'Guide Chats are added automatically in multiples of 10.'],
                ['3', 'Use reports to analyse conversations.'],
                ['4', 'Use Guide Chats to ask follow-up questions about your relationship.'],
              ].map(([step, copy]) => (
                <div key={step} className="flex gap-4 rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-purple-200/25 bg-purple-300/10 font-mono text-xs text-bone">{step}</span>
                  <p className="text-sm leading-7 text-smoke">{copy}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-[26px] border border-orange-200/18 bg-orange-300/[0.055] p-5">
              <p className="tech-label text-orange-100">Live summary</p>
              <p className="mt-4 text-sm leading-7 text-smoke">
                {reportCount} Relationship Reports + {guideChats} Guide Chats for ₹{formatInr(totalPrice)}.
              </p>
            </div>
            <div className="mt-5 grid gap-3">
              {[
                ['What you get', 'Fresh relationship reports for new conversations, plus guide follow-ups to unpack the confusing parts.'],
                ['Smart usage', 'Opening old reports does not use credits. Duplicate cached reports do not use credits.'],
                ['Credit safety', 'Failed report generation or failed guide replies do not reduce your balance.'],
              ].map(([label, copy]) => (
                <div key={label} className="rounded-[24px] border border-white/10 bg-black/18 p-4">
                  <p className="tech-label text-ash">{label}</p>
                  <p className="mt-3 text-sm leading-7 text-smoke">{copy}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>

        {message && <p className="mt-5 rounded-2xl border border-purple-200/20 bg-purple-300/[0.06] p-4 text-sm text-smoke">{message}</p>}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 px-4 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-modal-heading"
          onKeyDown={(event) => { if (event.key === 'Escape') setModalOpen(false); }}
        >
          <div className="accent-panel max-w-lg rounded-[34px] p-7 text-center">
            <p className="tech-label text-purple-100">Top up selected</p>
            <h3 id="checkout-modal-heading" className="serif-title mt-4 text-4xl leading-tight">Checkout connection is being prepared.</h3>
            <p className="mt-5 text-sm leading-7 text-smoke">
              Your selected clarity pack is ready: {reportCount} Relationship Reports and {guideChats} Guide Chats for ₹{formatInr(totalPrice)}.
            </p>
            <div className="mt-6 grid gap-3">
              <button type="button" onClick={() => setModalOpen(false)} className="glass-button px-5 py-4 font-mono text-xs uppercase tracking-[0.16em] text-smoke">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
