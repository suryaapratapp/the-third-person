import { buildCorsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, getAuthenticatedUser } from '../_shared/usage.ts';
import { cashfreeBaseUrl, cashfreeCredentials, cashfreeHeaders } from '../_shared/cashfree.ts';

// Step two: confirm the payment actually happened, then grant the credits.
//
// THIS IS THE BIG DIFFERENCE FROM RAZORPAY, and it is an improvement. Razorpay
// handed the browser a signature and we verified that the browser had not
// forged it. Cashfree hands the browser nothing worth trusting, so this asks
// CASHFREE directly what the order's status is. The client's only input is an
// order id, which is checked against payment_orders for ownership before it is
// used for anything.
//
// A client can therefore lie about only one thing — which of its own orders to
// check — and the answer still comes from the gateway.

Deno.serve(async (req: Request) => {
  const cors = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405, cors);

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: 'Please sign in to continue.' }, 401, cors);

    const credentials = cashfreeCredentials();
    if (!credentials) {
      return jsonResponse({ code: 'PAYMENTS_NOT_CONFIGURED', error: 'Payments are not configured yet.' }, 503, cors);
    }

    const body = await req.json().catch(() => ({}));
    const orderId = String(body.orderId || '').trim();
    if (!orderId) return jsonResponse({ error: 'Missing order reference.' }, 400, cors);

    const admin = createAdminClient();
    // Ownership first, before the order id is sent anywhere. Credit amounts
    // come from this stored row, never from the gateway response.
    const { data: orderRow } = await admin
      .from('payment_orders')
      .select('user_id, status')
      .eq('provider_order_id', orderId)
      .maybeSingle();
    if (!orderRow || orderRow.user_id !== user.id) {
      return jsonResponse({ error: 'This order was not found for your account.' }, 404, cors);
    }

    const orderResponse = await fetch(`${cashfreeBaseUrl()}/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: cashfreeHeaders(credentials),
    });
    if (!orderResponse.ok) {
      const detail = await orderResponse.text().catch(() => '');
      console.error('CASHFREE_VERIFY_FAILED', orderResponse.status, detail.slice(0, 300));
      return jsonResponse({ error: 'Could not confirm the payment. Please try again in a moment.' }, 502, cors);
    }

    const order = await orderResponse.json();
    const status = String(order?.order_status || '').toUpperCase();
    if (status !== 'PAID') {
      // ACTIVE means the order exists but nobody has paid it yet — the usual
      // shape of a closed checkout window. Not an error, just not a purchase.
      return jsonResponse(
        { success: false, status, error: status === 'ACTIVE' ? 'No payment was completed.' : 'This payment did not go through.' },
        200,
        cors,
      );
    }

    // The order says PAID; ask which payment did it, so the ledger records
    // something traceable in the Cashfree dashboard rather than our own id.
    let paymentId = orderId;
    try {
      const paymentsResponse = await fetch(
        `${cashfreeBaseUrl()}/orders/${encodeURIComponent(orderId)}/payments`,
        { method: 'GET', headers: cashfreeHeaders(credentials) },
      );
      if (paymentsResponse.ok) {
        const payments = await paymentsResponse.json();
        const paid = (Array.isArray(payments) ? payments : []).find(
          (payment: Record<string, unknown>) => String(payment?.payment_status || '').toUpperCase() === 'SUCCESS',
        );
        if (paid?.cf_payment_id) paymentId = String(paid.cf_payment_id);
      }
    } catch (_error) {
      // Non-fatal: the order is already confirmed PAID, and settling with our
      // own order id is far better than refusing to grant a paid-for credit.
    }

    const { data, error } = await admin.rpc('settle_payment_order', {
      p_order_id: orderId,
      p_payment_id: paymentId,
      p_provider: 'cashfree',
    });
    if (error || !data?.ok) {
      console.error('CASHFREE_SETTLE_FAILED', error?.message || data?.reason || 'unknown');
      return jsonResponse(
        { error: 'Payment received, but credits could not be added. Please contact support — your payment is safe.' },
        500,
        cors,
      );
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
  } catch (error) {
    console.error('CASHFREE_VERIFY_ERROR', String(error).slice(0, 300));
    return jsonResponse({ error: 'Payment verification failed. Please try again.' }, 500, cors);
  }
});
