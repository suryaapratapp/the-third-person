import { DAY_LABELS } from '../lib/conversationRhythm.js';

// When this relationship actually happens.
//
// Seven rows, twenty-four columns, one cell per weekday-hour. It is the fastest
// chart in the report to read: nobody needs the legend explained to see that
// their chat lives at 1am, or only on weekends, or strictly during office
// lunch breaks — the shape says it before the words do.
//
// Rendered as divs rather than SVG on purpose. 168 cells is well inside what
// the browser lays out in one frame, it stays selectable and zoomable, and it
// needs no viewBox maths to stay crisp on a phone.

// Five steps, not a continuous ramp. A smooth gradient looks precise and is
// unreadable — you cannot tell 40% from 55% by eye, so the scale does not
// pretend you can.
const STEPS = [
  { at: 0, className: 'bg-well', label: 'none' },
  { at: 0.01, className: 'bg-signal/25', label: 'a little' },
  { at: 0.2, className: 'bg-signal/45', label: 'some' },
  { at: 0.45, className: 'bg-signal/70', label: 'a lot' },
  { at: 0.7, className: 'bg-signal', label: 'most' },
];

function stepFor(share) {
  let match = STEPS[0];
  STEPS.forEach((step) => {
    if (share >= step.at) match = step;
  });
  return match;
}

// Every six hours. Labelling all 24 is unreadable at any phone width.
const HOUR_TICKS = [0, 6, 12, 18];

export default function RhythmHeatmap({ rhythm }) {
  if (!rhythm?.grid) return null;
  const { grid, peak } = rhythm;

  return (
    <section aria-label="When you talk">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="tech-label">When you talk</p>
        <p className="text-xs text-ash">Busiest: {rhythm.peakLabel}</p>
      </div>

      <div className="mt-3 rounded-lg border border-line bg-paper p-3 sm:p-4">
        <div className="flex gap-1.5">
          {/* Day labels sit outside the grid so the cells can be square-ish
              and evenly divide whatever width is left. */}
          <div className="flex shrink-0 flex-col gap-[2px] pt-[1px]">
            {DAY_LABELS.map((day) => (
              <span key={day} className="flex h-[13px] items-center text-[0.65rem] leading-none text-ash sm:h-4">
                {day}
              </span>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-[2px]">
              {grid.map((row, dayIndex) => (
                <div key={DAY_LABELS[dayIndex]} className="flex gap-[2px]">
                  {row.map((count, hour) => {
                    const share = peak ? count / peak : 0;
                    const step = stepFor(share);
                    return (
                      <span
                        key={hour}
                        // The tooltip is the whole interaction. Adding a click
                        // target for 168 cells would be 168 tab stops for one
                        // number each.
                        title={`${DAY_LABELS[dayIndex]} ${hour}:00 — ${count} message${count === 1 ? '' : 's'}`}
                        className={`h-[13px] min-w-0 flex-1 rounded-[2px] sm:h-4 ${step.className}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="relative mt-1.5 h-3">
              {HOUR_TICKS.map((hour) => (
                <span
                  key={hour}
                  className="absolute text-[0.65rem] leading-none text-ash"
                  style={{ left: `${(hour / 24) * 100}%` }}
                >
                  {hour === 0 ? '12am' : hour === 12 ? '12pm' : hour < 12 ? `${hour}am` : `${hour - 12}pm`}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-3">
          <div className="flex items-center gap-1.5 text-xs text-ash">
            <span>Quieter</span>
            {STEPS.map((step) => (
              <span key={step.label} className={`h-3 w-3 rounded-[2px] ${step.className}`} aria-hidden="true" />
            ))}
            <span>Busier</span>
          </div>
          <p className="text-xs text-ash">
            {rhythm.weekendShare}% at weekends · {rhythm.lateNightShare}% after 11pm
          </p>
        </div>
      </div>
    </section>
  );
}
