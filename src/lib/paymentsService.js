import { isSupabaseConfigured, supabase } from './supabaseClient.js';

// Cashfree checkout, from the browser's side.
//
// The shape differs from the Razorpay flow this replaces in one way that
// matters. Razorpay handed a signature to the success handler and we verified
// it; Cashfree hands back nothing worth trusting, so the payment is confirmed
// by asking our own edge function, which asks Cashfree. That means the ONLY
// thing this file needs to survive is the order id — which is also why a
// payment that leaves the page entirely (UPI, netbanking) can still be picked
// up later from a URL parameter. See resumeCashfreeOrder below.

const CASHFREE_SDK = 'https://sdk.cashfree.com/js/v3/cashfree.js';

// Loads the Cashfree Checkout SDK once and resolves with the global factory.
export function loadCashfreeCheckout() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Checkout is only available in the browser.'));
      return;
    }
    if (window.Cashfree) {
      resolve(window.Cashfree);
      return;
    }
    const existing = document.querySelector(`script[src="${CASHFREE_SDK}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Cashfree));
      existing.addEventListener('error', () => reject(new Error('Could not load the payment SDK.')));
      return;
    }
    const script = document.createElement('script');
    script.src = CASHFREE_SDK;
    script.async = true;
    script.onload = () => resolve(window.Cashfree);
    script.onerror = () => reject(new Error('Could not load the payment SDK.'));
    document.body.appendChild(script);
  });
}

async function invokeFunction(name, payload, fallbackMessage) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Please configure Supabase before using payments.');
  }
  const { data, error } = await supabase.functions.invoke(name, { body: payload });
  if (error) {
    let details = null;
    try {
      if (error.context && typeof error.context.json === 'function') {
        details = await error.context.clone().json();
      }
    } catch {
      details = null;
    }
    const normalized = new Error(details?.error || error.message || fallbackMessage);
    normalized.code = details?.code || 'PAYMENT_ERROR';
    throw normalized;
  }
  return data;
}

export function createCashfreeOrder({ reportCount, packId = 'clarity', returnPath = '/pricing' }) {
  return invokeFunction('create-cashfree-order', { reportCount, packId, returnPath }, 'Could not start checkout.');
}

export function verifyCashfreePayment(orderId) {
  return invokeFunction('verify-cashfree-payment', { orderId }, 'Payment verification failed.');
}

// The SDK is a factory, not a constructor, and some builds return a promise
// from it. Normalising here keeps the difference out of the checkout flow.
async function cashfreeInstance(mode) {
  const factory = await loadCashfreeCheckout();
  if (typeof factory !== 'function') throw new Error('Could not load the payment SDK.');
  const instance = factory({ mode: mode === 'production' ? 'production' : 'sandbox' });
  return instance && typeof instance.then === 'function' ? await instance : instance;
}

// Remembered across a redirect. UPI and netbanking take the browser away from
// the page entirely, and on the way back the URL carries the order id but this
// module has been reloaded from scratch — so the id is also parked in session
// storage as a belt-and-braces second copy.
const PENDING_KEY = 'thirdperson.cashfree.pendingOrder';

function rememberPendingOrder(orderId) {
  try {
    window.sessionStorage.setItem(PENDING_KEY, orderId);
  } catch {
    /* private browsing — the URL parameter still carries it */
  }
}

function forgetPendingOrder() {
  try {
    window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* nothing to clean up */
  }
}

export function pendingCashfreeOrder() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('cf_order');
    if (fromUrl) return fromUrl;
    return window.sessionStorage.getItem(PENDING_KEY) || '';
  } catch {
    return '';
  }
}

// Confirms an order that completed away from this page, after a redirect back.
// Returns null when there is nothing pending, so callers can fire it on mount
// unconditionally.
export async function resumeCashfreeOrder() {
  const orderId = pendingCashfreeOrder();
  if (!orderId) return null;
  try {
    const result = await verifyCashfreePayment(orderId);
    // Only stop tracking it once we have a definite answer. A network blip
    // should not lose the reference to a payment someone actually made.
    if (result?.success) forgetPendingOrder();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Opens Cashfree and resolves once the payment is verified server-side.
// Shared by the Pricing page and the mid-analysis top-up so both flows behave
// identically (same verification, same failure handling).
export async function runCheckout({ reportCount = 1, packId = 'clarity', returnPath = '/pricing' } = {}) {
  const order = await createCashfreeOrder({ reportCount, packId, returnPath });
  if (!order?.paymentSessionId || !order?.orderId) {
    throw new Error('Could not start checkout. Please try again.');
  }

  rememberPendingOrder(order.orderId);
  const cashfree = await cashfreeInstance(order.mode);

  const result = await cashfree.checkout({
    paymentSessionId: order.paymentSessionId,
    redirectTarget: '_modal',
  });

  // A redirect-based method took over; the page is on its way out and
  // resumeCashfreeOrder will finish the job when it comes back.
  if (result?.redirect) {
    throw Object.assign(new Error('Completing your payment…'), { redirecting: true });
  }
  if (result?.error) {
    // Cashfree reports a closed modal as an error like any other. Treating that
    // as a failure would show "payment failed" to someone who simply changed
    // their mind, so it is mapped to the cancellation the callers already know.
    const message = result.error.message || 'Payment failed. Please try again.';
    if (/cancel|closed|dismiss/i.test(message)) {
      throw Object.assign(new Error('Payment cancelled.'), { cancelled: true });
    }
    throw new Error(message);
  }

  // The modal closed on a completed payment. The gateway's word for it is not
  // enough — confirm with our own server before granting anything.
  const verified = await verifyCashfreePayment(order.orderId);
  if (!verified?.success) {
    throw new Error(verified?.error || 'Payment could not be verified.');
  }
  forgetPendingOrder();
  return verified;
}
