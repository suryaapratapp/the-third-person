import { useEffect, useRef, useState } from 'react';
import { PiX } from 'react-icons/pi';
import CoachBot from './CoachBot.jsx';

// The coach, riding the right edge of a finished report.
//
// A report is long — several screens on a phone — and the one place we invite
// people to ask a question about it is the card at the very bottom. Anyone who
// stops reading two-thirds down never sees it. This keeps the invitation on
// screen from the moment they start reading properly.
//
// Vertically centred rather than tucked under the header: the middle of the
// right edge is where a thumb already rests on a phone, and it stops the bot
// colliding with the page heading.
//
// DRAGGABLE, because wherever we park it, it will sometimes sit on top of the
// one thing someone is trying to read. The position persists, so moving it is
// a decision made once. A drag that travels almost nowhere is treated as a tap
// — otherwise the button becomes unclickable on a touchscreen, where no press
// is perfectly still.
//
// Deliberately restrained about when it shows:
//   - not over the report header, where it would fight the person's name
//   - not while the full "ask the coach" card is already in view, which would
//     be the same offer twice on one screen
//   - never again this session once dismissed
//
// Both conditions are IntersectionObservers, not a scroll listener. A scroll
// handler on a page this long runs on every frame of every flick; observers
// cost nothing until they cross.

const HEADER_ZONE_PX = 560;
const DISMISS_KEY = 'tp:floating-coach-dismissed';
const NUDGE_KEY = 'tp:floating-coach-nudged';
const POSITION_KEY = 'tp:floating-coach-position';

// Below this, a pointer movement is a tap that wobbled, not a drag.
const DRAG_THRESHOLD_PX = 6;

const NUDGES = [
  'psst — ask me anything about this',
  'stuck on something? I read the whole thing',
  'go on, ask me the awkward one',
];

function readStored(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key, value) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* private mode — the feature simply resets next session */
  }
}

function loadPosition() {
  try {
    const raw = window.localStorage.getItem(POSITION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.x === 'number' && typeof parsed?.y === 'number' ? parsed : null;
  } catch {
    return null;
  }
}

export default function FloatingCoach({ onOpen }) {
  const sentinelRef = useRef(null);
  const nodeRef = useRef(null);
  const [pastHeader, setPastHeader] = useState(false);
  const [ctaOnScreen, setCtaOnScreen] = useState(false);
  const [dismissed, setDismissed] = useState(() => readStored(DISMISS_KEY) === '1');
  const [nudge, setNudge] = useState(false);
  const [position, setPosition] = useState(loadPosition);
  const [dragging, setDragging] = useState(false);
  const drag = useRef(null);

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

  const visible = pastHeader && !ctaOnScreen && !dismissed;

  // One nudge per session, a beat after the bot appears, gone after six
  // seconds. Any longer and it stops reading as a hint and starts reading as
  // an ad you cannot close.
  useEffect(() => {
    if (!visible || readStored(NUDGE_KEY) === '1') return undefined;
    const show = window.setTimeout(() => {
      setNudge(true);
      writeStored(NUDGE_KEY, '1');
    }, 1200);
    const hide = window.setTimeout(() => setNudge(false), 7200);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [visible]);

  // Pointer events rather than mouse/touch pairs: one code path covers mouse,
  // touch and pen, and setPointerCapture keeps the drag alive when the pointer
  // leaves the button — which it does immediately, because the button moves.
  const onPointerDown = (event) => {
    const rect = nodeRef.current?.getBoundingClientRect();
    if (!rect) return;
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event) => {
    const state = drag.current;
    if (!state) return;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    if (!state.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    state.moved = true;
    setDragging(true);
    const node = nodeRef.current;
    const width = node?.offsetWidth || 88;
    const height = node?.offsetHeight || 88;
    // Clamped to the viewport, so it can never be dragged somewhere it cannot
    // be dragged back from.
    const next = {
      x: Math.min(Math.max(8, event.clientX - state.offsetX), window.innerWidth - width - 8),
      y: Math.min(Math.max(72, event.clientY - state.offsetY), window.innerHeight - height - 16),
    };
    // Kept on the ref as well as in state: pointerup fires before React has
    // committed the last setPosition, so reading the DOM there persists the
    // position from one drag ago.
    state.last = next;
    setPosition(next);
  };

  const onPointerUp = (event) => {
    const state = drag.current;
    drag.current = null;
    setDragging(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (!state) return;
    if (!state.moved) {
      onOpen();
      return;
    }
    if (!state.last) return;
    try {
      window.localStorage.setItem(POSITION_KEY, JSON.stringify(state.last));
    } catch {
      /* position simply resets on reload */
    }
  };

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    writeStored(DISMISS_KEY, '1');
  };

  const placement = position
    ? { left: position.x, top: position.y }
    // Default: middle of the right edge. `top-1/2` plus a translate would fight
    // the drag transform, so it is computed as a plain offset instead.
    : { right: 12, top: '50%', transform: 'translateY(-50%)' };

  return (
    <>
      <span
        ref={sentinelRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 w-px"
        style={{ height: HEADER_ZONE_PX }}
      />
      <div
        ref={nodeRef}
        data-export-ignore
        aria-hidden={!visible}
        style={placement}
        className={`fixed z-40 ${dragging ? '' : 'transition-opacity duration-300'} ${
          visible ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="relative">
          {nudge && visible && (
            <div
              className="pointer-events-none absolute right-full top-1/2 mr-2 w-max max-w-[46vw] -translate-y-1/2 rounded-2xl rounded-br-md border border-signal/40 bg-paper px-3 py-2 text-xs font-medium leading-5 text-ink shadow-raised sm:max-w-none"
              role="status"
            >
              {NUDGES[0]}
            </div>
          )}

          <button
            type="button"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            tabIndex={visible ? 0 : -1}
            aria-label="Ask the relationship coach about this report"
            title="Ask the coach — drag to move"
            // No ring, no plate. The bot is the button: a circle drawn around a
            // character makes it look like an avatar in a list rather than
            // something to press. `touch-none` stops the browser claiming the
            // gesture as a scroll before the drag handler sees it.
            className={`coach-float grid h-[88px] w-[88px] touch-none place-items-center transition-transform duration-150 ${
              dragging ? 'scale-105 cursor-grabbing' : 'cursor-grab hover:scale-105'
            }`}
          >
            <CoachBot size={78} mood="happy" />
          </button>

          <button
            type="button"
            onClick={dismiss}
            tabIndex={visible ? 0 : -1}
            aria-label="Hide the coach shortcut"
            className="absolute -left-1 -top-1 grid h-6 w-6 place-items-center rounded-full border border-line bg-paper text-ash shadow-glow transition hover:text-ink"
          >
            <PiX className="text-[0.65rem]" aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  );
}
