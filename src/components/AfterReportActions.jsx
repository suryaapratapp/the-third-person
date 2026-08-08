import { PiArrowRight } from 'react-icons/pi';
import CoachBot from './CoachBot.jsx';
import { useRouter } from '../state/RouterContext.jsx';

// The two things to do after reading a report.
//
// Both were previously invisible at this moment: the coach was reachable only
// from the reports list, and Know Yourself got one grey sentence buried inside
// a card. Someone finishing a report is at the exact point of maximum interest —
// they have just learned something and want to ask about it — and the product
// was quietly ending there.
//
// These are the only two saturated surfaces in the whole report. Everything
// above them is white cards on a tinted page, so a filled panel reads as a door
// out rather than as one more section. Each carries the colour of the page it
// opens, so the shift on arrival feels intentional rather than jarring.
//
// Colours come from the two person tokens, which is not arbitrary: the coach
// talks about you, so it wears `--you`; Know Yourself is the profile built
// across everyone, so it wears `--them`.
const CARDS = [
  {
    key: 'coach',
    eyebrow: 'Included with this report',
    title: 'Ask the coach about it',
    body: '“Is he actually interested?” “What do I reply?” It answers from this report, not generic advice.',
    action: 'Start chatting',
    bg: 'var(--you)',
    art: <CoachBot size={64} mood="happy" />,
    attr: { 'data-coach-cta': true },
  },
  {
    key: 'yourself',
    eyebrow: 'Builds with every analysis',
    title: 'See who you actually are',
    body: 'This report just added to your profile — fifteen traits, read from how you really talk across every relationship.',
    action: 'Open Know Yourself',
    bg: 'var(--them)',
    // A drawn mark, not a live TraitConstellation. With no profile data the
    // constellation renders as a faint empty web — at 52px on a saturated
    // fill it read as a smudge, which is a poor advert for the page it opens.
    // This is the same idea (a self, radiating) at a size that survives.
    art: (
      <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-[color:var(--on-solid)]/15 text-[color:var(--on-solid)]">
        <svg viewBox="0 0 48 48" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="24" cy="24" r="5.5" fill="currentColor" stroke="none" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, index) => {
            const radians = (angle * Math.PI) / 180;
            const inner = 10;
            const outer = index % 2 ? 16 : 20;
            return (
              <line
                key={angle}
                x1={24 + Math.cos(radians) * inner}
                y1={24 + Math.sin(radians) * inner}
                x2={24 + Math.cos(radians) * outer}
                y2={24 + Math.sin(radians) * outer}
                opacity={index % 2 ? 0.6 : 1}
              />
            );
          })}
        </svg>
      </span>
    ),
    attr: {},
  },
];

export default function AfterReportActions({ onOpenCoach }) {
  const { navigate } = useRouter();
  // The coach is a dialog over this report now, not a page. Know Yourself is
  // still a real destination, so only one of these navigates.
  const actionFor = {
    coach: onOpenCoach,
    yourself: () => navigate('/personality-card'),
  };

  return (
    <section className="mt-10" aria-label="What to do next">
      <p className="tech-label">Now that you have the report</p>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {CARDS.map((card) => (
          <button
            key={card.key}
            type="button"
            {...card.attr}
            onClick={actionFor[card.key]}
            style={{ background: card.bg }}
            className="group relative overflow-hidden rounded-lg p-5 text-left shadow-raised transition duration-150 hover:-translate-y-0.5 active:translate-y-0 sm:p-6"
          >
            <div className="flex items-start gap-4">
              <span className="shrink-0">{card.art}</span>
              <div className="min-w-0 flex-1">
                {/* `--on-solid`, not white. These fills are the person tokens,
                    which INVERT between themes — deep-rose in the light theme,
                    light-rose in the deep one — so hardcoded white text is
                    6.1:1 on one and 1.6:1 on the other. Full opacity, no tint:
                    white at 80% over the light-theme rose already composited
                    to 4.35:1, under AA at this size. */}
                <p className="text-xs font-semibold text-[color:var(--on-solid)]">{card.eyebrow}</p>
                <h3 className="serif-title mt-1.5 text-2xl !text-[color:var(--on-solid)] sm:text-[1.75rem]">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[color:var(--on-solid)] opacity-90">{card.body}</p>
                <span className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[color:var(--on-solid)] px-4 py-2 text-sm font-semibold" style={{ color: card.bg }}>
                  {card.action}
                  <PiArrowRight className="text-base transition group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
