import { buildCorsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, getAuthenticatedUser } from '../_shared/usage.ts';

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Constant-time comparison so signature checks don't leak via timing.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

Deno.serve(async (req: Request) => {
  const cors = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405, cors);

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: 'Please sign in to continue.' }, 401, cors);

    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keySecret) {
      return jsonResponse({ code: 'PAYMENTS_NOT_CONFIGURED', error: 'Payments are not configured yet.' }, 503, cors);
    }

    const body = await req.json().catch(() => ({}));
    const orderId = String(body.razorpay_order_id || '');
    const paymentId = String(body.razorpay_payment_id || '');
    const signature = String(body.razorpay_signature || '');
    if (!orderId || !paymentId || !signature) {
      return jsonResponse({ error: 'Missing payment confirmation details.' }, 400, cors);
    }

    // A valid signature can only be produced by Razorpay (it is HMAC of
    // "order_id|payment_id" with the key secret), so this proves the payment
    // genuinely succeeded for this order.
    const expected = await hmacSha256Hex(keySecret, `${orderId}|${paymentId}`);
    if (!timingSafeEqual(expected, signature)) {
      return jsonResponse({ error: 'Payment could not be verified.' }, 400, cors);
    }

    const admin = createAdminClient();
    // Defense in depth: the order must exist and belong to the caller. Credit
    // amounts come from the stored order, never from the client.
    const { data: orderRow } = await admin
      .from('payment_orders')
      .select('user_id')
      .eq('provider_order_id', orderId)
      .maybeSingle();
    if (!orderRow || orderRow.user_id !== user.id) {
      return jsonResponse({ error: 'This order was not found for your account.' }, 404, cors);
    }

    const { data, error } = await admin.rpc('settle_razorpay_order', {
      p_order_id: orderId,
      p_payment_id: paymentId,
    });
    if (error || !data?.ok) {
      return jsonResponse({ error: 'Payment verified, but credits could not be added. Please contact support.' }, 500, cors);
    }

    return jsonResponse(
      {
        success: true,
        alreadySettled: Boolean(data.alreadySettled),
        paidRelationshipReportsLeft: data.paidRelationshipReportsLeft,
        paidBestieChatsLeft: data.paidBestieChatsLeft,
      },
      200,
      cors,
    );
  } catch (_error) {
    return jsonResponse({ error: 'Payment verification failed. Please try again.' }, 500, cors);
  }
});
