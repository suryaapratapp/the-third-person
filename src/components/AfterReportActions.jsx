import { PiArrowRight } from 'react-icons/pi';
import CoachBot from './CoachBot.jsx';
import TraitConstellation from './TraitConstellation.jsx';
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
    // Near-opaque tile, not a 15% wash. The constellation is drawn in the
    // accent and rose inks; on a translucent tile over the blue fill its own
    // lines all but vanished, so the preview showed nothing at all.
    art: (
      <span className="grid h-16 w-16 place-items-center rounded-lg bg-white/95">
        <TraitConstellation view={[]} size={52} showLabels={false} />
      </span>
    ),
    attr: {},
  },
];

export default function AfterReportActions({ chainId }) {
  const { navigate } = useRouter();
  const hrefFor = {
    coach: chainId ? `/reports/${encodeURIComponent(chainId)}/coach` : '/reports',
    yourself: '/personality-card',
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
            onClick={() => navigate(hrefFor[card.key])}
            style={{ background: card.bg }}
            className="group relative overflow-hidden rounded-lg p-5 text-left shadow-raised transition duration-150 hover:-translate-y-0.5 active:translate-y-0 sm:p-6"
          >
            <div className="flex items-start gap-4">
              <span className="shrink-0">{card.art}</span>
              <div className="min-w-0 flex-1">
                {/* Full white, not a tint. White at 80% over the rose fill
                    composites to 4.35:1, which is under AA for text this
                    small — and a lighter tint of the fill itself would be
                    worse still. */}
                <p className="text-xs font-semibold text-white">{card.eyebrow}</p>
                <h3 className="serif-title mt-1.5 text-2xl !text-white sm:text-[1.75rem]">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/90">{card.body}</p>
                <span className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold" style={{ color: card.bg }}>
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
