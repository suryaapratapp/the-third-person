import { useState } from 'react';
import { exportElementAsImage, shareElementAsImage } from '../lib/exportElementAsImage.js';

function DownloadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 10.7 6.8-4.4" />
      <path d="m8.6 13.3 6.8 4.4" />
    </svg>
  );
}

function fileNameFrom(name) {
  const date = new Date().toISOString().slice(0, 10);
  return `thirdperson-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${date}.png`;
}

export default function CardActions({ targetId, name, summary }) {
  const [message, setMessage] = useState('');

  async function download() {
    try {
      await exportElementAsImage(targetId, fileNameFrom(name));
      setMessage('Card downloaded successfully.');
    } catch {
      setMessage('Could not export this card. Please try again.');
    }
  }

  async function share() {
    try {
      const result = await shareElementAsImage(targetId, `ThirdPerson AI: ${name}`, summary || name, fileNameFrom(name));
      setMessage(result === 'shared' ? 'Card shared successfully.' : 'Card summary copied.');
    } catch {
      setMessage('Sharing is not available on this device.');
    }
  }

  return (
    <div data-export-ignore className="relative z-10 float-right ml-3 flex items-center gap-1.5">
      <button aria-label={`Download ${name}`} title="Download" onClick={download} className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.045] text-smoke backdrop-blur transition hover:bg-purple-300/15 hover:text-bone">
        <DownloadIcon />
      </button>
      <button aria-label={`Share ${name}`} title="Share" onClick={share} className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.045] text-smoke backdrop-blur transition hover:bg-blue-300/15 hover:text-bone">
        <ShareIcon />
      </button>
      {message && (
        <span className="absolute right-0 top-8 w-56 border border-purple-300/20 bg-black px-3 py-2 text-xs leading-5 text-smoke shadow-glow">
          {message}
        </span>
      )}
    </div>
  );
}
