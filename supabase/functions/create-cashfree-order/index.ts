import { buildCorsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, getAuthenticatedUser } from '../_shared/usage.ts';
import {
  buildOrderId,
  cashfreeBaseUrl,
  cashfreeCredentials,
  cashfreeHeaders,
  cashfreeMode,
  MAX_REPORTS,
  normalisePhone,
  PACKS,
} from '../_shared/cashfree.ts';

// Step one of Cashfree checkout: create the order server-side and hand the
// browser a payment_session_id.
//
// The session id is short-lived and single-order, which is why it is safe to
// return. What is NOT returned, and never should be, is the secret key —
// Cashfree has no publishable-key concept the way Razorpay did, so the browser
// gets a session token instead and the credentials stay in the function.
//
// The amount and the credits both come from PACKS here. A client that asks for
// fifty reports gets charged for fifty; a client that claims a price is ignored.

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
    const packId = body.packId === 'report_only' ? 'report_only' : 'clarity';
    const pack = PACKS[packId];
    const reportCount = Math.max(1, Math.min(MAX_REPORTS, Math.floor(Number(body.reportCount) || 0)));
    if (!reportCount) return jsonResponse({ error: 'Choose at least one Relationship Report.' }, 400, cors);
    const bestieCount = reportCount * pack.chatsPerUnit;

    // Two units for one price. Cashfree takes RUPEES as a decimal where
    // Razorpay took paise as an integer, but payment_orders.amount has always
    // stored minor units — so the row keeps paise and only the API call
    // converts. Getting this backwards charges a hundred times too much.
    const amountPaise = reportCount * pack.pricePerUnitInr * 100;
    const orderAmount = amountPaise / 100;

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('first_name, last_name, phone_number, email')
      .eq('id', user.id)
      .maybeSingle();

    const orderId = buildOrderId(user.id);
    const origin = req.headers.get('origin') || 'https://www.thethirdperson.ai';
    // Allowlisted, never echoed. A return path taken straight from the request
    // is an open redirect, and one that lands on a page nobody resumes from is
    // a payment that silently goes nowhere — so only the two pages that know
    // how to pick an order back up are permitted.
    const RETURN_PATHS = ['/pricing', '/analysis/new'];
    const returnPath = RETURN_PATHS.includes(String(body.returnPath || '')) ? body.returnPath : '/pricing';
    const customerName = [profile?.first_name, profile?.last_name]
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .join(' ');

    const orderResponse = await fetch(`${cashfreeBaseUrl()}/orders`, {
      method: 'POST',
      headers: cashfreeHeaders(credentials),
      body: JSON.stringify({
        order_id: orderId,
        order_amount: orderAmount,
        order_currency: 'INR',
        customer_details: {
          customer_id: user.id,
          customer_email: profile?.email || user.email || '',
          customer_phone: normalisePhone(profile?.phone_number),
          customer_name: customerName || 'ThirdPerson user',
        },
        order_meta: {
          // {order_id} is a Cashfree placeholder it substitutes on redirect.
          // UPI and netbanking leave the page, so the app must be able to pick
          // the payment back up from a cold load.
          return_url: `${origin}${returnPath}?cf_order={order_id}`,
        },
        order_note: `${reportCount} Relationship Report${reportCount > 1 ? 's' : ''}`,
      }),
    });

    if (!orderResponse.ok) {
      const detail = await orderResponse.text().catch(() => '');
      console.error('CASHFREE_ORDER_FAILED', orderResponse.status, detail.slice(0, 300));
      return jsonResponse(
        { error: 'Could not start checkout. Please try again.', detail: detail.slice(0, 200) },
        502,
        cors,
      );
    }

    const order = await orderResponse.json();
    if (!order?.payment_session_id) {
      console.error('CASHFREE_ORDER_NO_SESSION', JSON.stringify(order).slice(0, 300));
      return jsonResponse({ error: 'Could not start checkout. Please try again.' }, 502, cors);
    }

    // Recorded BEFORE the user can pay, so settlement always has a row to find
    // and the credit counts come from here rather than from anything the
    // browser or the gateway sends back.
    const { error: insertError } = await admin.from('payment_orders').insert({
      user_id: user.id,
      provider: 'cashfree',
      provider_order_id: orderId,
      report_count: reportCount,
      bestie_count: bestieCount,
      amount: amountPaise,
      currency: 'INR',
      status: 'created',
    });
    if (insertError) {
      console.error('CASHFREE_ORDER_NOT_RECORDED', insertError.message);
      return jsonResponse({ error: 'Could not start checkout. Please try again.' }, 500, cors);
    }

    return jsonResponse(
      {
        orderId,
        paymentSessionId: order.payment_session_id,
        mode: cashfreeMode(),
        amount: amountPaise,
        currency: 'INR',
        packId,
        reportCount,
        bestieCount,
      },
      200,
      cors,
    );
  } catch (error) {
    console.error('CASHFREE_ORDER_ERROR', String(error).slice(0, 300));
    return jsonResponse({ error: 'Could not start checkout right now. Please try again.' }, 500, cors);
  }
});
