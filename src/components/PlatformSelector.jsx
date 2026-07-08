import { useState } from 'react';
import { BsThreeDots } from 'react-icons/bs';
import { SiImessage, SiInstagram, SiMessenger, SiSnapchat, SiTelegram, SiWhatsapp } from 'react-icons/si';
import { PiArrowRight, PiClockLight, PiFileTextLight, PiShieldCheckLight } from 'react-icons/pi';
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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur"
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
          <span className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-smoke">
            <PiClockLight className="text-sm text-purple-200" aria-hidden="true" />
            {guide.estimatedTime}
          </span>
          <span className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-smoke">
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
                className={`rounded-full border px-5 py-2 font-mono text-xs uppercase tracking-[0.12em] transition ${osTab === index ? 'border-purple-200/60 bg-purple-300/15 text-bone' : 'border-white/12 bg-white/[0.03] text-smoke hover:border-purple-200/35'}`}
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

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {platforms.map((platform) => {
          const selected = value === platform;
          const data = platformData[platform];
          const Icon = data.Icon;
          return (
            <div
              key={platform}
              className={`group relative min-h-28 border bg-gradient-to-br ${data.accent} p-[1px] transition ${selected ? 'border-purple-200/70 shadow-[0_0_34px_rgba(168,85,247,0.22)]' : 'border-white/12 hover:border-purple-200/45'}`}
            >
              <button
                onClick={() => onChange(platform)}
                className="h-full w-full bg-black/80 p-5 text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.055] text-3xl transition group-hover:-translate-y-0.5 group-hover:bg-white/[0.08] sm:h-16 sm:w-16 sm:text-4xl">
                    <Icon style={{ color: data.color }} aria-hidden="true" />
                  </span>
                  <span className={`h-2 w-2 rounded-full ${selected ? 'bg-purple-200' : 'bg-white/20'}`} />
                </div>
                <span className="mt-5 block text-lg text-bone">{platform}</span>
                <span className="mt-2 block text-xs text-ash">Private chat analysis</span>
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setHelpPlatform(platform);
                }}
                aria-label={`How to export your chat from ${platform}`}
                className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/70 font-mono text-xs text-smoke transition hover:border-purple-200/60 hover:text-bone"
              >
                i
              </button>
            </div>
          );
        })}
      </div>
      <ExportHelpDialog platform={helpPlatform} onClose={() => setHelpPlatform('')} />
    </>
  );
}
