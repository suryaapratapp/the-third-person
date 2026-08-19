import { useEffect, useState } from 'react';
import { fetchCreditBalances } from '../lib/creditsService.js';
import { useRouter } from '../state/RouterContext.jsx';

// Reports remaining, in the header.
//
// Sits next to the primary action because it answers the question people have
// immediately before pressing it. A balance discovered only at checkout is a
// balance that feels like a trap.
//
// The mark is two overlapping rings with a dot between them — the same idea as
// the wordmark: two people, and the third position that reads them. It doubles
// as the free-report signal, filled when a free one is still unspent.
function BalanceMark({ free }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
      <circle cx="9" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.85" />
      <circle cx="15" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.85" />
      <circle cx="12" cy="12" r="2" fill="currentColor" opacity={free ? 1 : 0.55} />
    </svg>
  );
}

export default function ReportBalance({ signedIn }) {
  const { navigate } = useRouter();
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    if (!signedIn) { setBalance(null); return undefined; }
    let active = true;
    fetchCreditBalances()
      .then((result) => { if (active) setBalance(result); })
      .catch(() => {});
    return () => { active = false; };
  }, [signedIn]);

  if (!signedIn || !balance?.available) return null;

  const total = balance.relationshipReportsLeft || 0;
  const free = (balance.freeReportsLeft || 0) > 0;
  const empty = total === 0;

  return (
    <button
      type="button"
      onClick={() => navigate(empty ? '/pricing' : '/analysis/new')}
      title={free ? 'You have a free report to use' : `${total} report${total === 1 ? '' : 's'} left`}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
        free
          ? 'border-good/40 bg-good/10 text-good hover:border-good'
          : empty
            ? 'border-line text-ash hover:border-lineStrong hover:text-ink'
            : 'border-signal/40 bg-accentWash text-signalStrong hover:border-signal'
      }`}
    >
      <BalanceMark free={free} />
      {/* The label is the useful half on a narrow screen, so the NUMBER stays
          and the word drops rather than the other way round. */}
      <span>{total}</span>
      <span className="hidden sm:inline">{free ? 'free report' : total === 1 ? 'report' : 'reports'}</span>
    </button>
  );
}
