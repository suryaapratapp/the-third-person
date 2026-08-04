import { isSupabaseConfigured, supabase } from './supabaseClient.js';

// Frontend error visibility.
//
// Nothing previously caught a broken render — the user saw a blank page and we
// never found out. This reports the error (never any conversation content) so
// failures are visible, and it fails silently: a logger that throws would make
// a bad situation worse.

const MAX_REPORTS_PER_SESSION = 5;
let reported = 0;
const seen = new Set();

function scrubMessage(value) {
  return String(value || 'Unknown error')
    // Never let a token or email ride along in an error string.
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
    .replace(/(eyJ[\w-]{10,})/g, '[token]')
    .slice(0, 500);
}

export async function reportClientError(error, { kind = 'render', extra = '' } = {}) {
  try {
    if (reported >= MAX_REPORTS_PER_SESSION) return;
    const message = scrubMessage(error?.message || error);
    const key = `${kind}:${message}`;
    // One report per unique error per session — a render loop must not spam.
    if (seen.has(key)) return;
    seen.add(key);
    reported += 1;

    if (typeof console !== 'undefined') console.error('[ThirdPerson]', kind, message);
    if (!isSupabaseConfigured || !supabase) return;

    const { data } = await supabase.auth.getUser().catch(() => ({ data: null }));
    await supabase.from('client_errors').insert({
      user_id: data?.user?.id || null,
      kind,
      message: extra ? `${message} | ${scrubMessage(extra)}` : message,
      stack: String(error?.stack || '').slice(0, 2000) || null,
      route: typeof window !== 'undefined' ? window.location.pathname : null,
      user_agent: typeof navigator !== 'undefined' ? String(navigator.userAgent).slice(0, 250) : null,
    });
  } catch {
    // Reporting must never throw.
  }
}

// Catches errors outside React's tree (async handlers, promises).
export function installGlobalErrorHandlers() {
  if (typeof window === 'undefined' || window.__tpErrorHandlersInstalled) return;
  window.__tpErrorHandlersInstalled = true;
  window.addEventListener('error', (event) => {
    reportClientError(event.error || event.message, { kind: 'window' });
  });
  window.addEventListener('unhandledrejection', (event) => {
    reportClientError(event.reason, { kind: 'promise' });
  });
}
