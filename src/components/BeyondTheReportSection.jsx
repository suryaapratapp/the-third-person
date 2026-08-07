import { PiArrowRight, PiUserFocus } from 'react-icons/pi';
import CoachBot from './CoachBot.jsx';
import { useRouter } from '../state/RouterContext.jsx';

// Replaces the old standalone "Meet your AI Relationship Coach" section.
//
// Two problems it fixes. The coach section was a full screen of decorative
// illustration for one feature, and Know Yourself — a paid feature that
// accumulates across every report — had no presence on the homepage at all, so
// nobody knew it existed before paying. Both now sit side by side as the two
// things that come after a report.

const FEATURES = [
  {
    bot: true,
    label: 'Included with a report',
    title: 'Ask the coach about it',
    body: 'Once a report exists you can talk to it. “Is he actually interested?” “What do I reply to this?” The coach answers from your report — not generic advice — and always hands a question back to you.',
    points: ['Reads your specific report', 'Replies in your language', 'Honest, not flattering'],
    accent: 'border-pink-200 bg-pink-50',
    labelClass: 'text-pink-700',
  },
  {
    Icon: PiUserFocus,
    label: 'Builds over time',
    title: 'Know Yourself',
    body: 'Every analysis adds to a profile of how you communicate — how you open, repair, argue, go quiet. You are not the same with a partner as with your mother, and what repeats across all of them is the part that is actually you.',
    points: ['Accumulates across reports', 'Separated by relationship type', 'Yours alone, never shared'],
    accent: 'border-violet-200 bg-violet-50',
    labelClass: 'text-violet-700',
  },
];

export default function BeyondTheReportSection() {
  const { navigate } = useRouter();

  return (
    <section>
      <div>
        <p className="tech-label text-smoke">After the report</p>
        <h2 className="serif-title mt-4 max-w-2xl text-4xl leading-tight sm:text-6xl">
          The report is where it starts.
        </h2>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {FEATURES.map(({ Icon, bot, label, title, body, points, accent, labelClass }) => (
            <article key={title} className={`hud-frame rounded-sm border p-5 sm:p-7 ${accent}`}>
              <span className="hud-corner hud-corner-tl" aria-hidden="true" />
              <span className="hud-corner hud-corner-br" aria-hidden="true" />
              <div className="flex items-center gap-3">
                {bot ? (
                  <CoachBot size={40} mood="happy" />
                ) : (
                  <Icon className={`text-2xl ${labelClass}`} aria-hidden="true" />
                )}
                <p className={`tech-label ${labelClass}`}>{label}</p>
              </div>
              <h3 className="serif-title mt-4 text-3xl leading-tight sm:text-4xl">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-smoke">{body}</p>
              <ul className="mt-5 grid gap-2">
                {points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm leading-6 text-bone">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-well" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <button
          onClick={() => navigate('/analysis/new')}
          className="btn btn-primary mt-8 w-full text-sm sm:w-auto"
        >
          Start with one conversation
          <PiArrowRight className="text-base" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
