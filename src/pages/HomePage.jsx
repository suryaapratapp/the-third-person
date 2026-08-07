import HeroSection from '../components/HeroSection.jsx';
import ProductTour from '../components/ProductTour.jsx';
import WhenItHelpsSection from '../components/WhenItHelpsSection.jsx';
import PrivacyAssurance from '../components/PrivacyAssurance.jsx';
import BeyondTheReportSection from '../components/BeyondTheReportSection.jsx';
import MissionSection from '../components/MissionSection.jsx';
import MatchmakingPitch from '../components/MatchmakingPitch.jsx';
import HonestLimitsStrip from '../components/HonestLimitsStrip.jsx';

// Homepage order, chosen for a first-time visitor on a phone.
//
// The page used to run nine sections and roughly twenty phone screens, three of
// which were purely decorative (fake chat bubbles, a six-column desktop
// timeline, and five disclaimer cards) — nobody reaches a call to action after
// that much scrolling. What is left answers, in order, the questions someone
// actually asks: what is this → show me → does it cover my situation → what
// happens to my private chat → what else do I get → why does this exist →
// what are its limits.
//
// Privacy sits high on purpose. It is the objection that stops people, and it
// has to be answered before the page asks anyone to hand over a real
// conversation.
//
// Each band carries a tone and alternate bands sit on a slightly lifted
// ground. Both are pure CSS variables inherited by whatever renders inside, so
// no section component knows what colour it is — the page decides, and the
// scroll gets a rhythm instead of running as one unbroken dark column.

function Band({ children, tone = 'tone-violet', alt = false, className = '' }) {
  return (
    <div className={`${tone} ${alt ? 'band-alt' : ''} ${className}`}>
      <div className="mx-auto w-full max-w-[1180px] px-4 py-12 sm:px-8 sm:py-16">
        {children}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <HeroSection />

      <Band tone="tone-cyan" alt>
        <ProductTour />
      </Band>

      <Band tone="tone-amber">
        <WhenItHelpsSection />
      </Band>

      <Band tone="tone-green" alt>
        <PrivacyAssurance />
      </Band>

      <Band tone="tone-rose">
        <BeyondTheReportSection />
      </Band>

      <Band tone="tone-violet" alt>
        <MissionSection />
        <MatchmakingPitch className="mt-6" />
      </Band>

      <Band tone="tone-cyan">
        <HonestLimitsStrip />
      </Band>
    </>
  );
}
