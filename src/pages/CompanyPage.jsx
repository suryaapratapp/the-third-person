import ParticleBackground from '../components/ParticleBackground.jsx';
import { useRouter } from '../state/RouterContext.jsx';

const beliefs = ['Relationships need context', 'AI should support reflection, not control', 'Privacy must come first', 'Human judgment matters', 'Emotional clarity should be accessible'];
const work = ['Conversation analysis', 'Emotional timeline mapping', 'Compatibility insights', 'Communication pattern detection', 'Personality card generation', 'Hindi, English, and Hinglish support', 'Privacy-first relationship intelligence'];

export default function CompanyPage() {
  const { navigate } = useRouter();
  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
      <ParticleBackground className="opacity-45" />
      <div className="relative mx-auto max-w-[1320px] space-y-8">
        <section className="corner-frame accent-panel p-6 sm:p-12">
          <p className="tech-label text-smoke">About ThirdPerson AI</p>
          <h1 className="serif-title mt-5 max-w-4xl text-5xl leading-tight sm:text-7xl">A private relationship intelligence layer for modern conversations.</h1>
          <p className="mt-6 max-w-3xl text-sm leading-8 text-smoke">
            ThirdPerson AI helps people understand emotional patterns, communication shifts, compatibility signals, and personality traits hidden inside everyday chats.
          </p>
        </section>

        <section>
          <p className="tech-label mb-5 text-smoke">What we believe</p>
          <div className="grid gap-4 md:grid-cols-5">
            {beliefs.map((item) => (
              <div key={item} className="thin-panel p-5">
                <p className="text-sm leading-7 text-bone">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="thin-panel p-6">
          <p className="tech-label text-smoke">What we do</p>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-smoke">
            ThirdPerson AI analyses conversations to help people reflect on emotional tone, repeated patterns, clarity gaps, repair attempts, and relationship dynamics without making absolute claims.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {work.map((item) => (
              <span key={item} className="border border-purple-300/15 bg-purple-300/5 px-3 py-2 font-mono text-xs uppercase tracking-[0.13em] text-smoke">{item}</span>
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div id="contact" className="thin-panel scroll-mt-28 p-6">
            <p className="tech-label text-smoke">Contact us</p>
            <div className="mt-5 space-y-4 text-sm text-smoke">
              <p>Email: <a className="text-purple-200" href="mailto:legal@thethirdperson.ai">legal@thethirdperson.ai</a></p>
              <p>Support: <a className="text-purple-200" href="mailto:support@thethirdperson.ai">support@thethirdperson.ai</a></p>
              <p>Business: <a className="text-purple-200" href="mailto:hello@thethirdperson.ai">hello@thethirdperson.ai</a></p>
            </div>
            <div className="mt-6">
              <p className="tech-label mb-3 text-ash">Follow us — coming soon</p>
              <div className="flex flex-wrap gap-3">
                {['Instagram', 'LinkedIn', 'X / Twitter'].map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-ash">{item}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="thin-panel p-6">
            <p className="tech-label text-smoke">Responsible use</p>
            <p className="mt-5 text-sm leading-8 text-smoke">
              ThirdPerson AI is designed for self-reflection, relationship clarity, and healthier communication. It must not be used for stalking, manipulation, harassment, surveillance, emotional control, coercion, or blackmail.
            </p>
          </div>
        </section>

        <section className="thin-panel p-6">
          <p className="tech-label text-smoke">Legal</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <button type="button" onClick={() => navigate('/privacy')} className="text-purple-200 hover:text-bone">Privacy Policy</button>
            <button type="button" onClick={() => navigate('/terms')} className="text-purple-200 hover:text-bone">Terms of Service</button>
            <button type="button" onClick={() => navigate('/refund-policy')} className="text-purple-200 hover:text-bone">Refund &amp; Cancellation Policy</button>
          </div>
        </section>
      </div>
    </section>
  );
}
