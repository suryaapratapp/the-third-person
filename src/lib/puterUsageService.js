const PUTER_SCRIPT_ID = 'thirdperson-puter-script';
const PUTER_SRC = 'https://js.puter.com/v2/';

function loadPuterScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Usage check is available in the browser.'));
  if (window.puter?.ai) return Promise.resolve(window.puter);
  const existing = document.getElementById(PUTER_SCRIPT_ID);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(window.puter), { once: true });
      existing.addEventListener('error', () => reject(new Error('Usage check unavailable.')), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => reject(new Error('Usage check took too long.')), 7000);
    script.id = PUTER_SCRIPT_ID;
    script.src = PUTER_SRC;
    script.async = true;
    script.onload = () => {
      window.clearTimeout(timeout);
      resolve(window.puter);
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error('Usage check unavailable.'));
    };
    document.head.appendChild(script);
  });
}

export function calculateUsageStatus(usage) {
  if (!usage || typeof usage !== 'object') {
    return { available: true, used: 0, limit: 0, remaining: 0, percentageUsed: 0, status: 'unknown' };
  }
  const used = Number(usage.used ?? usage.usage ?? usage.monthly_used ?? usage.requests_used ?? 0) || 0;
  const limit = Number(usage.limit ?? usage.monthly_limit ?? usage.requests_limit ?? usage.quota ?? 0) || 0;
  const remaining = Number(usage.remaining ?? usage.requests_remaining ?? Math.max(0, limit - used)) || 0;
  const percentageUsed = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const exhausted = limit > 0 && (remaining <= 0 || percentageUsed >= 100);
  const status = exhausted
    ? 'exhausted'
    : percentageUsed >= 90
      ? 'critical'
      : percentageUsed >= 70
        ? 'warning'
        : limit > 0
          ? 'safe'
          : 'unknown';
  return {
    available: status !== 'exhausted',
    used,
    limit,
    remaining,
    percentageUsed,
    status,
  };
}

export async function getPuterMonthlyUsage() {
  try {
    const puter = await loadPuterScript();
    const getter = puter?.ai?.getMonthlyUsage || puter?.ai?.usage || puter?.getMonthlyUsage;
    if (typeof getter !== 'function') return calculateUsageStatus(null);
    const usage = await getter.call(puter.ai);
    return calculateUsageStatus(usage);
  } catch {
    return calculateUsageStatus(null);
  }
}
