import { useEffect, useRef, useState } from 'react';

// Auto-playing product tour — the landing page's "video".
//
// Built as DOM rather than an mp4 on purpose: it stays sharp on every screen,
// costs no bandwidth or hosting, is never blocked by autoplay policies, is
// readable by search engines and screen readers, and updates when the product
// does. It can still be screen-recorded if a real video file is needed.
//
// Playback pauses when scrolled out of view, on hover, and for anyone who has
// asked for reduced motion.

const SCENE_MS = 5200;

const SCENES = [
  {
    key: 'upload',
    label: 'Upload',
    title: 'Start with a real conversation',
    caption: 'Export any chat — WhatsApp, Instagram, iMessage — and paste or drop it in. Sensitive details are stripped before anything is analysed.',
    render: () => (
      <div className="grid gap-3">
        <div className="grid grid-cols-3 gap-2">
          {[['WhatsApp', '🟢'], ['Instagram', '🟣'], ['iMessage', '🔵']].map(([name, dot]) => (
            <div key={name} className={`rounded-2xl border p-3 text-center ${name === 'WhatsApp' ? 'border-purple-200/50 bg-purple-300/12' : 'border-white/10 bg-white/[0.04]'}`}>
              <p className="text-lg leading-none">{dot}</p>
              <p className="mt-2 text-[0.7rem] leading-4 text-smoke">{name}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-dashed border-white/20 bg-black/30 p-4">
          <p className="font-mono text-[0.7rem] leading-5 text-ash">
            03/03/24, 9:14 AM — Riya: good morning, reached office?<br />
            03/03/24, 9:16 AM — Aarav: haan just reached, you tell?<br />
            <span className="text-purple-100">…4,200 messages detected</span>
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200/20 bg-emerald-300/[0.06] p-3">
          <p className="text-[0.72rem] leading-5 text-smoke">🧼 Phone numbers, emails and IDs removed before analysis</p>
        </div>
      </div>
    ),
  },
  {
    key: 'timeline',
    label: 'Timeline',
    title: 'See how it actually unfolded',
    caption: 'The chat is split into real phases — what happened, who was making the effort, what changed, and the moment it turned.',
    render: () => (
      <div className="relative grid gap-2.5">
        <div className="absolute bottom-4 left-[0.7rem] top-4 w-1 rounded-full bg-gradient-to-b from-orange-300 via-purple-300 to-pink-300 opacity-60" />
        {[
          ['Jan – Mar', 'Warm, high-effort start', 'warm', 'Strong Pattern'],
          ['May – Jul', 'Workload disrupts the rhythm', 'mixed', 'Repeated Pattern'],
          ['Dec – Mar', 'Repair through daily check-ins', 'warm', 'Strong Pattern'],
        ].map(([period, title, tone, confidence], index) => (
          <div key={period} className="relative flex items-start gap-3">
            <span className={`relative z-10 mt-3 block h-5 w-5 shrink-0 rounded-full border ${index === 1 ? 'border-violet-100 bg-violet-200' : 'border-white/35 bg-white/10'}`} />
            <div className="min-w-0 flex-1 rounded-2xl border border-white/12 bg-white/[0.05] p-3">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-ash">{period}</p>
              <p className="mt-1 text-sm leading-5 text-bone">{title}</p>
              <p className="mt-1 text-[0.68rem] leading-4 text-smoke">{tone} · {confidence}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: 'evidence',
    label: 'Evidence',
    title: 'Every insight shows its receipt',
    caption: 'Flags are never vague. Each one quotes the actual message behind it, with a confidence level — plus exact counts of who starts and who replies faster.',
    render: () => (
      <div className="grid gap-3">
        <div className="rounded-2xl border border-pink-200/20 bg-pink-300/[0.06] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-bone">Perceived imbalance of effort</p>
            <span className="rounded-full border border-violet-200/25 bg-violet-300/10 px-2 py-0.5 font-mono text-[0.55rem] uppercase text-violet-100">Strong</span>
          </div>
          <p className="mt-2 border-l-2 border-white/15 pl-2 font-mono text-[0.68rem] leading-4 text-smoke">
            “honestly it feels like im the only one trying here”
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[['Starts chats', '57% you'], ['Median reply', 'You 6 min'], ['Their reply', '1.7 hr'], ['Double texts', '4']].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.1em] text-ash">{label}</p>
              <p className="mt-1 text-base leading-5 text-bone">{value}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    key: 'coach',
    label: 'AI Coach',
    title: 'Ask your AI Relationship Coach',
    caption: 'Follow up in plain language. The coach answers from your report — not generic advice — and always asks you something back.',
    render: () => (
      <div className="grid gap-2.5">
        <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm border border-purple-200/25 bg-purple-300/12 p-3">
          <p className="text-sm leading-5 text-bone">Should I bring up how uneven things felt in May?</p>
        </div>
        <div className="mr-auto max-w-[92%] rounded-2xl rounded-bl-sm border border-white/12 bg-white/[0.06] p-3">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.1em] text-pink-100">💛 The Warm One</p>
          <p className="mt-2 text-sm leading-5 text-smoke">
            Yes — but frame it as a check-in, not a complaint. Your report flags uneven energy in exactly that stretch, so you are not imagining it.
          </p>
          <p className="mt-2 text-sm leading-5 text-purple-100">
            What would feel like enough effort to you — more replies, or more planned time together?
          </p>
        </div>
      </div>
    ),
  },
  {
    key: 'yourself',
    label: 'Know Yourself',
    title: 'And learn who you are across relationships',
    caption: 'Every analysis quietly builds your personality profile — how you show up with partners, friends, family and colleagues, and how that is changing.',
    render: () => (
      <div className="grid gap-3">
        <div className="grid grid-cols-3 gap-2">
          {[['♡', 'Partner', '3 chats'], ['♊', 'Friends', '1 chat'], ['▣', 'Work', 'Add one']].map(([icon, world, count]) => (
            <div key={world} className={`rounded-2xl border p-3 text-center ${world === 'Partner' ? 'border-pink-200/35 bg-pink-300/10' : 'border-white/10 bg-white/[0.04]'}`}>
              <p className="text-lg leading-none text-bone">{icon}</p>
              <p className="mt-1.5 text-[0.7rem] leading-4 text-bone">{world}</p>
              <p className="text-[0.6rem] leading-4 text-ash">{count}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.1em] text-emerald-100">Profile evolution</p>
          <ul className="mt-2 grid gap-1 text-[0.72rem] leading-5 text-smoke">
            <li>• <span className="text-purple-100">New:</span> you set boundaries earlier than before</li>
            <li>• <span className="text-emerald-100">Reinforced:</span> repair-oriented under tension</li>
            <li>• <span className="text-orange-100">Softened:</span> less anxious during busy weeks</li>
          </ul>
        </div>
      </div>
    ),
  },
];

export default function ProductTour() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const containerRef = useRef(null);

  // Pause when off-screen so an unseen animation never burns battery.
  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setPlaying(entry.isIntersecting),
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!playing || reduced) return undefined;
    const timer = setTimeout(() => setActive((current) => (current + 1) % SCENES.length), SCENE_MS);
    return () => clearTimeout(timer);
  }, [active, playing]);

  const scene = SCENES[active];

  return (
    <section ref={containerRef} className="accent-panel relative overflow-hidden p-5 sm:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-purple-400/18 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-pink-400/14 blur-3xl" />

      <div className="relative">
        <p className="tech-label text-purple-100">See it in action</p>
        <h2 className="serif-title mt-3 text-4xl leading-tight sm:text-5xl">
          What you actually get.
        </h2>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          {/* Scene copy */}
          <div>
            <div className="flex flex-wrap gap-1.5">
              {SCENES.map((item, index) => (
                <button
                  key={item.key}
                  onClick={() => { setActive(index); }}
                  aria-current={index === active}
                  className={`relative min-h-[44px] overflow-hidden rounded-full border px-3.5 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.1em] transition ${
                    index === active
                      ? 'border-purple-200/45 bg-purple-300/12 text-bone'
                      : 'border-white/12 bg-white/[0.04] text-smoke hover:border-purple-200/30'
                  }`}
                >
                  {index === active && playing && (
                    <span
                      key={`${item.key}-${active}`}
                      className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-gradient-to-r from-purple-300 to-pink-300"
                      style={{ animation: `tourProgress ${SCENE_MS}ms linear forwards` }}
                    />
                  )}
                  {item.label}
                </button>
              ))}
            </div>

            <h3 key={`title-${scene.key}`} className="serif-title mt-5 text-3xl leading-tight sm:text-4xl" style={{ animation: 'tourFade 500ms ease-out' }}>
              {scene.title}
            </h3>
            <p key={`caption-${scene.key}`} className="mt-3 max-w-xl text-sm leading-7 text-smoke" style={{ animation: 'tourFade 600ms ease-out' }}>
              {scene.caption}
            </p>

            <p className="mt-5 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ash">
              Step {active + 1} of {SCENES.length} · Example data, not a real person
            </p>
          </div>

          {/* Scene mock — a phone-shaped frame keeps it feeling like the product */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="rounded-[30px] border border-white/14 bg-[#0b0918]/85 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-ash">ThirdPerson AI</p>
                <span className="flex gap-1">
                  {[0, 1, 2].map((dot) => <span key={dot} className="h-1.5 w-1.5 rounded-full bg-white/25" />)}
                </span>
              </div>
              <div key={scene.key} style={{ animation: 'tourFade 550ms ease-out' }}>
                {scene.render()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
