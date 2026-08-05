import { PiArrowRight } from 'react-icons/pi';
import ParticleBackground from '../components/ParticleBackground.jsx';
import { useRouter } from '../state/RouterContext.jsx';

// The vision page, rebuilt around one idea instead of fourteen.
//
// It used to list six "direction" cards, eight "coming next" cards and a third
// panel — every one of them a future-tense promise, none ranked, and several
// describing things that already shipped (the coach, personality reports,
// timelines). A reader could not tell what this product is actually for.
//
// It now states the north star first, separates what exists today from what is
// coming, and marks the unbuilt things plainly as unbuilt. Anything already
// shipped moved into "here today" where it belongs.

const TODAY = [
  ['Relationship reports', 'Upload a real conversation and get a phase-by-phase read on effort, mixed signals, conflict and repair — every claim tied to quotes from the chat.'],
  ['A coach that knows your report', 'Ask follow-up questions about that specific relationship in whichever language you type in — the coach replies in kind.'],
  ['Know Yourself', 'A profile of how you communicate that accumulates across every report you run, kept separate by relationship type.'],
  ['Relationship-aware analysis', 'A parent, a partner and an ex are read through different lenses. The same message does not mean the same thing in each.'],
];

const NEXT = [
  ['Your core self, across everyone', 'Right now each relationship is analysed well on its own. The next step is the cross-section: what stays true about you whether you are talking to your mother, your best friend, or someone you just met.'],
  ['Compatibility from behaviour', 'Not "we both like travel". Whether two people repair conflict the same way, match on reassurance needs, and hold a conversation at the same rhythm.'],
  ['A matching layer', 'A friendship and dating platform built on that. Opt-in, always — and your conversations stay private whether you join it or not.'],
];

export default function VisionPage() {
  const { navigate } = useRouter();

  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-24 sm:px-8 sm:pt-28">
      <ParticleBackground className="opacity-50" />

      <div className="relative mx-auto max-w-[1180px]">
        <div className="corner-frame accent-panel p-5 sm:p-12">
          <p className="tech-label text-violet-100">The north star</p>
          <h1 className="serif-title mt-4 max-w-4xl text-4xl leading-tight sm:text-7xl">
            Match people on who they really are.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-smoke sm:text-base sm:leading-8">
            Every dating and friendship platform asks you to describe yourself, and everyone answers with
            who they believe they are. We read something harder to fake: how you actually talk to the
            people already in your life.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-bone sm:text-base sm:leading-8">
            You are not the same person with a partner as with a parent. What repeats across all of them
            is the part that is actually you — and that is what we think two people should be matched on.
          </p>
        </div>

        <div className="mt-10">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-emerald-300" aria-hidden="true" />
            <p className="tech-label text-emerald-100">Here today</p>
          </div>
          <div className="mt-5 grid gap-3 sm:gap-4 md:grid-cols-2">
            {TODAY.map(([title, body]) => (
              <article key={title} className="thin-panel p-5 sm:p-6">
                <h2 className="text-lg leading-6 text-bone sm:text-xl">{title}</h2>
                <p className="mt-2.5 text-sm leading-6 text-smoke">{body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-pink-300" aria-hidden="true" />
            <p className="tech-label text-pink-100">Not built yet</p>
          </div>
          <div className="mt-5 grid gap-3 sm:gap-4 md:grid-cols-3">
            {NEXT.map(([title, body], index) => (
              <article key={title} className="rounded-[26px] border border-pink-200/25 bg-pink-300/[0.05] p-5 sm:p-6">
                <p className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-ash">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h2 className="mt-3 text-lg leading-6 text-bone sm:text-xl">{title}</h2>
                <p className="mt-2.5 text-sm leading-6 text-smoke">{body}</p>
              </article>
            ))}
          </div>
          <p className="mt-5 text-xs leading-6 text-ash">
            These are goals, not shipping dates. Nothing on this list is available to buy today, and we
            will not charge for any of it before it works.
          </p>
        </div>

        <div className="mt-10 rounded-[28px] border border-violet-200/25 bg-violet-300/[0.06] p-5 text-center sm:p-8">
          <p className="text-base leading-7 text-bone sm:text-lg">
            Every report you run makes that profile sharper.
          </p>
          <button
            onClick={() => navigate('/analysis/new')}
            className="btn btn-primary mt-5 w-full text-sm sm:w-auto"
          >
            Start with one conversation
            <PiArrowRight className="text-base" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
