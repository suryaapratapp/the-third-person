const DEFAULT_ALLOWED_ORIGINS = [
  'https://thethirdperson.ai',
  'https://www.thethirdperson.ai',
];

const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
];

function configuredOrigins(): string[] {
  const raw = Deno.env.get('ALLOWED_ORIGINS');
  if (!raw) return DEFAULT_ALLOWED_ORIGINS;
  return raw.split(',').map((origin) => origin.trim()).filter(Boolean);
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (configuredOrigins().includes(origin)) return true;
  if (DEV_ORIGINS.includes(origin)) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol === 'https:' && hostname.endsWith('.vercel.app')) return true;
  } catch {
    return false;
  }
  return false;
}

// Set ALLOWED_ORIGINS (comma-separated) as a Supabase Edge Function secret if
// the production domain ends up different from the defaults above.
export function buildCorsHeaders(req: Request) {
  const origin = req.headers.get('origin');
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : configuredOrigins()[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function jsonResponse(body: unknown, status = 200, cors: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      'Content-Type': 'application/json',
    },
  });
}
