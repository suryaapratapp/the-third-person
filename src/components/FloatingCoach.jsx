import { useEffect, useRef, useState } from 'react';
import { PiX } from 'react-icons/pi';
import CoachBot from './CoachBot.jsx';
import { useRouter } from '../state/RouterContext.jsx';

// The coach, riding along the top-right of a finished report.
//
// A report is long — several screens on a phone — and the one place we invite
// people to ask a question about it is the card at the very bottom. Anyone who
// stops reading two-thirds down never sees it. This keeps the invitation on
// screen from the moment they start reading properly.
//
// Deliberately restrained about when it shows:
//   - not over the report header, where it would fight the person's name
//   - not while the full "ask the coach" card is already in view, which would
//     be the same offer twice on one screen
//   - never again this session once dismissed
//
// Both conditions are IntersectionObservers, not a scroll listener. A scroll
// handler on a page this long runs on every frame of every flick and has to be
// rAF-throttled to stay cheap; observers cost nothing until they cross, which
// matters more here than anywhere else in the app because the report is the
// heaviest page we render.
//
// The first observer watches a tall invisible sentinel pinned to the top of the
// containing section: while any of it is on screen the reader is still in the
// header, and the moment it leaves they are into the report proper. That makes
// the parent's `position: relative` load-bearing — mount this inside the
// section it belongs to, not at the page root.
//
// The bubble is a real button on desktop and collapses to the mascot alone on a
// phone, where 56px in the corner is as much as the screen can spare.

const HEADER_ZONE_PX = 560;
const DISMISS_KEY = 'tp:floating-coach-dismissed';

export default function FloatingCoach({ chainId }) {
  const { navigate } = useRouter();
  const sentinelRef = useRef(null);
  const [pastHeader, setPastHeader] = useState(false);
  const [ctaOnScreen, setCtaOnScreen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return window.sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (dismissed) return undefined;

    const observers = [];

    const sentinel = sentinelRef.current;
    if (sentinel) {
      const headerWatch = new IntersectionObserver(
        ([entry]) => setPastHeader(!entry.isIntersecting),
        { threshold: 0 },
      );
      headerWatch.observe(sentinel);
      observers.push(headerWatch);
    }

    // AfterReportActions makes the same offer at full size. While that is on
    // screen the floating one stands down.
    const cta = document.querySelector('[data-coach-cta]');
    if (cta) {
      const ctaWatch = new IntersectionObserver(
        ([entry]) => setCtaOnScreen(entry.isIntersecting),
        { threshold: 0.15 },
      );
      ctaWatch.observe(cta);
      observers.push(ctaWatch);
    }

    return () => observers.forEach((observer) => observer.disconnect());
  }, [dismissed]);

  if (dismissed) return null;

  const visible = pastHeader && !ctaOnScreen;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* private mode — it simply comes back on the next report */
    }
  };

  return (
    <>
      <span
        ref={sentinelRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 w-px"
        style={{ height: HEADER_ZONE_PX }}
      />
      <div
        data-export-ignore
        aria-hidden={!visible}
        className={`fixed right-3 top-[80px] z-40 transition-all duration-300 sm:right-6 sm:top-[96px] ${
          visible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-3 opacity-0'
        }`}
      >
        <div className="relative">
          <button
            type="button"
            onClick={() => navigate(chainId ? `/reports/${encodeURIComponent(chainId)}/coach` : '/reports')}
            tabIndex={visible ? 0 : -1}
            className="group flex items-center gap-2 rounded-sm border border-pink-200 bg-signal py-2 pl-2 pr-2.5 text-left shadow-glow transition hover:border-pink-200 sm:gap-3 sm:pr-4"
          >
            <CoachBot size={40} mood="happy" />
            <span className="hidden sm:block">
              <span className="block text-xs text-pink-700">
                Coach
              </span>
              <span className="block text-sm leading-5 text-bone">Ask about this report</span>
            </span>
          </button>
          <button
            type="button"
            onClick={dismiss}
            tabIndex={visible ? 0 : -1}
            aria-label="Hide the coach shortcut"
            className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-paper text-ash transition hover:text-bone"
          >
            <PiX className="text-[0.7rem]" aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  );
}
