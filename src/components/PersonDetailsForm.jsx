import { getZodiacGlyph, getZodiacSign } from '../lib/zodiac.js';

export default function PersonDetailsForm({ value, onChange, dateOfBirth = '', onDateChange }) {
  const sign = getZodiacSign(dateOfBirth);
  return (
    <div className="grid max-w-3xl gap-6">
      <label className="tech-label text-smoke" htmlFor="person-name">Person name / nickname</label>
      <input
        id="person-name"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="e.g. Avery"
        className="mt-4 w-full border border-white/18 bg-black/50 px-4 py-4 text-lg text-bone outline-none transition placeholder:text-ash focus:border-white/55"
      />
      <p className="mt-4 text-sm leading-7 text-smoke">
        Use a unique name if you know multiple people with the same name. This helps ThirdPerson AI personalise the relationship intelligence summary.
      </p>
      <div className="border border-purple-300/15 bg-purple-300/[0.04] p-4">
        <label className="tech-label text-smoke" htmlFor="person-dob">Their date of birth</label>
        <input
          id="person-dob"
          type="date"
          value={dateOfBirth}
          onChange={(event) => onDateChange?.(event.target.value)}
          className="mt-4 w-full border border-white/18 bg-black/50 px-4 py-4 text-lg text-bone outline-none transition focus:border-purple-200/70"
        />
        <p className="mt-3 text-sm leading-7 text-smoke">
          Optional — used only to add a light zodiac compatibility layer.
        </p>
        {sign && <p className="mt-3 font-mono text-xs uppercase tracking-[0.13em] text-purple-100">{getZodiacGlyph(sign)} {sign}</p>}
      </div>
    </div>
  );
}
