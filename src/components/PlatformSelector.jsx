import { useState } from 'react';
import { BsThreeDots } from 'react-icons/bs';
import { SiImessage, SiInstagram, SiMessenger, SiSnapchat, SiTelegram, SiWhatsapp } from 'react-icons/si';
import { PiArrowRight, PiCheck, PiClockLight, PiFileTextLight, PiQuestion, PiShieldCheckLight } from 'react-icons/pi';
import { EXPORT_GUIDES } from '../lib/exportGuides.js';
import { useRouter } from '../state/RouterContext.jsx';

const platformData = {
  WhatsApp: {
    initials: 'WA',
    Icon: SiWhatsapp,
    color: '#25D366',
    accent: 'from-emerald-300/20 to-purple-300/10',
  },
  iMessage: {
    initials: 'IM',
    Icon: SiImessage,
    color: '#34C759',
    accent: 'from-emerald-300/20 to-purple-300/10',
  },
  Telegram: {
    initials: 'TG',
    Icon: SiTelegram,
    color: '#26A5E4',
    accent: 'from-sky-300/20 to-purple-300/10',
  },
  Instagram: {
    initials: 'IG',
    Icon: SiInstagram,
    color: '#E4405F',
    accent: 'from-pink-300/20 to-purple-300/10',
  },
  Messenger: {
    initials: 'MS',
    Icon: SiMessenger,
    color: '#00B2FF',
    accent: 'from-blue-300/20 to-pink-300/10',
  },
  Snapchat: {
    initials: 'SC',
    Icon: SiSnapchat,
    color: '#FFFC00',
    accent: 'from-yellow-200/15 to-pink-300/10',
  },
  Other: {
    initials: 'OT',
    Icon: BsThreeDots,
    color: '#C4B5FD',
    accent: 'from-purple-300/20 to-pink-300/10',
  },
};

const platforms = Object.keys(platformData);

function ExportHelpDialog({ platform, onClose }) {
  const { navigate } = useRouter();
  const [osTab, setOsTab] = useState(0);
  if (!platform) return null;
  const data = platformData[platform];
  const guide = EXPORT_GUIDES[platform];
  const Icon = data.Icon;
  const steps = guide.variants ? guide.variants[osTab].steps : guide.steps;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 px-4 py-8 "
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-guide-heading"
      onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-purple-300/25 bg-black p-5 shadow-glow sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/[0.06] text-xl">
              <Icon style={{ color: data.color }} aria-hidden="true" />
            </span>
            <div>
              <p className="tech-label text-smoke">Export guide</p>
              <h2 id="export-guide-heading" className="serif-title mt-2 text-4xl">How to export your chat from {platform}</h2>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close export guide" className="glass-button px-3 py-2 text-sm text-bone">Close</button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="flex items-center gap-2 rounded-sm border border-white/12 bg-white/[0.04] px-4 py-2 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-smoke">
            <PiClockLight className="text-sm text-purple-200" aria-hidden="true" />
            {guide.estimatedTime}
          </span>
          <span className="flex items-center gap-2 rounded-sm border border-white/12 bg-white/[0.04] px-4 py-2 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-smoke">
            <PiFileTextLight className="text-sm text-purple-200" aria-hidden="true" />
            {guide.fileFormat}
          </span>
        </div>

        {guide.note && (
          <div className="mt-4 rounded-2xl border border-orange-300/20 bg-orange-300/[0.05] p-4 text-sm leading-6 text-smoke">
            {guide.note}
          </div>
        )}

        {guide.variants && (
          <div className="mt-5 flex gap-2" role="tablist" aria-label={`${platform} device type`}>
            {guide.variants.map((variant, index) => (
              <button
                key={variant.os}
                type="button"
                role="tab"
                aria-selected={osTab === index}
                onClick={() => setOsTab(index)}
                className={`rounded-sm border px-5 py-2 font-mono text-xs uppercase tracking-[0.12em] transition ${osTab === index ? 'border-purple-200/60 bg-purple-300/15 text-bone' : 'border-white/12 bg-white/[0.03] text-smoke hover:border-purple-200/35'}`}
              >
                {variant.os}
              </button>
            ))}
          </div>
        )}

        <ol className="mt-5 space-y-3">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-3 border border-white/10 p-3 text-sm leading-6 text-smoke">
              <span className="font-mono text-purple-200">{String(index + 1).padStart(2, '0')}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.05] p-4">
          <PiShieldCheckLight className="mt-0.5 shrink-0 text-lg text-emerald-200" aria-hidden="true" />
          <p className="text-sm leading-6 text-smoke">{guide.privacyNote}</p>
        </div>

        {guide.blogSlug && (
          <button
            type="button"
            onClick={() => navigate(`/blog/${guide.blogSlug}`)}
            className="mt-4 flex items-center gap-2 text-sm text-purple-200 underline hover:text-bone"
          >
            Read the full guide with screenshots
            <PiArrowRight aria-hidden="true" />
          </button>
        )}

        <button onClick={onClose} className="glass-button mt-5 w-full px-5 py-4 font-mono text-xs uppercase tracking-[0.16em] text-bone">
          I have my chat file
        </button>
      </div>
    </div>
  );
}

export default function PlatformSelector({ value, onChange }) {
  const [helpPlatform, setHelpPlatform] = useState('');

  // Every card used to repeat the subtitle "Private chat analysis", which told
  // the user nothing and made seven cards look like a wall. The export guide —
  // the genuinely useful thing here, since most people do not know how to get a
  // chat out of their phone — was a 28px unlabelled "i" in the corner. It is
  // now a named control on every card.
  return (
    <>
      <p className="mb-4 text-sm leading-7 text-smoke">
        Where is this conversation from? If you have not exported it yet, each card has a guide.
      </p>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {platforms.map((platform) => {
          const selected = value === platform;
          const data = platformData[platform];
          const Icon = data.Icon;
          return (
            <div
              key={platform}
              className={`group relative overflow-hidden rounded-sm border transition ${
                selected
                  ? 'border-purple-200/60 bg-purple-300/[0.10] shadow-[0_0_30px_rgba(168,85,247,0.18)]'
                  : 'border-white/12 bg-white/[0.04] hover:border-purple-200/40 hover:bg-white/[0.07]'
              }`}
            >
              <button
                onClick={() => onChange(platform)}
                aria-pressed={selected}
                className="flex w-full items-center gap-3.5 p-4 text-left"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/[0.06] text-2xl transition group-hover:bg-white/[0.10]">
                  <Icon style={{ color: data.color }} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 text-base text-bone">{platform}</span>
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition ${
                    selected ? 'border-transparent bg-bone text-[#17122a]' : 'border-white/25'
                  }`}
                  aria-hidden="true"
                >
                  {selected && <PiCheck className="text-[0.7rem]" />}
                </span>
              </button>
              <button
                onClick={() => setHelpPlatform(platform)}
                className="flex min-h-[40px] w-full items-center gap-1.5 border-t border-white/10 px-4 text-left font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ash transition hover:bg-white/[0.05] hover:text-bone"
              >
                <PiQuestion className="text-sm" aria-hidden="true" />
                How to export from {platform}
              </button>
            </div>
          );
        })}
      </div>
      <ExportHelpDialog platform={helpPlatform} onClose={() => setHelpPlatform('')} />
    </>
  );
}
