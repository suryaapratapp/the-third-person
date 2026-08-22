import { useEffect, useState } from 'react';
import { PiCheck, PiMinus, PiPlus } from 'react-icons/pi';
import { fetchCreditBalances } from '../lib/creditsService.js';
import { pendingCashfreeOrder, resumeCashfreeOrder, runCheckout } from '../lib/paymentsService.js';
import { useAuth } from '../state/AuthContext.jsx';
import { useRouter } from '../state/RouterContext.jsx';

// Pricing, reduced to the one decision it actually asks for: how many reports.
//
// It previously offered three separate controls for that single number — a
// 1–50 slider, a +/- stepper, and four quick-pick buttons — then showed the
// resulting total in three places (three stat cards, a "live summary" panel,
// and the pay button). Around that sat a hero panel, two full-width balance
// cards, and a sidebar of seven explainer boxes.
//
// Deliberately NOT tiered into packs: the price is strictly linear at ₹249 per
// report, so "1 / 3 / 10" cards would imply a bulk discount that does not
// exist. A quantity picker is the honest shape for linear pricing.

const PRICE_PER_REPORT = 249;
const CHATS_PER_REPORT = 5;
const MIN_REPORTS = 1;
const MAX_REPORTS = 50;
const QUICK_PICKS = [1, 3, 5];

function formatInr(value) {
  return new Intl.NumberFormat('en-IN').format(value);
}

function clampReports(value) {
  const next = Number.parseInt(value, 10);
  if (!Number.isFinite(next)) return MIN_REPORTS;
  return Math.min(MAX_REPORTS, Math.max(MIN_REPORTS, next));
}

const FACTS = [
  ['Credits never expire', 'Buy once and use them whenever. There is no subscription and nothing renews.'],
  ['Re-reading is always free', 'Opening a report you already own never costs a credit, however many times you open it.'],
  ['Failures are not charged', 'If a report or a coach reply fails to generate, your balance is left untouched.'],
];

