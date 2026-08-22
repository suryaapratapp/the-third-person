// Cashfree PG, in one place.
//
// The three payment functions all need the same four things — which host to
// call, which API version to pin, the auth headers, and the packs — and having
// them agree by copy-paste is how a gateway migration goes wrong six months
// later when only two of the three get updated.

// Sandbox is the DEFAULT ON PURPOSE. An unset or mistyped CASHFREE_MODE takes
// real money on a test order if production is the fallback; this way the worst
// case is a payment that does not settle, which is noisy and recoverable.
export function cashfreeMode(): 'sandbox' | 'production' {
  return Deno.env.get('CASHFREE_MODE') === 'production' ? 'production' : 'sandbox';
}

export function cashfreeBaseUrl(): string {
  return cashfreeMode() === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
}

// Pinned, not floating. Cashfree versions its API by date and changes response
// shapes between versions, so an unpinned call is a payment integration that
// breaks on someone else's release schedule.
export const CASHFREE_API_VERSION = '2023-08-01';

export interface CashfreeCredentials {
  appId: string;
  secretKey: string;
}

export function cashfreeCredentials(): CashfreeCredentials | null {
  const appId = Deno.env.get('CASHFREE_APP_ID');
  const secretKey = Deno.env.get('CASHFREE_SECRET_KEY');
  if (!appId || !secretKey) return null;
  return { appId, secretKey };
}

export function cashfreeHeaders({ appId, secretKey }: CashfreeCredentials) {
  return {
    'x-client-id': appId,
    'x-client-secret': secretKey,
    'x-api-version': CASHFREE_API_VERSION,
    'Content-Type': 'application/json',
  };
}

// Pricing is defined SERVER-SIDE so the client can never dictate the amount or
// the number of credits granted. Keep in sync with the PricingPage display.
//
//  clarity      — 1 Relationship Report + 5 Coach Chats, INR 249
//  report_only  — 1 Relationship Report, INR 199 (bought mid-flow when someone
//                 hits Start Analysis with no credits and just wants the report)
export const PACKS = {
  clarity: { pricePerUnitInr: 249, chatsPerUnit: 5 },
  report_only: { pricePerUnitInr: 199, chatsPerUnit: 0 },
} as const;

export const MAX_REPORTS = 50;

// Cashfree accepts order ids of up to 50 chars, alphanumeric plus _ and -.
// Ours embeds a slice of the user id so an order is traceable to an account
// from the Cashfree dashboard alone, without a lookup.
export function buildOrderId(userId: string): string {
  const stamp = Date.now().toString(36);
  const noise = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  return `tp_${userId.replace(/-/g, '').slice(0, 8)}_${stamp}_${noise}`;
}

// Cashfree REQUIRES a customer phone and validates its shape. Most of our
// profiles have none, so a documented placeholder is used rather than failing
// the checkout — the phone plays no part in settlement, which is keyed on the
// order id we generated.
const PHONE_PLACEHOLDER = '9999999999';

export function normalisePhone(value: unknown): string {
  const digits = String(value || '').replace(/\D/g, '');
  // Indian numbers arrive with and without the 91 country code.
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return /^[6-9]\d{9}$/.test(local) ? local : PHONE_PLACEHOLDER;
}

// Base64 HMAC-SHA256 — Cashfree's webhook signature encoding. (Razorpay used
// hex for the same primitive, which is exactly the kind of detail that makes a
// copied verifier silently reject every event.)
export async function hmacSha256Base64(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// Constant-time comparison so signature checks don't leak via timing.
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
