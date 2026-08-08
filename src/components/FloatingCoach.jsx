import { useEffect, useRef, useState } from 'react';
import { PiX } from 'react-icons/pi';
import CoachBot from './CoachBot.jsx';

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
// The mascot alone, with no label. A pill reading "Ask about this report" was
// wider than a phone's whole right margin and covered the report while it sat
// there; the bot is recognisable on its own, and the corner of a report is not
// where anyone reads copy anyway. It gets a soft accent bloom instead so it
// stays findable against a dark page without shouting.

const HEADER_ZONE_PX = 560;
const DISMISS_KEY = 'tp:floating-coach-dismissed';

export default function FloatingCoach({ onOpen }) {
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
        className={`fixed right-3 top-[76px] z-40 transition-all duration-300 sm:right-6 sm:top-[92px] ${
          visible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-3 opacity-0'
        }`}
      >
        <div className="relative">
          <button
            type="button"
            onClick={onOpen}
            tabIndex={visible ? 0 : -1}
            aria-label="Ask the relationship coach about this report"
            title="Ask the coach about this report"
            className="coach-orb grid h-[68px] w-[68px] place-items-center rounded-full transition duration-200 hover:scale-105 active:scale-100 sm:h-[76px] sm:w-[76px]"
          >
            <CoachBot size={52} mood="happy" />
          </button>
          <button
            type="button"
            onClick={dismiss}
            tabIndex={visible ? 0 : -1}
            aria-label="Hide the coach shortcut"
            className="absolute -left-1 -top-1 grid h-7 w-7 place-items-center rounded-full border border-line bg-paper text-ash shadow-glow transition hover:text-ink"
          >
            <PiX className="text-[0.7rem]" aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  );
}
