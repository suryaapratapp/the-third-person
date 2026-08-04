import { buildCorsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, getAuthenticatedUser } from '../_shared/usage.ts';

// Pricing is defined server-side so the client can never dictate the amount or
// the number of credits granted. Keep in sync with the PricingPage display.
//
// Two packs:
//  clarity      — 1 Relationship Report + 5 Coach Chats, INR 249 (Pricing page)
//  report_only  — 1 Relationship Report, INR 199 (bought mid-flow when someone
//                 hits Start Analysis with no credits and just wants the report)
const PACKS = {
  clarity: { pricePerUnitInr: 249, chatsPerUnit: 5 },
  report_only: { pricePerUnitInr: 199, chatsPerUnit: 0 },
} as const;
const MAX_REPORTS = 50;

Deno.serve(async (req: Request) => {
  const cors = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405, cors);

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: 'Please sign in to continue.' }, 401, cors);

    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) {
      return jsonResponse({ code: 'PAYMENTS_NOT_CONFIGURED', error: 'Payments are not configured yet.' }, 503, cors);
    }

    const body = await req.json().catch(() => ({}));
    const packId = body.packId === 'report_only' ? 'report_only' : 'clarity';
    const pack = PACKS[packId];
    const reportCount = Math.max(1, Math.min(MAX_REPORTS, Math.floor(Number(body.reportCount) || 0)));
    if (!reportCount) return jsonResponse({ error: 'Choose at least one Relationship Report.' }, 400, cors);
    const bestieCount = reportCount * pack.chatsPerUnit;
    const amount = reportCount * pack.pricePerUnitInr * 100; // paise

    const authHeader = `Basic ${btoa(`${keyId}:${keySecret}`)}`;
    const receipt = `tp_${user.id.slice(0, 8)}_${Date.now()}`;
    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt,
        notes: { userId: user.id, packId, reportCount: String(reportCount), bestieCount: String(bestieCount) },
      }),
    });

    if (!orderResponse.ok) {
      const detail = await orderResponse.text().catch(() => '');
      return jsonResponse({ error: 'Could not start checkout. Please try again.', detail: detail.slice(0, 200) }, 502, cors);
    }
    const order = await orderResponse.json();
    if (!order?.id) return jsonResponse({ error: 'Could not start checkout. Please try again.' }, 502, cors);

    const admin = createAdminClient();
    const { error: insertError } = await admin.from('payment_orders').insert({
      user_id: user.id,
      provider: 'razorpay',
      provider_order_id: order.id,
      report_count: reportCount,
      bestie_count: bestieCount,
      amount,
      currency: 'INR',
      status: 'created',
    });
    if (insertError) {
      return jsonResponse({ error: 'Could not start checkout. Please try again.' }, 500, cors);
    }

    // keyId is the public/publishable Razorpay key — safe to return to the browser.
    return jsonResponse(
      { orderId: order.id, amount, currency: 'INR', keyId, packId, reportCount, bestieCount },
      200,
      cors,
    );
  } catch (_error) {
    return jsonResponse({ error: 'Could not start checkout right now. Please try again.' }, 500, cors);
  }
});
