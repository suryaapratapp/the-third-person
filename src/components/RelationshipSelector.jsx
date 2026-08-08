import { PiCheck } from 'react-icons/pi';

// Professional relationships were removed on purpose: this product analyses
// personal ones, and work chats need a different (and legally touchier) lens.
//
// The options are grouped to match the three lens families the prompt actually
// switches between (romantic / friendship / family). Ten identical grey buttons
// in one grid gave no hint that this choice changes the entire analysis.
//
// `value` is the string the backend routes on in relationshipLens.ts — the
// display label is separate so wording can change without silently re-routing
// someone's report to a different lens.
const GROUPS = [
  {
    key: 'romantic',
    title: 'Romantic',
    accent: 'border-pink-200 bg-pink-50',
    labelClass: 'text-pink-700',
    options: [
      { value: 'Partner', label: 'Partner', hint: 'Together now' },
      { value: 'Early stage dating / seeing each other', label: 'Early dating', hint: 'Seeing each other' },
      { value: 'Crush', label: 'Crush', hint: 'Not established yet' },
      { value: 'Ex', label: 'Ex', hint: 'Already ended once' },
    ],
  },
  {
    key: 'friendship',
    title: 'Friendship',
    accent: 'border-violet-200 bg-violet-50',
    labelClass: 'text-violet-700',
    options: [
      { value: 'Friend', label: 'Friend', hint: 'Any closeness' },
    ],
  },
  {
    key: 'family',
    title: 'Family',
    accent: 'border-emerald-200 bg-emerald-50',
    labelClass: 'text-emerald-700',
    options: [
      { value: 'Mom', label: 'Mom', hint: 'Parent' },
      { value: 'Dad', label: 'Dad', hint: 'Parent' },
      { value: 'Sister', label: 'Sister', hint: 'Sibling' },
      { value: 'Brother', label: 'Brother', hint: 'Sibling' },
      { value: 'Cousin', label: 'Cousin', hint: 'Close family' },
    ],
  },
];

export default function RelationshipSelector({ value, onChange }) {
  return (
    <div className="grid gap-5">
      <p className="text-sm leading-7 text-smoke">
        This changes how everything is read. The same message means different things from a partner
        than from a parent.
      </p>

      {GROUPS.map((group) => (
        <fieldset key={group.key} className="border-0 p-0">
          <legend className={`tech-label mb-3 ${group.labelClass}`}>{group.title}</legend>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {group.options.map((option) => {
              const selected = value === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange(option.value)}
                  aria-pressed={selected}
                  data-selected={selected}
                  className="option flex min-h-[76px] flex-col justify-center px-3.5 py-3"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[0.95rem] font-medium leading-5 text-ink">{option.label}</span>
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${
                        selected ? 'border-signal bg-signal text-white' : 'border-lineStrong'
                      }`}
                      aria-hidden="true"
                    >
                      {selected && <PiCheck className="text-[0.75rem]" />}
                    </span>
                  </span>
                  <span className="mt-1 text-xs leading-4 text-ash">{option.hint}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
