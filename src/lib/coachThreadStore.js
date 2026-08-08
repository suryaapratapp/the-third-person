// Coach conversations, kept per report.
//
// The coach used to live on its own page and its messages lived in React state,
// so the whole conversation vanished the moment you navigated away — you could
// ask three careful questions, go back to re-read the report, and lose all of
// it. Threads are now saved against the report they are about.
//
// Stored on the device rather than on the server, deliberately. The product's
// promise is that a conversation is discarded once its report exists; a coach
// thread quotes and reasons about that conversation, so shipping it to a
// database would quietly reintroduce the thing we told people we deleted. On
// the device it is covered by the same "delete everything" control as the rest
// (see clearAllCoachThreads, called from the privacy wipe).

const PREFIX = 'thirdperson_coach_thread_v1:';

// Long enough that nobody hits it in a real session, short enough that a
// runaway loop cannot fill the origin's storage quota and start throwing on
// every write.
const MAX_MESSAGES = 200;

function keyFor(chainId) {
  return `${PREFIX}${chainId}`;
}

export function loadCoachThread(chainId) {
  if (!chainId || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(keyFor(chainId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupt or unavailable storage must not take the dialog down with it.
    return [];
  }
}

export function saveCoachThread(chainId, messages) {
  if (!chainId || typeof window === 'undefined') return;
  try {
    const trimmed = messages.slice(-MAX_MESSAGES);
    window.localStorage.setItem(keyFor(chainId), JSON.stringify(trimmed));
  } catch {
    /* private mode, or quota — the thread simply stays in memory */
  }
}

export function clearCoachThread(chainId) {
  if (!chainId || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(keyFor(chainId));
  } catch {
    /* nothing to do */
  }
}

// Called by the privacy wipe. Every thread, not just the current report's —
// "delete everything" has to mean everything, and the keys are namespaced
// precisely so this can find them without knowing any report ids.
export function clearAllCoachThreads() {
  if (typeof window === 'undefined') return 0;
  try {
    const keys = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith(PREFIX)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
    return keys.length;
  } catch {
    return 0;
  }
}
