import HeroSection from '../components/HeroSection.jsx';
import ProductTour from '../components/ProductTour.jsx';
import WhenItHelpsSection from '../components/WhenItHelpsSection.jsx';
import PrivacyAssurance from '../components/PrivacyAssurance.jsx';
import BeyondTheReportSection from '../components/BeyondTheReportSection.jsx';
import MissionSection from '../components/MissionSection.jsx';
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

function Band({ children }) {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-8">
      {children}
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <HeroSection />

      <Band>
        <ProductTour />
      </Band>

      <WhenItHelpsSection />

      <Band>
        <PrivacyAssurance />
      </Band>

      <BeyondTheReportSection />

      <Band>
        <MissionSection />
      </Band>

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-14 pt-12 sm:px-8 sm:pb-20">
        <HonestLimitsStrip />
      </div>
    </>
  );
}
