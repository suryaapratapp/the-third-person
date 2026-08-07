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
// Deliberately styled AGAINST the report's own language. Every card above this
// is a translucent panel on the shared violet ground; these two are solid,
// saturated, and carry their own artwork, so they read as doors out of the
// report rather than as two more sections of it. Each also previews the theme
// of the page it opens, so the colour change on arrival feels intentional.
export default function AfterReportActions({ chainId }) {
  const { navigate } = useRouter();
  const coachHref = chainId ? `/reports/${encodeURIComponent(chainId)}/coach` : '/reports';

  return (
    <section className="mt-10" aria-label="What to do next">
      <p className="tech-label text-smoke">Now that you have the report</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Coach — warm rose, matching the page it opens. */}
        <button
          type="button"
          data-coach-cta
          onClick={() => navigate(coachHref)}
          className="group relative overflow-hidden rounded-sm border border-pink-200/40 bg-gradient-to-br from-[#3a1730] via-[#2a1430] to-[#1d1228] p-6 text-left shadow-[0_18px_60px_rgba(255,120,170,0.16)] transition duration-200 hover:-translate-y-0.5 hover:border-pink-200/70 sm:p-7"
        >
          <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-pink-400/25 blur-2xl transition group-hover:bg-pink-400/35" />
          <div className="relative flex items-start gap-4">
            <CoachBot size={64} mood="happy" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-pink-100">Included with this report</p>
              <h3 className="serif-title mt-2 text-3xl leading-tight text-bone sm:text-4xl">Ask the coach about it</h3>
              <p className="mt-2 text-sm leading-6 text-smoke">
                “Is he actually interested?” “What do I reply?” It answers from this report, not
                generic advice.
              </p>
              <span className="mt-4 inline-flex items-center gap-2 rounded-sm bg-pink-200/95 px-4 py-2 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-[#3a1730]">
                Start chatting
                <PiArrowRight className="text-sm" aria-hidden="true" />
              </span>
            </div>
          </div>
        </button>

        {/* Know Yourself — cyan/indigo, matching the constellation page. */}
        <button
          type="button"
          onClick={() => navigate('/personality-card')}
          className="group relative overflow-hidden rounded-sm border border-cyan-200/35 bg-gradient-to-br from-[#12243c] via-[#141a35] to-[#141229] p-6 text-left shadow-[0_18px_60px_rgba(120,200,255,0.14)] transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200/60 sm:p-7"
        >
          <div className="pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full bg-cyan-400/20 blur-2xl transition group-hover:bg-cyan-400/30" />
          <div className="relative flex items-start gap-4">
            <span className="shrink-0 opacity-90">
              <TraitConstellation view={[]} size={64} showLabels={false} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-cyan-100">Builds with every analysis</p>
              <h3 className="serif-title mt-2 text-3xl leading-tight text-bone sm:text-4xl">See who you actually are</h3>
              <p className="mt-2 text-sm leading-6 text-smoke">
                This report just added to your profile — fifteen traits, read from how you really
                talk across every relationship.
              </p>
              <span className="mt-4 inline-flex items-center gap-2 rounded-sm bg-cyan-100/95 px-4 py-2 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-[#12243c]">
                Open Know Yourself
                <PiArrowRight className="text-sm" aria-hidden="true" />
              </span>
            </div>
          </div>
        </button>
      </div>
    </section>
  );
}
