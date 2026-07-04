import { useRouter } from '../state/RouterContext.jsx';

function BestieIllustration() {
  return (
    <div className="relative mx-auto flex h-72 max-w-sm items-center justify-center">
      <div className="absolute inset-0 rounded-[36px] bg-gradient-to-br from-purple-400/20 via-pink-400/15 to-blue-400/20 blur-2xl" />
      <div className="relative h-48 w-48 rounded-full border border-pink-100/30 bg-gradient-to-br from-purple-200/20 via-pink-200/20 to-orange-200/20 p-4 shadow-glow">
        <div className="absolute -left-8 top-8 text-3xl text-pink-200">♡</div>
        <div className="absolute -right-6 top-12 text-2xl text-orange-200">✦</div>
        <div className="absolute bottom-4 right-0 text-3xl text-blue-200">♡</div>
        <div className="h-full w-full rounded-full border border-white/20 bg-black/65">
          <div className="mx-auto mt-9 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 text-4xl text-black">✨</div>
          <div className="mx-auto mt-4 h-2 w-20 rounded-full bg-pink-200/80" />
          <div className="mx-auto mt-3 h-2 w-12 rounded-full bg-blue-200/70" />
        </div>
      </div>
    </div>
  );
}

export default function BestieBotSection() {
  const { navigate } = useRouter();
  const bullets = [
    'Talks through every relationship',
    'Explains mixed signals',
    'Helps you understand what went wrong',
    'Suggests healthier replies',
    'Supports English, Hindi, and Hinglish',
    'Keeps the tone honest and grounded',
  ];

  return (
    <section className="relative overflow-hidden border-t border-white/10 px-4 py-20 sm:px-8">
      <div className="mx-auto grid max-w-[1320px] gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <p className="tech-label text-pink-200">Relationship Guide</p>
          <h2 className="serif-title mt-4 text-5xl leading-tight sm:text-7xl">Meet your relationship guide.</h2>
          <p className="mt-6 max-w-2xl text-sm leading-8 text-smoke">
            A private AI guide that understands your analysis chain and helps you talk through what happened, what changed, what went wrong, and what you can do next.
          </p>
          <button onClick={() => navigate('/analysis/new')} className="glass-button mt-8 px-5 py-4 font-mono text-xs uppercase tracking-[0.16em] text-bone">
            Start an analysis
          </button>
        </div>
        <div className="accent-panel rounded-[32px] p-5 sm:p-8">
          <BestieIllustration />
          <p className="mx-auto max-w-2xl text-center text-sm leading-8 text-smoke">
            Ask anything about a relationship you’ve analysed, from “is this person interested?” to “what should I reply?” ThirdPerson AI reads the full analysis chain and gives you honest, emotionally intelligent guidance.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {bullets.map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-bone">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
