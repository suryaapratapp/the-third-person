import HeroSection from '../components/HeroSection.jsx';
import PrivacyAssurance from '../components/PrivacyAssurance.jsx';
import ProductTour from '../components/ProductTour.jsx';
import SignalDetectionSection from '../components/SignalDetectionSection.jsx';
import MemoryReconstructionSection from '../components/MemoryReconstructionSection.jsx';
import ResponsibleIntelligenceSection from '../components/ResponsibleIntelligenceSection.jsx';
import WhenItHelpsSection from '../components/WhenItHelpsSection.jsx';
import UserReviewsSection from '../components/UserReviewsSection.jsx';
import BestieBotSection from '../components/BestieBotSection.jsx';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-8">
        <ProductTour />
      </div>
      <WhenItHelpsSection />
      <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-8">
        <PrivacyAssurance />
      </div>
      <BestieBotSection />
      <SignalDetectionSection />
      <MemoryReconstructionSection />
      <UserReviewsSection />
      <ResponsibleIntelligenceSection />
    </>
  );
}
