import { createAdminClient } from '../_shared/usage.ts';
import { cashfreeCredentials, hmacSha256Base64, timingSafeEqual } from '../_shared/cashfree.ts';

// Cashfree webhook receiver. Must be deployed with verify_jwt DISABLED: the
// caller is Cashfree's servers, not a signed-in user.
//
// Authentication is the x-webhook-signature header, which is
//   base64( HMAC-SHA256( timestamp + rawBody, secretKey ) )
// Three details differ from the Razorpay verifier this replaces, and each one
// silently rejects every event if copied across unchanged:
//   - the digest is base64, not hex
//   - the timestamp is PREPENDED to the body before signing
//   - the signing key is the ordinary secret key, not a separate webhook secret
//
// This is a settlement backstop for the checkout return: if someone pays and
// closes the tab, or pays by UPI and never lands back on the site, the webhook
// still grants the credits. settle_payment_order is idempotent, so both paths
// firing for the same payment cannot double-grant.

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const credentials = cashfreeCredentials();
    if (!credentials) return json({ error: 'Webhook is not configured yet.' }, 503);

    const signature = req.headers.get('x-webhook-signature') || '';
    const timestamp = req.headers.get('x-webhook-timestamp') || '';
    const rawBody = await req.text();
    if (!signature || !timestamp || !rawBody) return json({ error: 'Missing signature, timestamp or body.' }, 400);

    const expected = await hmacSha256Base64(credentials.secretKey, `${timestamp}${rawBody}`);
    if (!timingSafeEqual(expected, signature)) return json({ error: 'Invalid signature.' }, 400);

    let event: Record<string, any>;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return json({ error: 'Invalid payload.' }, 400);
    }

    const eventType = String(event?.type || '');
    // Only successful payments settle. Failed and dropped notifications are
    // acknowledged so Cashfree stops redelivering them.
    if (eventType !== 'PAYMENT_SUCCESS_WEBHOOK') {
      return json({ received: true, ignored: true, type: eventType });
    }

    const orderId = String(event?.data?.order?.order_id || '');
    const paymentId = String(event?.data?.payment?.cf_payment_id || '');
    const paymentStatus = String(event?.data?.payment?.payment_status || '').toUpperCase();
    if (!orderId || paymentStatus !== 'SUCCESS') {
      return json({ received: true, ignored: true });
    }

    const admin = createAdminClient();
    const { data, error } = await admin.rpc('settle_payment_order', {
      p_order_id: orderId,
      p_payment_id: paymentId || orderId,
      p_provider: 'cashfree',
    });

    // Audit trail. unique(provider, provider_event_id) plus ignoreDuplicates
    // makes a redelivered event a no-op rather than a second row.
    //
    // Note the DISTINCT provider label: settle_payment_order writes its own
    // 'cashfree' row for the same payment id, and reusing the label here would
    // collide with it on the unique key and lose the webhook record.
    const eventId = paymentId || orderId;
    const { data: orderRow } = await admin
      .from('payment_orders')
      .select('user_id')
      .eq('provider_order_id', orderId)
      .maybeSingle();
    await admin.from('payment_events').upsert(
      {
        user_id: orderRow?.user_id || null,
        provider: 'cashfree_webhook',
        provider_event_id: eventId,
        event_type: eventType,
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

    // An unknown order is not retryable — acknowledge so Cashfree stops
    // redelivering it (it may belong to a different environment on the same
    // credentials).
    if (error || !data?.ok) {
      console.warn('CASHFREE_WEBHOOK_UNSETTLED', orderId, error?.message || data?.reason || 'unknown');
      return json({ received: true, settled: false, reason: data?.reason || 'settle_failed' });
    }

    return json({ received: true, settled: true, alreadySettled: Boolean(data.alreadySettled) });
  } catch (error) {
    console.error('CASHFREE_WEBHOOK_ERROR', String(error).slice(0, 300));
    return json({ error: 'Webhook processing failed.' }, 500);
  }
});
