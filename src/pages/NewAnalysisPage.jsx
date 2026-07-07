import { useMemo, useState } from 'react';
import PlatformSelector from '../components/PlatformSelector.jsx';
import RelationshipSelector from '../components/RelationshipSelector.jsx';
import PersonDetailsForm from '../components/PersonDetailsForm.jsx';
import UploadOrPasteChat from '../components/UploadOrPasteChat.jsx';
import ReviewAnalysisStep from '../components/ReviewAnalysisStep.jsx';
import ParticleBackground from '../components/ParticleBackground.jsx';
import { useAnalysis } from '../state/AnalysisContext.jsx';
import { useRouter } from '../state/RouterContext.jsx';

const steps = [
  'Select messaging app',
  'Select relationship type',
  'Enter person name',
  'Upload or paste chat',
  'Review and start',
];

export default function NewAnalysisPage() {
  const { flow, updateFlow } = useAnalysis();
  const { navigate } = useRouter();
  const [step, setStep] = useState(0);

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(flow.platform);
    if (step === 1) return Boolean(flow.relationshipType);
    if (step === 2) return Boolean(flow.personName.trim());
    if (step === 3) return flow.chatText.trim().length > 10;
    return true;
  }, [flow, step]);

  const bodies = [
    <PlatformSelector key="platform" value={flow.platform} onChange={(platform) => {
      updateFlow({ platform });
      window.setTimeout(() => setStep(1), 220);
    }} />,
    <RelationshipSelector key="relationship" value={flow.relationshipType} onChange={(relationshipType) => {
      updateFlow({ relationshipType });
      window.setTimeout(() => setStep(2), 220);
    }} />,
    <PersonDetailsForm
      key="person-details"
      value={flow.personName}
      onChange={(personName) => updateFlow({ personName })}
      dateOfBirth={flow.otherPersonDateOfBirth}
      onDateChange={(otherPersonDateOfBirth) => updateFlow({ otherPersonDateOfBirth })}
    />,
    <UploadOrPasteChat
      key="upload"
      mode={flow.sourceMode}
      fileName={flow.fileName}
      fileSize={flow.fileSize}
      text={flow.chatText}
      onChange={updateFlow}
    />,
    <ReviewAnalysisStep key="review" flow={flow} updateFlow={updateFlow} onStart={(target = '/analysis/result') => navigate(target)} />,
  ];

  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-28 pt-28 sm:px-8">
      <ParticleBackground className="opacity-70" />
      <div className="relative mx-auto max-w-[1320px]">
        <div className="mb-8">
          <p className="tech-label text-smoke">New conversation analysis</p>
          <h1 className="serif-title mt-4 text-5xl leading-none sm:text-7xl">Prepare the signal.</h1>
        </div>
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="thin-panel h-fit p-5">
            {steps.map((label, index) => (
              <button
                key={label}
                onClick={() => setStep(index)}
                className={`flex w-full items-center gap-4 border-b border-white/10 py-4 text-left last:border-b-0 ${index === step ? 'text-bone' : 'text-ash'}`}
              >
                <span className={`flex h-8 w-8 items-center justify-center border font-mono text-xs ${index === step ? 'border-white/70' : 'border-white/15'}`}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-sm">{label}</span>
              </button>
            ))}
          </aside>
          <div className="thin-panel min-h-[560px] p-5 transition-all duration-300 sm:p-8">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="tech-label text-smoke">Step {step + 1} / {steps.length}</p>
                <h2 className="serif-title mt-3 text-4xl leading-tight sm:text-5xl">{steps[step]}</h2>
              </div>
              <div className="hidden w-44 pt-3 sm:block">
                <div className="h-px bg-white/12">
                  <div className="h-px accent-gradient transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
                </div>
              </div>
            </div>
            {bodies[step]}
          </div>
        </div>
      </div>
      {step < 4 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/12 bg-black/85 px-4 py-4 backdrop-blur-xl sm:px-8">
          <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4">
            <button
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              className="glass-button px-5 py-3 font-mono text-xs uppercase tracking-[0.16em] text-smoke"
            >
              Back
            </button>
            <button
              disabled={!canContinue}
              onClick={() => setStep((current) => Math.min(4, current + 1))}
              className="glass-button px-5 py-3 font-mono text-xs uppercase tracking-[0.16em] text-bone disabled:cursor-not-allowed disabled:border-white/10 disabled:text-ash"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
