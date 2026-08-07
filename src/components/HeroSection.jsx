import ParticleBackground from './ParticleBackground.jsx';
import { useRouter } from '../state/RouterContext.jsx';
import { PiArrowRight, PiLockSimple } from 'react-icons/pi';
import { SiImessage, SiInstagram, SiMessenger, SiSnapchat, SiTelegram, SiWhatsapp } from 'react-icons/si';

// Mobile-first hero.
//
// The old hero was a full-viewport serif wordmark: on a phone the entire first
// screen was the brand name, and the button that the whole product depends on
// sat below the fold. Brand recognition is worth nothing to a first-time
// visitor who does not yet know what this does.
//
// So the <h1> is now the value proposition (better for search too), the brand
// moves to a label above it, and the primary action is guaranteed to be on the
// first screen on a 375×667 phone.
//
// The trust line is deliberately literal. It used to say "No credit card",
// which stopped being true when the free report was removed — the price is
// stated up front instead.

const messagingApps = [
  ['WhatsApp', SiWhatsapp, '#25D366'],
  ['iMessage', SiImessage, '#34C759'],
  ['Instagram', SiInstagram, '#E4405F'],
  ['Telegram', SiTelegram, '#26A5E4'],
  ['Messenger', SiMessenger, '#00B2FF'],
  ['Snapchat', SiSnapchat, '#FFFC00'],
];

export default function HeroSection() {
  const { navigate } = useRouter();

  return (
    <section className="relative overflow-hidden border-b border-white/12 px-4 pb-14 pt-24 sm:px-8 sm:pb-20 sm:pt-28">
      <ParticleBackground showAxis={false} />

      <div className="corner-frame noise relative mx-auto flex max-w-[1180px] flex-col items-center border border-white/15 px-4 py-10 text-center shadow-glow sm:px-8 sm:py-16">
        <p className="tech-label text-purple-100/80">ThirdPerson AI</p>

        {/* Sized for Playfair, which sets far wider than the old face did: at
            the previous 2.6rem this headline ran five lines and took the whole
            first screen of a phone on its own. */}
        <h1 className="serif-title mt-5 max-w-3xl text-[2.05rem] font-medium leading-[1.08] text-bone sm:text-5xl lg:text-6xl">
          Understand any relationship from the chat you already have.
        </h1>

        <p className="mt-5 max-w-xl text-base leading-7 text-smoke sm:text-lg sm:leading-8">
          Export a conversation, upload it, and get an honest read on effort, mixed signals, how it
          changed over time, and what to do next — backed by quotes from the chat itself.
        </p>

        <button
          onClick={() => navigate('/analysis/new')}
          className="btn btn-primary mt-8 w-full max-w-sm text-sm"
        >
          Analyse a chat
          <PiArrowRight className="text-base" aria-hidden="true" />
        </button>

        <p className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-smoke">
          <PiLockSimple className="text-emerald-200" aria-hidden="true" />
          <span>Private to your account</span>
          <span className="text-ash" aria-hidden="true">·</span>
          <span>From ₹199 per report</span>
          <span className="text-ash" aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => navigate('/pricing')}
            /* -my-3/py-3 grows the touch area to 44px without moving the text. */
            className="-my-3 py-3 underline decoration-white/25 underline-offset-4 transition hover:text-bone"
          >
            See pricing
          </button>
        </p>

        <div className="mt-9 w-full border-t border-white/10 pt-7">
          <p className="tech-label text-purple-100/70">Works with</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 sm:gap-3">
            {messagingApps.map(([name, Icon, color]) => (
              <span
                key={name}
                title={name}
                aria-label={name}
                className="grid h-11 w-11 place-items-center rounded-full transition hover:-translate-y-1 hover:bg-white/[0.045] sm:h-14 sm:w-14"
              >
                <Icon className="text-2xl sm:text-3xl" style={{ color }} aria-hidden="true" />
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs leading-6 text-ash">
            Exporting a chat takes about a minute — we show you how for each app.
          </p>
        </div>
      </div>
    </section>
  );
}
