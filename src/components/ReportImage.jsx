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
  // The raw error behind the friendly sentence. Kept behind a disclosure rather
  // than dropped: when someone reports "the picture didn't work", this is the
  // one line that makes the difference between fixing it and guessing at it.
  const [detail, setDetail] = useState('');
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
          setDetail(result.detail || '');
          setStatus('failed');
        }
      })
      .catch((error) => {
        setReason('');
        setDetail(String(error?.message || error || ''));
        setStatus('failed');
      });
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
        setReason('The image is taking longer than expected. It may still finish — reopen this report in a few minutes.');
        setStatus('failed');
        return;
      }
      const state = await fetchReportImageState(reportId);
      if (state?.imageStatus === 'ready' && state.imageUrl) {
        setUrl(state.imageUrl);
        setStatus('ready');
        window.clearInterval(timer);
      } else if (state?.imageStatus === 'failed') {
        // The row records the outcome, not the cause — the reason only exists
        // in the response to the request that failed, which this poll is not.
        setReason('The image model did not complete this one.');
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
    setDetail('');
    setStatus('pending');
  };

  if (status === 'failed') {
    // Shaped like the panel it replaces rather than an alert box dropped into
    // the middle of a column. It keeps the square footprint the image would
    // have had, so the report does not reflow around a failure.
    return (
      <div className="grid aspect-square w-full place-items-center rounded-lg border border-line bg-well p-6">
        <div className="max-w-sm text-center">
          <span
            className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-warn/15 text-xl"
            aria-hidden="true"
          >
            🎨
          </span>
          <p className="mt-4 text-sm font-semibold text-ink">This one stayed unpainted</p>
          <p className="mt-1.5 text-sm leading-6 text-smoke">
            {reason || 'The image service did not respond.'}
          </p>
          <button
            type="button"
            onClick={retry}
            className="btn btn-secondary mt-4 !min-h-[38px] !px-4 !py-1.5 !text-xs"
          >
            Try again
          </button>
          <p className="mt-3 text-xs leading-5 text-ash">
            Retrying is free — the picture is generated separately and costs you
            no credit. Everything else in your report is complete.
          </p>
          {detail && (
            <details className="mt-3 text-left">
              <summary className="cursor-pointer text-xs text-ash hover:text-smoke">
                Technical detail
              </summary>
              <p className="mt-1.5 break-words rounded border border-line bg-paper p-2 font-mono text-[0.68rem] leading-5 text-ash">
                {detail}
              </p>
            </details>
          )}
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
          Painted from the scene your report describes — the setting, the mood,
          the things that kept coming up. The conversation itself is never sent
          to the image model, and no names ever reach it.
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
