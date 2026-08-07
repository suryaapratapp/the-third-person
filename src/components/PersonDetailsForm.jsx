import { getZodiacGlyph, getZodiacSign } from '../lib/zodiac.js';

// Two fields, one required. The old version stacked a `grid gap-6` and then
// added `mt-4` to the inputs inside it, so labels floated a long way from the
// field they described, and the zodiac result — the only live feedback in the
// whole wizard — appeared as a 10px mono line that was easy to miss.

export default function PersonDetailsForm({ value, onChange, dateOfBirth = '', onDateChange }) {
  const sign = getZodiacSign(dateOfBirth);

  return (
    <div className="grid max-w-2xl gap-6">
      <div>
        <label className="tech-label text-smoke" htmlFor="person-name">
          Their name or nickname
        </label>
        <input
          id="person-name"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="e.g. Avery"
          autoComplete="off"
          className="mt-3 w-full rounded-sm border border-line bg-well px-4 py-4 text-lg text-bone outline-none transition placeholder:text-ash focus:border-purple-200"
        />
        <p className="mt-2.5 text-sm leading-6 text-smoke">
          Used throughout your report. Pick something distinctive if you know two people with the same name.
        </p>
      </div>

      <div className="rounded-sm border border-purple-200 bg-purple-50 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="tech-label text-purple-700" htmlFor="person-dob">
            Their date of birth
          </label>
          <span className="rounded-sm border border-line px-2.5 py-1 text-xs text-ash">
            Optional
          </span>
        </div>
        <input
          id="person-dob"
          type="date"
          value={dateOfBirth}
          onChange={(event) => onDateChange?.(event.target.value)}
          className="mt-3 w-full rounded-sm border border-line bg-well px-4 py-4 text-lg text-bone outline-none transition focus:border-purple-200"
        />

        {sign ? (
          <div className="mt-3 flex items-center gap-3 rounded-sm border border-purple-200 bg-purple-50 px-4 py-3">
            <span className="text-3xl leading-none" aria-hidden="true">{getZodiacGlyph(sign)}</span>
            <div>
              <p className="text-base leading-5 text-bone">{sign}</p>
              <p className="mt-0.5 text-xs leading-4 text-smoke">
                Your report will include a compatibility layer for this sign.
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-smoke">
            Adds a zodiac compatibility section to your report. Skip it and everything else works the same.
          </p>
        )}
      </div>
    </div>
  );
}
