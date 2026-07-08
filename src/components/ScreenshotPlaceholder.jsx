import { PiImageLight } from 'react-icons/pi';

export default function ScreenshotPlaceholder({ id, alt }) {
  return (
    <figure className="my-4 overflow-hidden rounded-2xl border border-dashed border-white/20 bg-white/[0.03]">
      <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center">
        <PiImageLight className="text-3xl text-ash" aria-hidden="true" />
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-ash">Screenshot placeholder</p>
        <p className="font-mono text-xs text-smoke">{id}</p>
      </div>
      <figcaption className="border-t border-white/10 bg-black/20 px-4 py-2 text-xs leading-5 text-ash">{alt}</figcaption>
    </figure>
  );
}
