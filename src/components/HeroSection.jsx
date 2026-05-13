import ParticleBackground from './ParticleBackground.jsx';
import { useRouter } from '../state/RouterContext.jsx';

export default function HeroSection() {
  const { navigate } = useRouter();
  return (
    <section className="relative min-h-[92vh] overflow-hidden border-b border-white/12 px-4 pt-28 sm:px-8">
      <ParticleBackground />
      <div className="corner-frame noise relative mx-auto flex min-h-[76vh] max-w-[1540px] flex-col items-center justify-center border border-white/15 px-4 py-20 text-center shadow-glow sm:px-8">
        <div className="absolute left-8 top-24 hidden text-left lg:block">
          <p className="tech-label decorative-label mb-28">▪ Observing conversations</p>
          <p className="tech-label decorative-label">▪ Understanding behaviour</p>
        </div>
        <div className="absolute right-8 top-32 hidden text-right lg:block">
          <p className="tech-label decorative-label mb-32">Detecting patterns ▪</p>
          <p className="tech-label decorative-label">Revealing intent ▪</p>
        </div>
        <p className="tech-label mb-5 text-smoke">AI that sees between the lines</p>
        <h1 className="serif-title max-w-5xl text-6xl font-medium leading-none text-bone sm:text-7xl md:text-8xl lg:text-9xl">
          ThirdPerson AI
        </h1>
        <p className="tech-label mt-6 max-w-3xl text-purple-100/80">
          UNDERSTAND THE CONVERSATION BENEATH THE CONVERSATION
        </p>
        <p className="mt-7 max-w-2xl text-base leading-8 text-smoke sm:text-lg">
          Upload or paste a conversation and ThirdPerson AI analyses emotional shifts, communication patterns, compatibility signals, and personality traits privately, carefully, and in context.
        </p>
        <button
          onClick={() => navigate('/analysis/new')}
          className="scan-line mt-10 flex w-full max-w-xl items-center justify-between border border-purple-300/30 bg-black/40 px-4 py-4 text-left text-smoke transition hover:border-purple-200/70 sm:px-6"
        >
          <span className="font-mono text-xs tracking-wide">Start a conversation analysis</span>
          <span className="ml-5 border-l border-white/15 pl-5 text-2xl">→</span>
        </button>
        <p className="mt-5 text-sm text-smoke">Works with English, Hindi, and Hinglish conversations.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {['Private by design', 'Chats treated as sensitive data', 'AI insights, not final judgments', 'Built for reflection'].map((item) => (
            <span key={item} className="border border-purple-300/15 bg-purple-300/5 px-3 py-2 font-mono text-[0.62rem] uppercase tracking-[0.13em] text-smoke">
              {item}
            </span>
          ))}
        </div>
        <div className="absolute bottom-6 left-7 right-7 hidden items-center justify-between text-smoke/70 sm:flex">
          <p className="tech-label decorative-label">● Private by design</p>
          <p className="tech-label decorative-label">Private relationship intelligence</p>
          <p className="tech-label decorative-label">Human judgment matters</p>
        </div>
      </div>
    </section>
  );
}
