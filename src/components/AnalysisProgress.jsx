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
// The percentage is honest about what it is: it eases towards the END of the
// current stage and stops there, so it can never run ahead of the real work or
// hit 100% before the report exists. When a stage genuinely completes, it
// jumps — which is the moment that feels like progress.

const STAGES = [
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

// Maps the backend's free-text stage onto our list. The stage strings come
// from the analysis pipeline and change independently of this file, so match
// loosely and fall back to advancing on time rather than stalling.
function stageIndexFor(text = '') {
  const value = String(text).toLowerCase();
  if (/writ|build|report|final|synth/.test(value)) return 5;
  if (/moment|event|timeline|turning/.test(value)) return 4;
  if (/tone|sarcas|mean|emotion|subtext/.test(value)) return 3;
  if (/period|chunk|phase|understand/.test(value)) return 2;
  if (/split|slice|prepar/.test(value)) return 1;
  if (/read|upload|clean/.test(value)) return 0;
  return -1;
}

export default function AnalysisProgress({ stage = '', messageCount = 0 }) {
  const [index, setIndex] = useState(0);
  const [percent, setPercent] = useState(2);
  const [flavour, setFlavour] = useState(0);
  const startedAt = useRef(Date.now());

  // Follow the backend when it tells us something, and never go backwards —
  // stage strings can repeat as parallel passes report in.
  useEffect(() => {
    const mapped = stageIndexFor(stage);
    if (mapped >= 0) setIndex((current) => Math.max(current, mapped));
  }, [stage]);

  // Time-based fallback so the list still advances if the backend goes quiet
  // mid-pass. Deliberately slower than the real thing usually is.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const elapsed = (Date.now() - startedAt.current) / 1000;
      setIndex((current) => Math.max(current, Math.min(STAGES.length - 1, Math.floor(elapsed / 16))));
    }, 2000);
    return () => window.clearInterval(timer);
  }, []);

  // Ease towards the current stage's ceiling and stop. Never reaches 100 —
  // that belongs to the report appearing, not to a timer.
  useEffect(() => {
    const target = STAGES[index].to;
    const timer = window.setInterval(() => {
      setPercent((current) => (current >= target ? current : current + Math.max(0.15, (target - current) * 0.06)));
    }, 120);
    return () => window.clearInterval(timer);
  }, [index]);

  useEffect(() => {
    const timer = window.setInterval(() => setFlavour((n) => (n + 1) % FLAVOUR.length), 3400);
    return () => window.clearInterval(timer);
  }, []);

  const rounded = Math.min(99, Math.round(percent));

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
            <CoachBot size={56} mood="thinking" />
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

          <p className="mt-3 text-base font-semibold text-ink">{STAGES[index].label}</p>
          <p className="mt-1 h-5 text-sm text-ash">{FLAVOUR[flavour]}</p>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-well">
          <div
            className="progress-shimmer h-full rounded-full transition-[width] duration-500 ease-out"
            style={{ width: `${rounded}%` }}
          />
        </div>

        <ol className="mt-5 grid gap-1.5">
          {STAGES.map((item, position) => {
            const done = position < index;
            const current = position === index;
            return (
              <li
                key={item.key}
                className={`flex items-center gap-2.5 text-sm transition ${
                  current ? 'text-ink' : done ? 'text-ash' : 'text-ash opacity-45'
                }`}
              >
                <span
                  className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[0.6rem] ${
                    done ? 'border-good bg-good text-[color:var(--canvas)]' : current ? 'border-signal' : 'border-line'
                  }`}
                  aria-hidden="true"
                >
                  {done ? '✓' : ''}
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
