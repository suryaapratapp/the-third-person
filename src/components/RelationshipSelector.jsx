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
    accent: 'border-pink-200/30 bg-pink-300/[0.06]',
    labelClass: 'text-pink-100',
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
    accent: 'border-violet-200/30 bg-violet-300/[0.06]',
    labelClass: 'text-violet-100',
    options: [
      { value: 'Friend', label: 'Friend', hint: 'Any closeness' },
    ],
  },
  {
    key: 'family',
    title: 'Family',
    accent: 'border-emerald-200/25 bg-emerald-300/[0.05]',
    labelClass: 'text-emerald-100',
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
                  className={`group relative flex min-h-[72px] flex-col justify-center rounded-[20px] border px-4 py-3 text-left transition ${
                    selected
                      ? `${group.accent} shadow-[0_0_30px_rgba(168,85,247,0.14)]`
                      : 'border-white/12 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-base leading-5 text-bone">{option.label}</span>
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition ${
                        selected ? 'border-transparent bg-bone text-[#17122a]' : 'border-white/25'
                      }`}
                      aria-hidden="true"
                    >
                      {selected && <PiCheck className="text-[0.7rem]" />}
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
