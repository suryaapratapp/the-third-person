import { useEffect, useState } from 'react';
import SignalWaveform from './SignalWaveform.jsx';
import ParticleBackground from './ParticleBackground.jsx';

const steps = [
  'Preparing conversation memory',
  'Protecting sensitive details',
  'Detecting emotional signals',
  'Mapping sentiment trajectory',
  'Building compatibility model',
  'Creating personality preview',
  'Generating final dashboard',
];

const labels = [
  'Analysing conversation flow',
  'Detecting emotional shifts',
  'Reconstructing context',
  'Mapping behavioural patterns',
  'Building relationship intelligence',
  'Identifying recurring emotional signals',
  'Preparing dashboard',
];

export default function AnalysisLoading({ onComplete }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setIndex((current) => Math.min(steps.length - 1, current + 1)), 520);
    const done = window.setTimeout(onComplete, 4100);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(done);
    };
  }, [onComplete]);

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 pt-24 sm:px-8">
      <ParticleBackground />
      <div className="corner-frame relative mx-auto w-full max-w-5xl border border-white/15 bg-black/50 p-6 text-center shadow-glow sm:p-10">
        <p className="tech-label text-smoke">Real-time analysis engine</p>
        <h1 className="serif-title mt-5 text-5xl leading-none sm:text-7xl">Reading between the lines.</h1>
        <p className="mt-5 font-mono text-xs uppercase tracking-[0.14em] text-purple-200/80">Preparing your private relationship report</p>
        <div className="mx-auto mt-10 max-w-3xl">
          <SignalWaveform bars={120} />
          <div className="mt-8 h-px bg-white/12">
            <div className="h-px accent-gradient transition-all duration-500" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
          </div>
        </div>
        <div className="mt-8 grid gap-4 text-left sm:grid-cols-2">
          <div className="thin-panel p-5">
            <p className="tech-label text-smoke">Current process</p>
            <p className="mt-4 font-mono text-sm text-bone">{steps[index]}</p>
          </div>
          <div className="thin-panel p-5">
            <p className="tech-label text-smoke">Signal label</p>
            <p className="mt-4 font-mono text-sm text-bone">{labels[index]}</p>
          </div>
        </div>
        <div className="mt-7 space-y-2 text-left font-mono text-xs text-ash">
          {steps.slice(0, index + 1).map((step) => (
            <p key={step}>› {step}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
