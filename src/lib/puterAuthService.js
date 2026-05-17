const PUTER_SCRIPT_URL = 'https://js.puter.com/v2/';
const SCRIPT_TIMEOUT_MS = 8000;
const AUTH_TIMEOUT_MS = 25000;

let puterLoadPromise = null;

function isDev() {
  return Boolean(import.meta?.env?.DEV);
}

function debug(message, detail = {}) {
  if (!isDev()) return;
  console.debug(`[ThirdPerson free analysis] ${message}`, detail);
}

function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function isPuterReady() {
  return typeof window !== 'undefined' && Boolean(window.puter?.ai?.chat);
}

function waitForPuter(timeoutMs = SCRIPT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (isPuterReady()) {
        resolve(window.puter);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error('Secure analysis could not become ready in time.'));
        return;
      }
      window.setTimeout(tick, 80);
    };
    tick();
  });
}

export async function ensurePuterReady() {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'Secure analysis is not available in this environment.' };
  }
  if (isPuterReady()) return { ok: true, puter: window.puter };

  try {
    if (!puterLoadPromise) {
      puterLoadPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${PUTER_SCRIPT_URL}"]`);
        if (existing) {
          waitForPuter().then(resolve).catch(reject);
          existing.addEventListener('load', () => waitForPuter().then(resolve).catch(reject), { once: true });
          existing.addEventListener('error', () => reject(new Error('Secure analysis could not load.')), { once: true });
          return;
        }

        const script = document.createElement('script');
        script.src = PUTER_SCRIPT_URL;
        script.async = true;
        script.onload = () => waitForPuter().then(resolve).catch(reject);
        script.onerror = () => reject(new Error('Secure analysis could not load.'));
        document.head.appendChild(script);
      });
    }

    const puter = await withTimeout(puterLoadPromise, SCRIPT_TIMEOUT_MS + 1500, 'Secure analysis took too long to load.');
    if (!puter?.ai?.chat) return { ok: false, error: 'Secure analysis is not ready yet.' };
    debug('script ready');
    return { ok: true, puter };
  } catch (error) {
    return { ok: false, error: error.message || 'Secure analysis could not load.' };
  }
}

async function isSignedIn(puter) {
  try {
    if (typeof puter?.auth?.isSignedIn === 'function') return Boolean(await puter.auth.isSignedIn());
    if (typeof puter?.auth?.getUser === 'function') return Boolean(await puter.auth.getUser());
  } catch {
    return false;
  }
  return null;
}

export async function ensurePuterSignedInFromUserGesture() {
  const ready = await ensurePuterReady();
  if (!ready.ok) return ready;
  const { puter } = ready;

  try {
    const signedIn = await isSignedIn(puter);
    if (signedIn === true) return { ok: true, puter };

    if (typeof puter?.auth?.signIn === 'function') {
      debug('calling sign-in from user gesture');
      await withTimeout(Promise.resolve(puter.auth.signIn()), AUTH_TIMEOUT_MS, 'Secure analysis sign-in took too long.');
      return { ok: true, puter };
    }

    debug('auth helper unavailable, triggering tiny analysis call from user gesture');
    await withTimeout(
      Promise.resolve(puter.ai.chat('Return OK.', { model: 'openai/gpt-4o-mini', max_tokens: 16 })),
      AUTH_TIMEOUT_MS,
      'Secure analysis sign-in took too long.',
    );
    return { ok: true, puter };
  } catch (error) {
    return {
      ok: false,
      code: 'SIGN_IN_BLOCKED',
      error: error.message || 'Secure analysis sign-in could not open.',
    };
  }
}

