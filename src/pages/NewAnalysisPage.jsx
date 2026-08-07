import { useEffect, useMemo, useRef, useState } from 'react';
import { PiArrowLeft, PiArrowRight, PiCheck } from 'react-icons/pi';
import PlatformSelector from '../components/PlatformSelector.jsx';
import RelationshipSelector from '../components/RelationshipSelector.jsx';
import PersonDetailsForm from '../components/PersonDetailsForm.jsx';
import UploadOrPasteChat from '../components/UploadOrPasteChat.jsx';
import ReviewAnalysisStep from '../components/ReviewAnalysisStep.jsx';
import ParticleBackground from '../components/ParticleBackground.jsx';
import { useAnalysis } from '../state/AnalysisContext.jsx';
import { useRouter } from '../state/RouterContext.jsx';

// The analysis wizard, rebuilt around the phone.
//
// This is the flow the product lives or dies on, and it was laid out for a
// desktop: a 280px step list in a grid column that, below `lg`, stacked *above*
// the content — so on a phone you scrolled past five step buttons and a
// full-height display heading before reaching the thing you were meant to do.
//
// On mobile the step list is now a compact segmented progress bar in a sticky
// header, and the page heading shrinks to a single line. The step list returns
// as a sidebar at `lg`, where there is room for it.

const steps = [
  { label: 'Select messaging app', short: 'App' },
  { label: 'Select relationship type', short: 'Relationship' },
  { label: 'Enter person name', short: 'Person' },
  { label: 'Upload or paste chat', short: 'Chat' },
  { label: 'Review and start', short: 'Review' },
];

export default function NewAnalysisPage() {
  const { flow, updateFlow } = useAnalysis();
  const { navigate } = useRouter();
  const [step, setStep] = useState(0);
  const panelRef = useRef(null);

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(flow.platform);
    if (step === 1) return Boolean(flow.relationshipType);
    if (step === 2) return Boolean(flow.personName.trim());
    if (step === 3) return flow.chatText.trim().length > 10;
    return true;
  }, [flow, step]);

  // Advancing a step swaps the panel contents in place. Without this the user
  // keeps whatever scroll position the previous (often longer) step left
  // behind, and can land halfway down the next one.
  //
  // Skipped on first render: this effect also runs on mount, which scrolled
  // people ~400px down the moment they opened the wizard and pushed the page
  // heading off the top of the screen before they had touched anything.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

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
    <section className="relative min-h-screen overflow-hidden pb-32 pt-24 sm:pt-28">
      <ParticleBackground className="opacity-70" />

      {/* The page heading sits ABOVE the sticky bar on mobile so it scrolls
          away cleanly. Ordered after it, the heading slid underneath the
          translucent bar and ghosted through the blur. */}
      <h1 className="serif-title relative mb-4 px-4 text-3xl leading-tight lg:hidden">Prepare the signal.</h1>

      {/* Sticky mobile progress. Keeps "where am I / how much is left" on screen
          without spending a scroll on it.
          Pinned to the header's exact height: leave a gap and page content
          shows through the strip between the two bars. Fully opaque, not
          translucent — content scrolling under a bar reads as a glitch. */}
      <div className="sticky top-[65px] z-30 mb-5 border-y border-white/10 bg-well px-4 py-3 lg:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-bone">{steps[step].label}</p>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-ash">
            {step + 1} / {steps.length}
          </p>
        </div>
        <div className="mt-2.5 flex gap-1.5" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={steps.length}>
          {steps.map((item, index) => (
            <button
              key={item.short}
              type="button"
              onClick={() => index < step && setStep(index)}
              disabled={index >= step}
              aria-label={`Step ${index + 1}: ${item.label}`}
              className={`h-1.5 flex-1 rounded-full transition ${
                index < step ? 'accent-gradient' : index === step ? 'bg-violet-200' : 'bg-white/12'
              } ${index < step ? 'cursor-pointer' : 'cursor-default'}`}
            />
          ))}
        </div>
      </div>

      <div className="relative mx-auto max-w-[1320px] px-4 sm:px-8">
        <div className="mb-5 hidden lg:mb-8 lg:block">
          <p className="tech-label text-smoke">New conversation analysis</p>
          <h1 className="serif-title mt-4 text-5xl leading-none sm:text-7xl">Prepare the signal.</h1>
        </div>
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="thin-panel hidden h-fit p-5 lg:block">
            {steps.map((item, index) => {
              const done = index < step;
              return (
                <button
                  key={item.label}
                  onClick={() => setStep(index)}
                  className={`flex w-full items-center gap-4 border-b border-white/10 py-4 text-left last:border-b-0 ${index === step ? 'text-bone' : 'text-ash'}`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center border font-mono text-xs ${index === step ? 'border-white/70' : 'border-white/15'}`}>
                    {done ? <PiCheck className="text-violet-100" aria-hidden="true" /> : String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </aside>

          <div ref={panelRef} className="thin-panel scroll-mt-32 p-4 transition-all duration-300 sm:p-8 lg:min-h-[560px]">
            <div className="mb-6 hidden items-start justify-between gap-4 lg:flex">
              <div>
                <p className="tech-label text-smoke">Step {step + 1} / {steps.length}</p>
                <h2 className="serif-title mt-3 text-4xl leading-tight sm:text-5xl">{steps[step].label}</h2>
              </div>
              <div className="w-44 pt-3">
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
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/12 bg-[#12101f]/95 px-4 py-3  sm:px-8 sm:py-4">
          <div className="mx-auto flex max-w-[1320px] items-center gap-3">
            <button
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              disabled={step === 0}
              className="btn btn-ghost min-h-[48px] !px-5 !py-3 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              <PiArrowLeft className="text-base" aria-hidden="true" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <button
              disabled={!canContinue}
              onClick={() => setStep((current) => Math.min(4, current + 1))}
              className="btn btn-primary min-h-[48px] flex-1 !py-3 text-xs disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none sm:!px-8"
            >
              Continue
              <PiArrowRight className="text-base" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
