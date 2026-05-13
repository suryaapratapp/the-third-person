import HeroSection from '../components/HeroSection.jsx';
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
      <WhenItHelpsSection />
      <BestieBotSection />
      <SignalDetectionSection />
      <MemoryReconstructionSection />
      <UserReviewsSection />
      <ResponsibleIntelligenceSection />
    </>
  );
}
