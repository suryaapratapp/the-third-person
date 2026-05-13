import SignalWaveform from './SignalWaveform.jsx';

function Highlight({ children }) {
  return <span className="bg-purple-200/15 px-1 text-purple-100">{children}</span>;
}

const chatCards = [
  ['quiet', 'Speaker 1', <><Highlight>I’m fine</Highlight>… I just don’t feel like you notice when I <Highlight>go quiet</Highlight>.</>, 'left-[6%] top-[8%]'],
  ['care', 'Speaker 2', <><Highlight>I do care</Highlight>. I just don’t always know what to say when things get heavy.</>, 'right-[8%] top-[17%]'],
  ['effort', 'Speaker 1', <>It feels like I’m always the one trying to fix things.</>, 'left-[18%] top-[42%]'],
  ['alone', 'Speaker 2', <>I didn’t realise it was making you <Highlight>feel alone</Highlight>.</>, 'right-[4%] top-[56%]'],
  ['understood', 'Speaker 1', <>I don’t want to argue. I just want to <Highlight>feel understood</Highlight>.</>, 'left-[38%] bottom-[8%]'],
];

export default function SignalDetectionSection() {
  return (
    <section id="product" className="border-b border-white/12 px-4 py-20 sm:px-8">
      <div className="mx-auto max-w-[1540px] border border-white/14 p-5 sm:p-9">
        <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
          <div>
            <p className="tech-label mb-7 text-smoke">01 Signal Detection</p>
            <h2 className="serif-title text-5xl leading-none sm:text-6xl">Decoding the <em>unspoken.</em></h2>
            <p className="mt-6 text-sm leading-7 text-smoke">
              Less noise, more meaning. ThirdPerson AI looks for emotional shifts that may sit underneath everyday words.
            </p>
            <div className="mt-8 border border-pink-300/15 bg-pink-300/[0.035] p-5">
              <p className="tech-label text-pink-100">Tension Level</p>
              <p className="mt-4 text-4xl text-bone">High</p>
              <p className="mt-3 text-sm leading-6 text-smoke">A few phrases may suggest distance, one-sided effort, and a need for clarity.</p>
            </div>
          </div>
          <div>
            <p className="mb-8 max-w-md text-sm leading-7 text-smoke">
              ThirdPerson AI detects hidden emotional and behavioural signals that reveal what words alone cannot express.
            </p>
            <div className="relative min-h-[440px] overflow-hidden border border-white/12 bg-black/40 p-5 dot-field">
              <div className="absolute inset-0 grid-bg opacity-25" />
              {chatCards.map(([id, speaker, text, position]) => (
                <div key={id} className={`absolute ${position} w-56 border border-white/18 bg-black/75 p-4 backdrop-blur`}>
                  <div className="mb-3 flex justify-between font-mono text-[0.58rem] uppercase tracking-[0.12em] text-ash">
                    <span>{speaker}</span><span>Signal</span>
                  </div>
                  <p className="font-mono text-xs leading-6 text-bone">{text}</p>
                </div>
              ))}
              <svg className="absolute inset-0 h-full w-full opacity-70" viewBox="0 0 800 440" preserveAspectRatio="none">
                <path d="M80 90 C 220 80, 250 260, 380 220 S 540 90, 720 210" stroke="rgba(255,255,255,.48)" strokeDasharray="3 5" fill="none" />
                <path d="M90 330 C 230 260, 330 330, 430 260 S 590 250, 700 120" stroke="rgba(255,255,255,.32)" strokeDasharray="2 8" fill="none" />
              </svg>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-white/12 pt-6">
          <p className="tech-label mb-2 text-smoke">Emotional intensity over time</p>
          <SignalWaveform />
        </div>
      </div>
    </section>
  );
}
