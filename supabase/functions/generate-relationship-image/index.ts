import { buildCorsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createAdminClient, getAuthenticatedUser } from '../_shared/usage.ts';

// The report's image, made by a second model from the report's CONCLUSIONS.
//
// THE BOUNDARY THAT MAKES THIS SAFE: this function never receives, and must
// never be given, conversation text. Its inputs are things the first model
// already wrote — the vibe label, the emotional arc, key-moment titles, top
// words, tone split — plus counted metrics. The transcript is discarded once
// the report exists, and no part of it reaches an image endpoint. `buildPrompt`
// below is the only place a prompt is assembled, so that boundary is
// enforceable by reading one function.
//
// It runs as its own request rather than inside report generation because
// image models take 10-40s on top of a report that already runs close to the
// 150s edge ceiling. Bundling them would push long chats over the limit and
// cost someone their entire report for the sake of a picture.

const IMAGE_MODEL = Deno.env.get('OPENAI_IMAGE_MODEL') || 'gpt-image-1';
const IMAGE_SIZE = Deno.env.get('OPENAI_IMAGE_SIZE') || '1024x1024';

// Anything that could carry a quote or a name is excluded by construction.
// Key-moment TITLES are allowed (they are our own 5-8 word summaries); their
// quotes and descriptions are not.
function buildPrompt(input: Record<string, any>) {
  const vibe = String(input.vibeLabel || '').slice(0, 120);
  const tone = String(input.emotionalTone || '').slice(0, 120);
  const arc = String(input.timelineArc || '').slice(0, 240);
  const relationship = String(input.relationshipType || 'relationship').slice(0, 40);
  const moments = (input.keyMomentTitles || []).slice(0, 6)
    .map((title: string) => String(title).slice(0, 60));
  const words = (input.topWords || []).slice(0, 8)
    .map((word: string) => String(word).slice(0, 24));
  const warmth = Number(input.positivity);
  const rhythm = String(input.rhythmShape || '').slice(0, 24);

  const mood = Number.isFinite(warmth)
    ? warmth > 60 ? 'warm, bright, close' : warmth < 35 ? 'cool, distant, muted' : 'mixed, uncertain'
    : 'balanced';

  return [
    'Create a single abstract, symbolic artwork that represents the emotional shape of a relationship.',
    'Style: painterly abstract expressionism. Flowing forms, layered colour, a sense of two presences and the space between them.',
    'STRICT RULES: no text, no letters, no numbers, no words anywhere in the image. No recognisable human faces. No logos. Not a chart, diagram, infographic or UI mockup.',
    `Relationship type: ${relationship}.`,
    `Overall feeling: ${mood}.`,
    vibe && `The dynamic in a phrase: ${vibe}.`,
    tone && `Emotional tone: ${tone}.`,
    arc && `How it changed over time: ${arc}.`,
    rhythm && `Its rhythm is ${rhythm.toLowerCase()} — let the composition echo that, steady or turbulent.`,
    moments.length && `Moments that shaped it, as mood only: ${moments.join('; ')}.`,
    words.length && `Recurring themes: ${words.join(', ')}.`,
    'Composition: two distinct colour presences interacting across the canvas. Their closeness, balance and blending should express the relationship described above.',
  ].filter(Boolean).join('\n');
}

async function generateImage(apiKey: string, prompt: string) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: IMAGE_MODEL, prompt, size: IMAGE_SIZE, n: 1 }),
  });
  if (!response.ok) {
    throw new Error(`Image API ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  const data = await response.json();
  const first = data?.data?.[0];
  // gpt-image-1 returns base64; DALL·E 3 returns a short-lived URL. Support
  // both so the model can be swapped with an env var and nothing else.
  if (first?.b64_json) return Uint8Array.from(atob(first.b64_json), (c) => c.charCodeAt(0));
  if (first?.url) {
    const file = await fetch(first.url);
    if (!file.ok) throw new Error(`Image download failed: ${file.status}`);
    return new Uint8Array(await file.arrayBuffer());
  }
  throw new Error('Image API returned neither b64_json nor url');
}

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405, cors);

  let admin: ReturnType<typeof createAdminClient> | null = null;
  let reportId = '';

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: 'Please sign in to continue.' }, 401, cors);

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return jsonResponse({ error: 'Image generation is not configured.' }, 503, cors);

    const body = await req.json();
    reportId = String(body.reportId || '');
    if (!reportId) return jsonResponse({ error: 'Missing reportId.' }, 400, cors);

    admin = createAdminClient();

    // Ownership check before anything else — reportId comes from the client.
    const { data: report, error: loadError } = await admin
      .from('relationship_reports')
      .select('id, user_id, image_status, image_url')
      .eq('id', reportId)
      .maybeSingle();

    if (loadError || !report) return jsonResponse({ error: 'Report not found.' }, 404, cors);
    if (report.user_id !== user.id) return jsonResponse({ error: 'Report not found.' }, 404, cors);

    // Idempotent: a client that retries, or two tabs open on the same report,
    // must not pay for two images.
    if (report.image_status === 'ready' && report.image_url) {
      return jsonResponse({ status: 'ready', imageUrl: report.image_url }, 200, cors);
    }
    if (report.image_status === 'generating') {
      return jsonResponse({ status: 'generating' }, 202, cors);
    }

    await admin.from('relationship_reports')
      .update({ image_status: 'generating', image_updated_at: new Date().toISOString() })
      .eq('id', reportId);

    const prompt = buildPrompt(body.imageContext || {});
    const bytes = await generateImage(apiKey, prompt);

    const path = `${user.id}/${reportId}.png`;
    const { error: uploadError } = await admin.storage
      .from('report-images')
      .upload(path, bytes, { contentType: 'image/png', upsert: true });
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: published } = admin.storage.from('report-images').getPublicUrl(path);
    const imageUrl = published?.publicUrl;
    if (!imageUrl) throw new Error('Could not resolve public URL');

    await admin.from('relationship_reports').update({
      image_url: imageUrl,
      image_status: 'ready',
      image_prompt: prompt,
      image_updated_at: new Date().toISOString(),
    }).eq('id', reportId);

    return jsonResponse({ status: 'ready', imageUrl }, 200, cors);
  } catch (error) {
    console.error('REPORT_IMAGE_FAILED', String(error).slice(0, 300));
    // Mark failed rather than leaving it 'generating' forever, or the client
    // polls a spinner that will never resolve.
    if (admin && reportId) {
      await admin.from('relationship_reports')
        .update({ image_status: 'failed', image_updated_at: new Date().toISOString() })
        .eq('id', reportId)
        .then(() => {}, () => {});
    }
    return jsonResponse({ status: 'failed', error: 'The image could not be generated.' }, 200, cors);
  }
});
