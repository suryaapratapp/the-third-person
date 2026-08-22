import { useEffect, useMemo, useRef, useState } from 'react';
import { PiArrowLeft, PiArrowRight, PiCheck } from 'react-icons/pi';
import PlatformSelector from '../components/PlatformSelector.jsx';
import RelationshipSelector from '../components/RelationshipSelector.jsx';
import PersonDetailsForm from '../components/PersonDetailsForm.jsx';
import WhoIsWhoStep from '../components/WhoIsWhoStep.jsx';
import UploadOrPasteChat from '../components/UploadOrPasteChat.jsx';
import ReviewAnalysisStep from '../components/ReviewAnalysisStep.jsx';
import { useAnalysis } from '../state/AnalysisContext.jsx';
import { useRouter } from '../state/RouterContext.jsx';
import { pendingCashfreeOrder, resumeCashfreeOrder } from '../lib/paymentsService.js';

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
  { label: 'Upload or paste chat', short: 'Chat' },
  // Naming moved AFTER the upload. Asking first meant asking people to type a
  // name from memory and hoping it matched the export's display name; when it
  // did not, every downstream "who is who" decision attached to the wrong
  // person and nothing surfaced the mistake. Now both names come from the file.
  { label: 'Who is who', short: 'People' },
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
    if (step === 2) return flow.chatText.trim().length > 10;
    if (step === 3) return Boolean(flow.personName.trim());
    return true;
  }, [flow, step]);

  // Advancing a step swaps the panel contents in place. Without this the user
  // keeps whatever scroll position the previous (often longer) step left
  // behind, and can land halfway down the next one.
  //
  // Skipped on first render: this effect also runs on mount, which scrolled
  // people ~400px down the moment they opened the wizard and pushed the page
  // heading off the top of the screen before they had touched anything.
  // Compares against the step it last scrolled for, rather than tracking
  // "have I run before". A boolean flag does not survive StrictMode, which
  // remounts the same instance: the first run clears the flag, the second sees
  // it already cleared and scrolls — dragging the page ~400px down on first
  // paint, before anyone has touched anything.
  const scrolledForStep = useRef(step);
  useEffect(() => {
    if (scrolledForStep.current === step) return;
    scrolledForStep.current = step;
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  // Coming back from a redirect payment.
  //
  // Topping up mid-analysis with UPI or netbanking leaves the site, and the
  // wizard's state does not survive that — the uploaded conversation is gone.
  // The CREDIT must not be. This confirms the payment on the way back in and
  // says plainly that the credit is banked, so the only thing lost is the
  // upload rather than the money.
  const [paymentNotice, setPaymentNotice] = useState('');
  useEffect(() => {
    if (!pendingCashfreeOrder()) return undefined;
    let mounted = true;
    resumeCashfreeOrder()
      .then((result) => {
        if (!mounted || !result) return;
        setPaymentNotice(result.success
          ? 'Payment received and your credit has been added. Upload the conversation again to pick up where you left off.'
          : result.error || 'We could not confirm that payment.');
      })
      .finally(() => {
        try {
          const url = new URL(window.location.href);
          if (url.searchParams.has('cf_order')) {
            url.searchParams.delete('cf_order');
            window.history.replaceState({}, '', url.toString());
          }
        } catch {
          /* leaving the parameter in place is harmless */
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const bodies = [
    <PlatformSelector key="platform" value={flow.platform} onChange={(platform) => {
      updateFlow({ platform });
      window.setTimeout(() => setStep(1), 220);
    }} />,
    <RelationshipSelector key="relationship" value={flow.relationshipType} onChange={(relationshipType) => {
      updateFlow({ relationshipType });
      window.setTimeout(() => setStep(2), 220);
    }} />,
    <UploadOrPasteChat
      key="upload"
      mode={flow.sourceMode}
      fileName={flow.fileName}
      fileSize={flow.fileSize}
      text={flow.chatText}
      onChange={updateFlow}
    />,
    <div key="who-is-who" className="grid gap-5">
      <WhoIsWhoStep flow={flow} updateFlow={updateFlow} />
      <PersonDetailsForm
        value={flow.personName}
        onChange={(personName) => updateFlow({ personName })}
        dateOfBirth={flow.otherPersonDateOfBirth}
        onDateChange={(otherPersonDateOfBirth) => updateFlow({ otherPersonDateOfBirth })}
        nameHandledElsewhere
      />
    </div>,
    <ReviewAnalysisStep key="review" flow={flow} updateFlow={updateFlow} onStart={(target = '/analysis/result') => navigate(target)} />,
  ];

  const noticeBanner = paymentNotice ? (
    <div className="mx-auto mb-4 max-w-[900px] rounded-sm border border-good/35 bg-good/10 p-4">
      <p className="text-sm leading-7 text-smoke">{paymentNotice}</p>
    </div>
  ) : null;

  return (
    <section className="relative min-h-screen pb-32 pt-[var(--header-h)]">
      {/* Sticky stepper.
          Was five hairline bars that communicated a proportion and nothing
          else — you could see you were 40% through and not what the remaining
          60% asked of you. Now it names the current step, counts the rest, and
          the dots are real navigation: completed steps are reachable, future
          ones are not, which is the honest affordance for a flow where step 4
          depends on step 1.

          Pinned to the header's exact height. Leave a gap and page content
          shows through the strip between the two bars. */}
      <div className="below-header sticky z-30 border-b border-line bg-paper px-4 py-3 shadow-glow sm:px-6">
        <div className="mx-auto max-w-[1320px]">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-ink">{steps[step].label}</p>
            <p className="shrink-0 text-xs font-medium text-ash">
              Step {step + 1} of {steps.length}
            </p>
          </div>
          <ol
            className="mt-2.5 flex items-center gap-1.5"
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={steps.length}
          >
            {steps.map((item, index) => {
              const state = index < step ? 'done' : index === step ? 'current' : 'todo';
              return (
                <li key={item.short} className="flex min-w-0 flex-1 items-center gap-1.5 last:flex-none">
                  <button
                    type="button"
                    onClick={() => index < step && setStep(index)}
                    disabled={index >= step}
                    aria-current={index === step ? 'step' : undefined}
                    aria-label={`Step ${index + 1}: ${item.label}`}
                    className="step-dot disabled:cursor-default"
                    data-state={state}
                  >
                    {state === 'done' ? <PiCheck aria-hidden="true" /> : index + 1}
                  </button>
                  {index < steps.length - 1 && (
                    <span className="step-rail" data-state={index < step ? 'done' : 'todo'} aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div className="relative mx-auto max-w-[1320px] px-4 pt-6 sm:px-6 sm:pt-8">
        <div className="grid gap-6 lg:grid-cols-[240px_1fr] lg:gap-8">
          {/* On a wide screen the step list is worth its column: it shows the
              whole shape of the task at once. On a phone it is five rows of
              chrome above the thing you are meant to do, so it is the sticky
              bar's job there and this is hidden. */}
          <aside className="hidden h-fit lg:block">
            <p className="tech-label">New analysis</p>
            <ol className="mt-3 grid gap-0.5">
              {steps.map((item, index) => {
                const state = index < step ? 'done' : index === step ? 'current' : 'todo';
                return (
                  <li key={item.label}>
                    <button
                      onClick={() => index <= step && setStep(index)}
                      disabled={index > step}
                      aria-current={index === step ? 'step' : undefined}
                      className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition ${
                        index === step
                          ? 'bg-accentWash text-ink'
                          : index < step
                            ? 'text-smoke hover:bg-well'
                            : 'cursor-default text-ash'
                      }`}
                    >
                      <span className="step-dot" data-state={state}>
                        {state === 'done' ? <PiCheck aria-hidden="true" /> : index + 1}
                      </span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>

          <div ref={panelRef} className="card scroll-mt-[156px] p-4 sm:p-7 lg:scroll-mt-24 lg:min-h-[560px]">
            <div className="mb-5 hidden lg:block">
              <h1 className="serif-title text-[1.75rem]">{steps[step].label}</h1>
            </div>
            {noticeBanner}
            {bodies[step]}
          </div>
        </div>
      </div>

      {step < 4 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-paper px-4 py-3 shadow-raised sm:px-6">
          <div className="mx-auto flex max-w-[1320px] items-center gap-2.5">
            <button
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              disabled={step === 0}
              className="btn btn-secondary btn-lg shrink-0 !px-4"
              aria-label="Back a step"
            >
              <PiArrowLeft className="text-base" aria-hidden="true" />
              <span className="hidden sm:inline">Back</span>
            </button>
            {/* Full width on a phone. The primary action of the product's
                critical flow should not be a small target in a corner. */}
            <button
              disabled={!canContinue}
              onClick={() => setStep((current) => Math.min(4, current + 1))}
              className="btn btn-primary btn-lg flex-1 sm:flex-none sm:!px-8"
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
