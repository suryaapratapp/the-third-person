import { useEffect, useRef, useState } from 'react';
import CoachBot from './CoachBot.jsx';

// The wait.
//
// A report now costs real time — the analysis reads every period of the chat
// rather than sampling ten of them — so the wait has to be worth watching
// instead of apologised for. Three things do that work:
//
//   1. A stage list that actually advances, so the bar is reporting progress
//      rather than performing it.
//   2. A creeping percentage inside each stage, because a bar that sits still
//      for twenty seconds reads as a hung page no matter what the label says.
//   3. Rotating lines about what is being read right now.
//
// The percentage eases towards the END of the current stage and stops there,
// so it can never run ahead of the real work. When a stage genuinely
// completes, it jumps — which is the moment that feels like progress.
//
// And it ALWAYS finishes. `done` runs it to 100 with every stage ticked before
// the report is revealed; see the finish effect below for why that is worth a
// deliberate second and a half.

export const STAGES = [
  { key: 'read', label: 'Reading every message', to: 18 },
  { key: 'slice', label: 'Splitting the history into periods', to: 34 },
  { key: 'periods', label: 'Reading each period on its own', to: 62 },
  { key: 'subtext', label: 'Working out what was meant, not just said', to: 74 },
  { key: 'moments', label: 'Finding the moments that mattered', to: 86 },
  { key: 'build', label: 'Writing your report', to: 97 },
];

const FLAVOUR = [
  'counting who texted first, 4,000 times over',
  'checking whether "fine" actually meant fine',
  'timestamping every 2am conversation',
  'deciding if that insult was affection',
  'measuring the silence between replies',
  'looking for the week it changed',
  'reading the emoji as punctuation',
  'no vibes — only receipts',
  'catching the sarcasm a literal reader misses',
  'finding what you were too close to notice',
];

// How long a stage may sit before the list advances on its own. The backend
// hands us a stage at three points only, and the longest gap between them is
// the whole model call — so without this the bar would freeze mid-run.
const DWELL_MS = 18000;

// The finish, in two parts: ramp to 100, then hold there long enough to read.
const RAMP_MS = 900;
const HOLD_MS = 600;

const indexOfStage = (key) => {
  const found = STAGES.findIndex((stage) => stage.key === key);
  return found < 0 ? 0 : found;
};

export default function AnalysisProgress({ stageKey = 'read', done = false, onFinished, messageCount = 0 }) {
  const [index, setIndex] = useState(0);
  const [percent, setPercent] = useState(2);
  const [flavour, setFlavour] = useState(0);

  // The finish ramp needs the CURRENT percentage as a starting point, and it
  // cannot read it from state without making itself re-run on every tick.
  const percentRef = useRef(2);
  percentRef.current = percent;
  const finishRef = useRef(onFinished);
  finishRef.current = onFinished;

  // Follow the caller, and never go backwards.
  //
  // This used to match loosely against the stage's prose, which is how the bar
  // came to freeze at 34%: a stage string was added ("Creating paid
  // relationship intelligence…") that happened to contain none of the tokens
  // the matcher looked for, so it mapped to nothing and the index sat on
  // "Splitting the history into periods" for the entire model call. Explicit
  // keys cannot drift out of sync with the copy the way that did.
  useEffect(() => {
    setIndex((current) => Math.max(current, indexOfStage(stageKey)));
  }, [stageKey]);

  // Advance on dwell time rather than total elapsed time, so a stage that
  // genuinely arrives late still gets its own full slot rather than being
  // skipped by a clock that started at mount.
  useEffect(() => {
    if (done) return undefined;
    const timer = window.setTimeout(() => {
      setIndex((current) => Math.min(STAGES.length - 1, current + 1));
    }, DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [index, done]);

  // Ease towards the current stage's ceiling and stop short of it.
  useEffect(() => {
    if (done) return undefined;
    const target = STAGES[index].to;
    const timer = window.setInterval(() => {
      setPercent((current) => (current >= target ? current : current + Math.max(0.15, (target - current) * 0.06)));
    }, 120);
    return () => window.clearInterval(timer);
  }, [index, done]);

  // The finish.
  //
  // The report used to appear the instant the request resolved, whatever the
  // bar happened to be showing — so a fast run cut from 34% straight to a full
  // report, which reads as the progress having been fake. It was not fake, but
  // being right is not the same as looking right. Every run now ends the same
  // way: ramp to 100, tick every stage, hold for a beat, then reveal.
  useEffect(() => {
    if (!done) return undefined;
    const from = percentRef.current;
    const startedAt = Date.now();
    setIndex(STAGES.length - 1);
    const timer = window.setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / RAMP_MS);
      setPercent(from + (100 - from) * progress);
      if (progress >= 1) window.clearInterval(timer);
    }, 40);
    const reveal = window.setTimeout(() => finishRef.current?.(), RAMP_MS + HOLD_MS);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(reveal);
    };
  }, [done]);

  useEffect(() => {
    const timer = window.setInterval(() => setFlavour((n) => (n + 1) % FLAVOUR.length), 3400);
    return () => window.clearInterval(timer);
  }, []);

  const rounded = done ? Math.round(percent) : Math.min(99, Math.round(percent));
  const complete = rounded >= 100;

  return (
    <div
      className="theme-deep fixed inset-0 z-[90] flex items-center justify-center bg-canvas px-4"
      role="status"
      aria-live="polite"
      aria-label="Building your report"
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <span className="coach-orb grid h-[76px] w-[76px] place-items-center rounded-full">
            <CoachBot size={56} mood={complete ? 'happy' : 'thinking'} />
          </span>

          {/* The number is the hero. It is the one thing anyone actually looks
              at while waiting, so it gets display size and tabular figures so
              the layout does not jitter as digits change. */}
          <p
            className="mt-5 text-6xl font-bold leading-none tracking-tight text-ink sm:text-7xl"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {rounded}
            <span className="text-3xl text-ash">%</span>
          </p>

          <p className="mt-3 text-base font-semibold text-ink">
            {complete ? 'Your report is ready' : STAGES[index].label}
          </p>
          <p className="mt-1 h-5 text-sm text-ash">{complete ? 'opening it now' : FLAVOUR[flavour]}</p>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-well">
          <div
            className="progress-shimmer h-full rounded-full transition-[width] duration-500 ease-out"
            style={{ width: `${rounded}%` }}
          />
        </div>

        <ol className="mt-5 grid gap-1.5">
          {STAGES.map((item, position) => {
            const finished = complete || position < index;
            const current = !complete && position === index;
            return (
              <li
                key={item.key}
                className={`flex items-center gap-2.5 text-sm transition ${
                  current ? 'text-ink' : finished ? 'text-ash' : 'text-ash opacity-45'
                }`}
              >
                <span
                  className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[0.6rem] transition ${
                    finished ? 'border-good bg-good text-[color:var(--canvas)]' : current ? 'border-signal' : 'border-line'
                  }`}
                  aria-hidden="true"
                >
                  {finished ? '✓' : ''}
                </span>
                <span className={current ? 'font-medium' : ''}>{item.label}</span>
                {current && <span className="loading-dots ml-auto text-ash" aria-hidden="true" />}
              </li>
            );
          })}
        </ol>

        <p className="mt-6 text-center text-xs leading-6 text-ash">
          {messageCount ? `${messageCount.toLocaleString()} messages · ` : ''}
          this one is worth the wait. Keep this tab open.
        </p>
      </div>
    </div>
  );
}
