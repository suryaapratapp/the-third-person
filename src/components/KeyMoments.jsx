import { useState } from 'react';

// The detailed relationship timeline: what actually happened, in order.
//
// The old timeline was 3-6 phases with names like "Warm start" — true, but
// nothing you did not already know. This is the event log underneath it: the
// fight, the reunion, the plan that fell through, on the day it happened.
//
// The filtering happens in the prompt, not here. If a period was genuinely
// unremarkable the model returns no events for it, and an honest short list
// beats a padded long one.

const CATEGORY = {
  milestone: { label: 'Milestone', icon: '★', tone: 'good' },
  conflict: { label: 'Conflict', icon: '⚡', tone: 'risk' },
  repair: { label: 'Repair', icon: '✿', tone: 'good' },
  distance: { label: 'Distance', icon: '◌', tone: 'warn' },
  reunion: { label: 'Reunion', icon: '❋', tone: 'good' },
  support: { label: 'Support', icon: '❤', tone: 'good' },
  confession: { label: 'Confession', icon: '✦', tone: 'you' },
  plan: { label: 'Plan', icon: '➤', tone: 'them' },
  loss: { label: 'Loss', icon: '✖', tone: 'risk' },
  celebration: { label: 'Celebration', icon: '✧', tone: 'good' },
  decision: { label: 'Decision', icon: '◆', tone: 'them' },
  other: { label: 'Moment', icon: '•', tone: 'them' },
};

const TONE_VAR = {
  good: 'var(--good)',
  warn: 'var(--warn)',
  risk: 'var(--risk)',
  you: 'var(--you)',
  them: 'var(--them)',
};

function categoryOf(moment) {
  return CATEGORY[moment.category] || CATEGORY.other;
}

// Major moments are open by default, notable ones collapsed. A 20-event log
// fully expanded is six phone screens of prose nobody reads; the shape of the
// relationship should be scannable in one.
const DEFAULT_OPEN = 'major';

export default function KeyMoments({ moments = [] }) {
  const usable = moments.filter((moment) => moment && (moment.title || moment.whatHappened));
  const [openKeys, setOpenKeys] = useState(
    () => new Set(usable.map((moment, index) => (moment.significance === DEFAULT_OPEN ? index : null)).filter((key) => key !== null)),
  );
  const [filter, setFilter] = useState('all');

  if (!usable.length) return null;

  const categories = [...new Set(usable.map((moment) => moment.category || 'other'))];
  const shown = filter === 'all' ? usable : usable.filter((moment) => (moment.category || 'other') === filter);

  const toggle = (index) => setOpenKeys((current) => {
    const next = new Set(current);
    if (next.has(index)) next.delete(index); else next.add(index);
    return next;
  });

  return (
    <section aria-label="Key moments">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="tech-label">What actually happened</p>
        <p className="text-xs text-ash">{usable.length} moments worth remembering</p>
      </div>

      {categories.length > 2 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            aria-pressed={filter === 'all'}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
              filter === 'all' ? 'border-signal bg-accentWash text-signalStrong' : 'border-line text-ash hover:text-ink'
            }`}
          >
            All
          </button>
          {categories.map((key) => {
            const meta = CATEGORY[key] || CATEGORY.other;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                  filter === key ? 'border-signal bg-accentWash text-signalStrong' : 'border-line text-ash hover:text-ink'
                }`}
              >
                {meta.icon} {meta.label}
              </button>
            );
          })}
        </div>
      )}

      <ol className="relative mt-4 grid gap-2.5">
        {/* The spine. Absolute rather than a border on each row so it runs
            unbroken behind the markers instead of restarting at every gap. */}
        <span
          className="pointer-events-none absolute bottom-4 left-[15px] top-4 w-px bg-line"
          aria-hidden="true"
        />

        {shown.map((moment, index) => {
          const meta = categoryOf(moment);
          const color = TONE_VAR[meta.tone];
          const key = usable.indexOf(moment);
          const open = openKeys.has(key);
          const major = moment.significance === 'major';

          return (
            <li key={`${moment.date}-${moment.title}-${index}`} className="relative flex gap-3">
              <span
                className="relative z-10 mt-3 grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm"
                style={{
                  borderColor: color,
                  color,
                  background: 'var(--paper)',
                  boxShadow: major ? `0 0 0 3px rgb(from ${color} r g b / 0.15)` : 'none',
                }}
                aria-hidden="true"
              >
                {meta.icon}
              </span>

              <div className="min-w-0 flex-1 rounded-lg border border-line bg-paper">
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  aria-expanded={open}
                  className="flex w-full items-start gap-3 p-3.5 text-left sm:p-4"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-xs font-medium" style={{ color }}>{meta.label}</span>
                      {moment.date && <span className="text-xs text-ash">{moment.date}</span>}
                      {major && (
                        <span className="rounded border border-line px-1.5 py-0.5 text-[0.65rem] font-medium text-ash">
                          Major
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-[0.95rem] font-semibold leading-6 text-ink">
                      {moment.title}
                    </span>
                    {!open && moment.emotion && (
                      <span className="mt-0.5 block truncate text-xs text-ash">{moment.emotion}</span>
                    )}
                  </span>
                  <span className={`mt-1 shrink-0 text-ash transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">
                    ⌄
                  </span>
                </button>

                {open && (
                  <div className="border-t border-line px-3.5 pb-3.5 pt-3 sm:px-4">
                    <p className="text-sm leading-6 text-smoke">{moment.whatHappened}</p>

                    {moment.quote && (
                      <blockquote className="mt-3 border-l-2 pl-3 text-sm leading-6 text-smoke" style={{ borderColor: color }}>
                        “{String(moment.quote).slice(0, 240)}”
                      </blockquote>
                    )}

                    <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                      {moment.emotion && (
                        <div>
                          <dt className="text-xs text-ash">Feeling</dt>
                          <dd className="text-sm text-ink">{moment.emotion}</dd>
                        </div>
                      )}
                      {moment.whoDroveIt && (
                        <div>
                          <dt className="text-xs text-ash">Driven by</dt>
                          <dd className="text-sm text-ink">{moment.whoDroveIt}</dd>
                        </div>
                      )}
                    </dl>

                    {moment.whyItMattered && (
                      <p className="mt-3 rounded-md bg-well p-3 text-sm leading-6 text-smoke">
                        <span className="font-medium text-ink">Why it mattered: </span>
                        {moment.whyItMattered}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
