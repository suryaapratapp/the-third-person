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
    accent: '',
  },
  iMessage: {
    initials: 'IM',
    Icon: SiImessage,
    color: '#34C759',
    accent: '',
  },
  Telegram: {
    initials: 'TG',
    Icon: SiTelegram,
    color: '#26A5E4',
    accent: '',
  },
  Instagram: {
    initials: 'IG',
    Icon: SiInstagram,
    color: '#E4405F',
    accent: '',
  },
  Messenger: {
    initials: 'MS',
    Icon: SiMessenger,
    color: '#00B2FF',
    accent: '',
  },
  Snapchat: {
    initials: 'SC',
    Icon: SiSnapchat,
    color: '#FFFC00',
    accent: '',
  },
  Other: {
    initials: 'OT',
    Icon: BsThreeDots,
    color: '#C4B5FD',
    accent: '',
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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-well px-4 py-8 "
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-guide-heading"
      onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-signal/35 bg-well p-5 shadow-glow sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-paper text-xl">
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
          <span className="flex items-center gap-2 rounded-sm border border-line bg-paper px-4 py-2 text-xs text-smoke">
            <PiClockLight className="text-sm text-signal" aria-hidden="true" />
            {guide.estimatedTime}
          </span>
          <span className="flex items-center gap-2 rounded-sm border border-line bg-paper px-4 py-2 text-xs text-smoke">
            <PiFileTextLight className="text-sm text-signal" aria-hidden="true" />
            {guide.fileFormat}
          </span>
        </div>

        {guide.note && (
          <div className="mt-4 rounded-2xl border border-warn/35 bg-warn/10 p-4 text-sm leading-6 text-smoke">
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
                className={`rounded-sm border px-5 py-2 text-xs transition ${osTab === index ? 'border-signal/35 bg-signal/10 text-bone' : 'border-line bg-paper text-smoke hover:border-signal/35'}`}
              >
                {variant.os}
              </button>
            ))}
          </div>
        )}

        <ol className="mt-5 space-y-3">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-3 border border-line p-3 text-sm leading-6 text-smoke">
              <span className="font-mono text-signal">{String(index + 1).padStart(2, '0')}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-good/35 bg-good/10 p-4">
          <PiShieldCheckLight className="mt-0.5 shrink-0 text-lg text-good" aria-hidden="true" />
          <p className="text-sm leading-6 text-smoke">{guide.privacyNote}</p>
        </div>

        {guide.blogSlug && (
          <button
            type="button"
            onClick={() => navigate(`/blog/${guide.blogSlug}`)}
            className="mt-4 flex items-center gap-2 text-sm text-signal underline hover:text-bone"
          >
            Read the full guide with screenshots
            <PiArrowRight aria-hidden="true" />
          </button>
        )}

        <button onClick={onClose} className="glass-button mt-5 w-full px-5 py-4 text-xs text-bone">
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
            <div key={platform} className="option overflow-hidden" data-selected={selected}>
              <button
                onClick={() => onChange(platform)}
                aria-pressed={selected}
                className="flex w-full items-center gap-3 p-3.5 text-left"
              >
                {/* The brand icon sits on its own tinted tile rather than
                    floating on the card: six logos in six different brand
                    colours directly on white is visual noise, and the tile
                    gives each one the same footprint. */}
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-canvas text-2xl">
                  <Icon style={{ color: data.color }} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 text-[0.95rem] font-medium text-ink">{platform}</span>
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${
                    selected ? 'border-signal bg-signal text-[color:var(--on-solid)]' : 'border-lineStrong'
                  }`}
                  aria-hidden="true"
                >
                  {selected && <PiCheck className="text-[0.75rem]" />}
                </span>
              </button>
              <button
                onClick={() => setHelpPlatform(platform)}
                className="flex min-h-[42px] w-full items-center gap-1.5 border-t border-line bg-canvas px-3.5 text-left text-xs font-medium text-ash transition hover:text-signal"
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