export default function PricingPage() {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [reportCount, setReportCount] = useState(1);
  const [message, setMessage] = useState('');
  const [paying, setPaying] = useState(false);
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

  // Picking a payment back up after a redirect.
  //
  // UPI and netbanking leave the site entirely, so for those methods this is
  // not an edge case — it is the NORMAL return path, and without it someone
  // would land back on the pricing page with no sign their money had done
  // anything. Cashfree sends them to /pricing?cf_order=…; we confirm it
  // server-side and clean the parameter out of the URL either way.
  useEffect(() => {
    if (!user || !pendingCashfreeOrder()) return undefined;
    let mounted = true;
    setPaying(true);
    resumeCashfreeOrder()
      .then(async (result) => {
        if (!mounted || !result) return;
        if (result.success) {
          setBalances(await fetchCreditBalances());
          setMessage(
            result.alreadySettled
              ? 'This payment was already processed — your credits are up to date.'
              : 'Payment successful. Your credits have been added.',
          );
        } else if (result.error) {
          setMessage(result.error);
        }
      })
      .finally(() => {
        if (!mounted) return;
        setPaying(false);
        try {
          const url = new URL(window.location.href);
          if (url.searchParams.has('cf_order')) {
            url.searchParams.delete('cf_order');
            window.history.replaceState({}, '', url.toString());
          }
        } catch {
          /* leaving the parameter in place is harmless */
        }
      });
    return () => {
      mounted = false;
    };
  }, [user]);

  function updateReports(value) {
    setReportCount(clampReports(value));
  }

  async function handleCheckout() {
    setMessage('');
    if (!user) {
      navigate('/auth?next=/pricing');
      return;
    }
    setPaying(true);
    try {
      const result = await runCheckout({ reportCount, packId: 'clarity' });
      setBalances(await fetchCreditBalances());
      setMessage(
        result.alreadySettled
          ? 'This payment was already processed — your credits are up to date.'
          : 'Payment successful. Your credits have been added.',
      );
    } catch (error) {
      // `redirecting` means a UPI or netbanking flow has taken the page over.
      // Saying anything discouraging here would be wrong — the payment is
      // still in progress and resumes on the way back.
      if (error.redirecting) return;
      if (!error.cancelled) setMessage(error.message || 'Could not start checkout. Please try again.');
    } finally {
      setPaying(false);
    }
  }

  const hasBalance = balances && (balances.paidRelationshipReportsLeft > 0 || balances.paidBestieChatsLeft > 0);

  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-24 sm:px-8 sm:pt-28">

      <div className="relative mx-auto max-w-[760px]">
        {reason === 'usage-limit' && (
          <div className="mb-6 rounded-sm border border-warn/35 bg-warn/10 p-4 sm:p-5">
            <p className="tech-label text-warn">You’re out of credits</p>
            <p className="mt-2.5 text-sm leading-7 text-smoke">Top up below to keep analysing conversations and asking the coach.</p>
          </div>
        )}

        <div className="text-center">
          <p className="tech-label text-signal">Pricing</p>
          <h1 className="serif-title mt-4 text-4xl leading-tight sm:text-6xl">Pay for what you use.</h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-smoke sm:text-base sm:leading-8">
            No subscription. One price per report, and every report comes with {CHATS_PER_REPORT} coach chats
            to ask follow-up questions about it.
          </p>
        </div>

        {hasBalance && (
          <p className="mt-7 rounded-sm border border-good/35 bg-good/10 px-5 py-3 text-center text-sm text-smoke">
            You have <span className="text-bone">{balances.paidRelationshipReportsLeft}</span> report
            {balances.paidRelationshipReportsLeft === 1 ? '' : 's'} and{' '}
            <span className="text-bone">{balances.paidBestieChatsLeft}</span> coach chat
            {balances.paidBestieChatsLeft === 1 ? '' : 's'} left.
          </p>
        )}

        <div className="hud-frame accent-panel mt-7 p-5 sm:p-8">
          <span className="hud-corner hud-corner-tl" aria-hidden="true" />
          <span className="hud-corner hud-corner-br" aria-hidden="true" />
          <div className="flex items-baseline justify-between gap-4">
            <p className="tech-label text-signal">How many reports?</p>
            <span className="neon-chip">₹{PRICE_PER_REPORT} each</span>
          </div>

          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => updateReports(reportCount - 1)}
              disabled={reportCount <= MIN_REPORTS}
              aria-label="Decrease reports"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-paper text-ink transition hover:border-signal disabled:opacity-35"
            >
              <PiMinus />
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={MIN_REPORTS}
              max={MAX_REPORTS}
              value={reportCount}
              onChange={(event) => updateReports(event.target.value)}
              aria-label="Number of reports"
              /* Sized to sit level with its own +/- buttons. At 64px tall and
                 36px type it was larger than the page heading, for a number
                 that is 1 on almost every purchase. */
              className="h-11 w-20 rounded-lg border border-line bg-well text-center text-xl font-semibold text-ink outline-none focus:border-signal"
            />
            <button
              type="button"
              onClick={() => updateReports(reportCount + 1)}
              disabled={reportCount >= MAX_REPORTS}
              aria-label="Increase reports"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-paper text-ink transition hover:border-signal disabled:opacity-35"
            >
              <PiPlus />
            </button>
          </div>

          <div className="mt-4 flex justify-center gap-2">
            {QUICK_PICKS.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => updateReports(count)}
                className={`min-h-[44px] rounded-sm border px-5 text-xs transition ${
                  reportCount === count
                    ? 'border-signal/35 bg-signal/10 text-bone'
                    : 'border-line bg-paper text-smoke hover:border-signal/35'
                }`}
              >
                {count}
              </button>
            ))}
          </div>

          <dl className="mt-7 border-t border-line pt-5 text-sm">
            <div className="flex items-center justify-between py-2">
              <dt className="text-smoke">Relationship reports</dt>
              <dd className="text-bone">{reportCount}</dd>
            </div>
            <div className="flex items-center justify-between py-2">
              <dt className="text-smoke">Coach chats included</dt>
              <dd className="text-bone">{guideChats}</dd>
            </div>
            <div className="mt-2 flex items-baseline justify-between border-t border-line pt-4">
              <dt className="text-bone">Total</dt>
              <dd className="serif-title text-4xl leading-none text-bone">₹{formatInr(totalPrice)}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={paying}
            className="btn btn-primary mt-6 w-full text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {paying ? 'Processing…' : `Pay ₹${formatInr(totalPrice)}`}
          </button>

          <p className="mt-4 text-center text-xs leading-6 text-ash">
            By continuing you agree to our{' '}
            <button type="button" onClick={() => navigate('/terms')} className="-my-3 py-3 text-signal underline hover:text-bone">Terms of Service</button>
            {' '}and{' '}
            <button type="button" onClick={() => navigate('/refund-policy')} className="-my-3 py-3 text-signal underline hover:text-bone">Refund Policy</button>.
          </p>
        </div>

        {/* The in-flow price differs from this one and never used to be
            explained anywhere, which reads as inconsistent pricing. */}
        <p className="mt-5 rounded-sm border border-line bg-paper p-4 text-sm leading-7 text-smoke">
          Starting an analysis with no credits offers a <span className="text-bone">₹199</span> report-only
          option too — no coach chats included. The ₹{PRICE_PER_REPORT} bundle above is the only way to get
          both together.
        </p>

        <div className="mt-8 grid gap-2.5">
          {FACTS.map(([title, body]) => (
            <div key={title} className="flex gap-3 rounded-sm border border-line bg-paper p-4">
              <PiCheck className="mt-1 shrink-0 text-good" aria-hidden="true" />
              <div>
                <p className="text-sm text-bone">{title}</p>
                <p className="mt-1 text-sm leading-6 text-smoke">{body}</p>
              </div>
            </div>
          ))}
        </div>

        {message && (
          <p className="mt-5 rounded-sm border border-signal/35 bg-signal/10 p-4 text-sm leading-7 text-smoke">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
