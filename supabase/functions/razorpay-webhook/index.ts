import { createAdminClient } from '../_shared/usage.ts';

// Razorpay webhook receiver. Deployed with verify_jwt disabled because the
// caller is Razorpay's servers, not a signed-in user — authentication is the
// X-Razorpay-Signature header: HMAC-SHA256 of the RAW request body using the
// webhook secret configured in the Razorpay dashboard.
//
// This is a settlement backstop for the checkout handler: if a user pays but
// closes the tab before verify-razorpay-payment runs, the webhook still grants
// the credits. settle_razorpay_order is idempotent, so both paths firing for
// the same payment can never double-grant.

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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    if (!webhookSecret) return json({ error: 'Webhook is not configured yet.' }, 503);

    const signature = req.headers.get('x-razorpay-signature') || '';
    const eventId = req.headers.get('x-razorpay-event-id') || '';
    const rawBody = await req.text();
    if (!signature || !rawBody) return json({ error: 'Missing signature or body.' }, 400);

    const expected = await hmacSha256Hex(webhookSecret, rawBody);
    if (!timingSafeEqual(expected, signature)) return json({ error: 'Invalid signature.' }, 400);

    let event: Record<string, any>;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return json({ error: 'Invalid payload.' }, 400);
    }

    // Both events carry the payment entity; settle handles either. Any other
    // event type is acknowledged and ignored so Razorpay does not retry it.
    const relevant = event.event === 'payment.captured' || event.event === 'order.paid';
    if (!relevant) return json({ received: true, ignored: true });

    const payment = event.payload?.payment?.entity || {};
    const orderId = String(payment.order_id || '');
    const paymentId = String(payment.id || '');
    if (!orderId || !paymentId) return json({ received: true, ignored: true });

    const admin = createAdminClient();
    const { data, error } = await admin.rpc('settle_razorpay_order', {
      p_order_id: orderId,
      p_payment_id: paymentId,
    });

    // Record webhook receipt for audit; unique(provider, provider_event_id)
    // plus ignoreDuplicates makes redelivered events no-ops.
    if (eventId) {
      const { data: orderRow } = await admin
        .from('payment_orders')
        .select('user_id')
        .eq('provider_order_id', orderId)
        .maybeSingle();
      await admin.from('payment_events').upsert(
        {
          user_id: orderRow?.user_id || null,
          provider: 'razorpay_webhook',
          provider_event_id: eventId,
          event_type: event.event,
          payload: {
            orderId,
            paymentId,
            settled: Boolean(data?.ok && !error),
            alreadySettled: Boolean(data?.alreadySettled),
            reason: data?.reason || null,
          },
          processed_at: new Date().toISOString(),
        },
        { onConflict: 'provider,provider_event_id', ignoreDuplicates: true },
      );
    }

    // An unknown order is not retryable — acknowledge so Razorpay stops
    // redelivering (it may belong to a different environment on the same key).
    if (error || !data?.ok) return json({ received: true, settled: false, reason: data?.reason || 'settle_failed' });

    return json({ received: true, settled: true, alreadySettled: Boolean(data.alreadySettled) });
  } catch (_error) {
    return json({ error: 'Webhook processing failed.' }, 500);
  }
});
