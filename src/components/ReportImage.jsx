import { useEffect, useRef, useState } from 'react';
import { fetchReportImageState, requestReportImage } from '../lib/backendAiService.js';

// The report's generated image, and the wait for it.
//
// Generation is a separate request from the report — an image takes 10-40s on
// top of a report already running close to the edge function's 150s ceiling,
// and a picture is never worth risking the report it illustrates. So the
// report renders immediately and this panel fills in behind it.
//
// The prompt is built server-side from the report's CONCLUSIONS — vibe, arc,
// key-moment titles, top words, tone. Never the conversation, which no longer
// exists by the time anyone reads this.
//
// Polling rather than realtime: one row, a handful of checks over a minute or
// two, and it survives a refresh mid-generation because the state lives in the
// database rather than in this component.

const POLL_MS = 4000;
const MAX_POLLS = 30;   // ~2 minutes, then stop rather than spin forever

const WAITING_LINES = [
  'Reading the shape of it…',
  'Choosing colours from the mood…',
  'Working out what the space between you looks like…',
  'Almost there — this one is worth the wait.',
];

export default function ReportImage({ reportId, imageContext, initialUrl, initialStatus, personName }) {
  const [url, setUrl] = useState(initialUrl || null);
  const [status, setStatus] = useState(initialStatus || (initialUrl ? 'ready' : 'pending'));
  const [line, setLine] = useState(0);
  const [reason, setReason] = useState('');
  const started = useRef(false);
  // Held in a ref, not a dep: the parent rebuilds this object every render, and
  // depending on it would re-run the kick-off effect on every single render.
  const contextRef = useRef(imageContext);
  contextRef.current = imageContext;

  // Kick off once per mount, and only when there is nothing already. The edge
  // function is idempotent too, so a double-fire cannot buy two images.
  useEffect(() => {
    if (!reportId || started.current) return;
    if (url || status === 'ready') return;
    started.current = true;
    setStatus('generating');
    requestReportImage({ reportId, imageContext: contextRef.current })
      .then((result) => {
        if (result?.status === 'ready' && result.imageUrl) {
          setUrl(result.imageUrl);
          setStatus('ready');
        } else if (result?.status === 'failed') {
          setReason(result.error || '');
          setStatus('failed');
        }
      })
      .catch(() => setStatus('failed'));
  }, [reportId, url, status]);

  // Poll while generating. Covers the case where the request times out at the
  // gateway but the function keeps running and finishes the row.
  useEffect(() => {
    if (status !== 'generating' || !reportId) return undefined;
    let polls = 0;
    const timer = window.setInterval(async () => {
      polls += 1;
      if (polls > MAX_POLLS) {
        window.clearInterval(timer);
        setStatus('failed');
        return;
      }
      const state = await fetchReportImageState(reportId);
      if (state?.imageStatus === 'ready' && state.imageUrl) {
        setUrl(state.imageUrl);
        setStatus('ready');
        window.clearInterval(timer);
      } else if (state?.imageStatus === 'failed') {
        setStatus('failed');
        window.clearInterval(timer);
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [status, reportId]);

  useEffect(() => {
    if (status !== 'generating') return undefined;
    const timer = window.setInterval(() => setLine((n) => (n + 1) % WAITING_LINES.length), 5000);
    return () => window.clearInterval(timer);
  }, [status]);

  const retry = () => {
    started.current = false;
    setReason('');
    setStatus('pending');
  };

  if (status === 'failed') {
    return (
      <div className="rounded-lg border border-warn/40 bg-warn/10 p-5">
        <p className="text-sm font-semibold text-warn">The picture did not come through</p>
        <p className="mt-1.5 text-sm leading-6 text-smoke">
          {reason || 'The image service did not respond.'}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={retry} className="btn btn-secondary !min-h-[38px] !px-3 !py-1.5 !text-xs">
            Try again
          </button>
          <span className="text-xs leading-5 text-ash">
            Everything else in your report is complete and unaffected.
          </span>
        </div>
      </div>
    );
  }

  if (status === 'ready' && url) {
    return (
      <figure className="m-0">
        <img
          src={url}
          alt={`An abstract artwork generated from this report about ${personName || 'this relationship'}`}
          className="w-full rounded-lg border border-line"
          loading="lazy"
        />
        <figcaption className="mt-3 text-xs leading-5 text-ash">
          Generated from your report’s conclusions — the mood, the arc, the
          moments that mattered. Never from the conversation itself, which was
          discarded once this report existed.
        </figcaption>
      </figure>
    );
  }

  return (
    <div
      className="grid aspect-square w-full place-items-center rounded-lg border border-line bg-well"
      role="status"
      aria-live="polite"
    >
      <div className="px-6 text-center">
        {/* A slow pulse rather than a spinner: this takes up to a minute, and a
            spinner at that duration reads as something being stuck. */}
        <div className="mx-auto h-16 w-16 animate-pulse rounded-full bg-signal/25" />
        <p className="mt-5 text-sm font-semibold text-ink">Painting your report</p>
        <p className="mt-1.5 min-h-[2.5rem] text-sm leading-6 text-smoke">
          {WAITING_LINES[line]}
        </p>
        <p className="mt-3 text-xs leading-5 text-ash">
          The rest of your report is ready below — this arrives on its own.
        </p>
      </div>
    </div>
  );
}
