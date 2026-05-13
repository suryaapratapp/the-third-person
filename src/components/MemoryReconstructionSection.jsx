const timeline = [
  ['Apr 12', "I'm not sure about this...", 'Uncertainty', 'Questions left half-answered, delayed replies, and repeated hesitation can reveal where clarity started to fade.'],
  ['Apr 18', "It's been on my mind a lot.", 'Emotional Shift', 'Small changes in tone, effort, and response speed can show when the connection began to feel different.'],
  ['Apr 27', 'This keeps happening...', 'Repeated Pattern', 'The same conflict may appear in different words, showing what was never fully resolved.'],
  ['May 04', "You feel far away lately.", 'Distance', 'Less warmth, shorter replies, and fewer check-ins may suggest emotional withdrawal over time.'],
  ['May 18', "I'm sorry, I should explain.", 'Repair Attempt', 'Apologies, explanations, and softening language can show when someone tried to rebuild the connection.'],
  ['May 26', 'I just want some clarity.', 'Clarity Moment', 'A single honest message can reveal what both people were avoiding for weeks or months.'],
];

export default function MemoryReconstructionSection() {
  return (
    <section className="border-b border-white/12 px-4 py-20 sm:px-8">
      <div className="mx-auto max-w-[1540px] border border-white/14 p-5 sm:p-9">
        <div className="mb-14 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="tech-label mb-7 text-smoke">02 Memory Reconstruction</p>
            <h2 className="serif-title text-5xl leading-none sm:text-6xl">Reconstructing <em>conversational memory.</em></h2>
          </div>
          <p className="max-w-lg text-sm leading-7 text-smoke">
            ThirdPerson AI connects fragments across time, understanding how context, emotion, and intent evolve through every conversation.
          </p>
        </div>
        <div className="relative overflow-x-auto pb-6">
          <div className="min-w-[960px]">
            <div className="relative h-64">
              <div className="absolute left-8 right-8 top-20 h-px bg-white/25" />
              <svg className="absolute left-8 right-8 top-[70px] h-24 w-[calc(100%-4rem)]" viewBox="0 0 1000 120" preserveAspectRatio="none">
                <path d="M0 70 C 120 10, 170 120, 280 70 S 430 20, 560 80 S 710 130, 820 55 S 930 20, 1000 72" fill="none" stroke="rgba(255,255,255,.56)" strokeDasharray="4 6" />
                <path d="M0 74 C 160 110, 260 20, 380 60 S 520 95, 650 50 S 760 15, 1000 70" fill="none" stroke="rgba(255,255,255,.2)" />
              </svg>
              <div className="grid grid-cols-6 gap-6">
                {timeline.map(([date, fragment, label, body], index) => (
                  <div key={date} className="relative pt-2 text-center">
                    <p className="font-mono text-xs uppercase tracking-[0.16em] text-smoke">{date}</p>
                    <div className="mx-auto mt-[50px] h-4 w-4 rounded-full border border-white/70 bg-black ring-4 ring-white/10" />
                    <div className="mt-7 border border-white/12 bg-black/60 p-4 text-left">
                      <p className="font-mono text-xs leading-5 text-bone">{fragment}</p>
                    </div>
                    <div className={`mt-7 border border-white/12 p-4 text-left ${index === 2 ? 'bg-white/8' : 'bg-black/30'}`}>
                      <p className="tech-label text-bone">{label}</p>
                      <p className="mt-3 text-xs leading-5 text-smoke">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative mt-12 h-32 overflow-hidden border-t border-white/10 dot-field opacity-80">
              <svg className="h-full w-full" viewBox="0 0 1000 160" preserveAspectRatio="none">
                {Array.from({ length: 7 }).map((_, index) => (
                  <ellipse key={index} cx={140 + index * 120} cy={100} rx={120} ry={24 + index * 3} fill="none" stroke="rgba(255,255,255,.13)" />
                ))}
                <path d="M90 98 C 220 30, 350 130, 480 80 S 730 40, 900 110" fill="none" stroke="rgba(255,255,255,.38)" strokeDasharray="2 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
