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

export function createRazorpayOrder({ reportCount, packId = 'clarity' }) {
  return invokeFunction('create-razorpay-order', { reportCount, packId }, 'Could not start checkout.');
}

// Opens Razorpay and resolves once the payment is verified server-side.
// Shared by the Pricing page and the mid-analysis top-up so both flows behave
// identically (same verification, same failure handling).
export async function runRazorpayCheckout({ reportCount = 1, packId = 'clarity', user, description }) {
  const RazorpayCtor = await loadRazorpayCheckout();
  const order = await createRazorpayOrder({ reportCount, packId });
  if (!order?.orderId || !order?.keyId) throw new Error('Could not start checkout. Please try again.');

  return new Promise((resolve, reject) => {
    const checkout = new RazorpayCtor({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency || 'INR',
      name: 'ThirdPerson AI',
      description: description || `${order.reportCount} Relationship Report${order.reportCount > 1 ? 's' : ''}${order.bestieCount ? ` + ${order.bestieCount} Coach Chats` : ''}`,
      prefill: { email: user?.email || '' },
      theme: { color: '#a78bfa' },
      handler: async (response) => {
        try {
          const result = await verifyRazorpayPayment(response);
          if (!result?.success) throw new Error('Payment could not be verified.');
          resolve(result);
        } catch (error) {
          reject(error);
        }
      },
      modal: { ondismiss: () => reject(Object.assign(new Error('Payment cancelled.'), { cancelled: true })) },
    });
    checkout.on('payment.failed', (resp) => {
      reject(new Error(resp?.error?.description || 'Payment failed. Please try again.'));
    });
    checkout.open();
  });
}

export function verifyRazorpayPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  return invokeFunction(
    'verify-razorpay-payment',
    { razorpay_order_id, razorpay_payment_id, razorpay_signature },
    'Payment verification failed.',
  );
}
