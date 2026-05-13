import { useState } from 'react';
import { FaFacebookMessenger, FaInstagram, FaSnapchatGhost, FaTelegramPlane, FaWhatsapp } from 'react-icons/fa';
import { BsChatDotsFill, BsThreeDots } from 'react-icons/bs';

const platformData = {
  WhatsApp: {
    initials: 'WA',
    Icon: FaWhatsapp,
    brandClass: 'text-emerald-300',
    accent: 'from-emerald-300/20 to-purple-300/10',
    steps: [
      'Open the chat you want to analyse.',
      'Tap the contact or group name, or open the menu.',
      'Choose Export Chat.',
      'Select Without Media for the fastest upload.',
      'Save or share the exported .txt file.',
      'Upload the .txt file into ThirdPerson AI.',
    ],
  },
  iMessage: {
    initials: 'IM',
    Icon: BsChatDotsFill,
    brandClass: 'text-blue-300',
    accent: 'from-blue-300/20 to-purple-300/10',
    steps: [
      'iMessage does not provide the same simple full chat export flow on all devices.',
      'For now, copy and paste conversation text where possible.',
      'You can also upload a text, CSV, or document export created from your device.',
      'Remove attachments and sensitive details before analysis if preferred.',
    ],
  },
  Telegram: {
    initials: 'TG',
    Icon: FaTelegramPlane,
    brandClass: 'text-sky-300',
    accent: 'from-sky-300/20 to-purple-300/10',
    steps: [
      'Use Telegram Desktop for best export support.',
      'Open the chat.',
      'Open the three-dot menu.',
      'Select Export chat history.',
      'Choose JSON or HTML where available.',
      'Export without media for a smaller file.',
      'Upload the exported file.',
    ],
  },
  Instagram: {
    initials: 'IG',
    Icon: FaInstagram,
    brandClass: 'text-pink-300',
    accent: 'from-pink-300/20 to-purple-300/10',
    steps: [
      'Open Instagram or Accounts Center.',
      'Go to Your information and permissions.',
      'Request or export your information.',
      'Select messages where available.',
      'Download the prepared data file.',
      'Upload the relevant message file or paste conversation text.',
    ],
  },
  Messenger: {
    initials: 'MS',
    Icon: FaFacebookMessenger,
    brandClass: 'text-blue-300',
    accent: 'from-blue-300/20 to-pink-300/10',
    steps: [
      'Go to Facebook/Messenger information export settings.',
      'Request a copy or export of your information.',
      'Select messages.',
      'Choose date range and format where available.',
      'Download the file when ready.',
      'Upload the relevant message file.',
    ],
  },
  Snapchat: {
    initials: 'SC',
    Icon: FaSnapchatGhost,
    brandClass: 'text-yellow-200',
    accent: 'from-yellow-200/15 to-pink-300/10',
    steps: [
      'Go to Snapchat account data or My Data.',
      'Request your data.',
      'Select the available chat or message data where available.',
      'Download the prepared file.',
      'Upload the relevant file.',
      'Snapchat may not include disappeared or unsaved messages.',
    ],
  },
  Other: {
    initials: 'OT',
    Icon: BsThreeDots,
    brandClass: 'text-purple-200',
    accent: 'from-purple-300/20 to-blue-300/10',
    steps: [
      'Export your conversation as .txt, .json, or .csv if your messaging app supports it.',
      'Or copy and paste the conversation manually.',
      'Remove attachments and sensitive details if preferred.',
    ],
  },
};

const platforms = Object.keys(platformData);

function ExportHelpDialog({ platform, onClose }) {
  if (!platform) return null;
  const data = platformData[platform];
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-purple-300/25 bg-black p-5 shadow-glow sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="tech-label text-smoke">Export guide</p>
            <h2 className="serif-title mt-3 text-4xl">How to export your chat from {platform}</h2>
            <p className="mt-4 text-sm leading-7 text-smoke">
              Export without media or attachments where possible. ThirdPerson AI accepts .txt, .json, and .csv files, and paste mode works well for shorter conversations.
            </p>
          </div>
          <button onClick={onClose} className="glass-button px-3 py-2 text-sm text-bone">Close</button>
        </div>
        <div className="mt-7 grid gap-5 md:grid-cols-[1fr_260px]">
          <ol className="space-y-3">
            {data.steps.map((step, index) => (
              <li key={step} className="flex gap-3 border border-white/10 p-3 text-sm leading-6 text-smoke">
                <span className="font-mono text-purple-200">{String(index + 1).padStart(2, '0')}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="space-y-3">
            {[1, 2].map((item) => (
              <div key={item} className={`h-44 border border-purple-300/20 bg-gradient-to-br ${data.accent} p-4`}>
                <div className="h-5 w-20 bg-white/12" />
                <div className="mt-5 space-y-2">
                  <div className="h-3 w-full bg-white/10" />
                  <div className="h-3 w-3/4 bg-white/10" />
                  <div className="h-3 w-5/6 bg-white/10" />
                </div>
                <p className="mt-8 text-xs leading-5 text-smoke">Screenshot guide placeholder — replace with real app screenshots when available.</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 border border-white/10 bg-white/[0.025] p-4">
          <p className="tech-label text-bone">Privacy reminder</p>
          <p className="mt-3 text-sm leading-7 text-smoke">
            Conversations may contain sensitive details about you and other people. Remove private information before upload if that helps you feel more comfortable.
          </p>
        </div>
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
                  <span className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-2xl ${data.brandClass}`}>
                    <Icon />
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
