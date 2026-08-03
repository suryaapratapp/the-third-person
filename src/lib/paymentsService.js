import { isSupabaseConfigured, supabase } from './supabaseClient.js';

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

// Loads the Razorpay Checkout SDK once and resolves with the global constructor.
export function loadRazorpayCheckout() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Checkout is only available in the browser.'));
      return;
    }
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Razorpay));
      existing.addEventListener('error', () => reject(new Error('Could not load the payment SDK.')));
      return;
    }
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
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

export function createRazorpayOrder({ reportCount }) {
  return invokeFunction('create-razorpay-order', { reportCount }, 'Could not start checkout.');
}

export function verifyRazorpayPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  return invokeFunction(
    'verify-razorpay-payment',
    { razorpay_order_id, razorpay_payment_id, razorpay_signature },
    'Payment verification failed.',
  );
}
