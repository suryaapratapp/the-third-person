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

function moodOf(input: Record<string, any>) {
  const warmth = Number(input.positivity);
  if (!Number.isFinite(warmth)) return 'balanced';
  if (warmth > 60) return 'warm, bright, close';
  if (warmth < 35) return 'cool, distant, muted';
  return 'mixed, uncertain';
}

// Belt and braces on the boundary.
//
// The report model is told never to put a name in the visual story, and it
// obeys — but "the prompt contains no names" is too important to rest on a
// model following an instruction. The participant names are passed in for the
// sole purpose of being stripped here, so a slip upstream cannot become a name
// sent to an image endpoint.
function redactNames(text: string, names: string[]) {
  return names.reduce((carry, name) => {
    const clean = String(name || '').trim();
    if (clean.length < 3) return carry;   // initials would match half the words
    const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return carry.replace(new RegExp(escaped, 'gi'), 'someone');
  }, text);
}

// THE SCENE.
//
// The first version of this asked for abstract expressionism and got exactly
// that: two coloured presences, competently painted, that could have belonged
// to any two people who ever texted. Recognisable beats beautiful — what makes
// someone keep this picture is the scooter, the cracked screen, the hour they
// always talk. So the brief is now a SCENE, built from the visual story the
// report model wrote after reading the conversation.
//
// Still no transcript: motifs are the report model's own shorthand for what
// recurs, names are stripped above, and quotes were never in the schema.
function buildScenePrompt(story: Record<string, any>, names: string[]) {
  const line = (value: unknown, max = 200) => String(value || '').slice(0, max).trim();
  const motifs = (story.motifs || [])
    .slice(0, 8)
    .map((motif: any) => `${line(motif?.object, 60)} (${line(motif?.meaning, 80)})`)
    .filter((entry: string) => entry.length > 4);

  const prompt = [
    'A cinematic symbolic illustration telling the story of one relationship — a single painted scene, richly detailed, in the style of a modern narrative book cover.',
    `Setting: ${line(story.setting) || 'a quiet street at night'}.`,
    `Time: ${line(story.timeOfDay, 60) || 'late evening'}. Atmosphere: ${line(story.weather, 60) || 'still air'}.`,
    `The two figures: ${line(story.figures) || 'two people seen from behind, close but not touching'}.`,
    motifs.length
      ? `Woven through the scene as symbolic objects, floating or embedded in the composition: ${motifs.join('; ')}.`
      : '',
    `Palette: ${line(story.palette, 160) || 'deep blues against warm amber'}.`,
    'Composition: the two figures anchor the frame; the objects orbit them like memory, glowing softly against the dark. Depth, warm rim light, bokeh, painterly texture. Beautiful and specific rather than generic.',
    // Faces are the line here. A likeness of a real person is not something an
    // image model can be trusted to avoid inventing, and this picture belongs
    // to a private relationship — silhouettes carry the feeling without it.
    'STRICT RULES: the figures must be silhouettes, shadowed, or seen from behind — no facial features, no recognisable likeness of any real person. No lettering, no words, no captions, no signatures, no logos, no watermark. Not a chart, diagram, infographic, collage or UI mockup.',
  ].filter(Boolean).join('\n');

  return redactNames(prompt, names);
}

// The fallback brief, for reports written before the visual story existed.
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
  const rhythm = String(input.rhythmShape || '').slice(0, 24);

  const mood = moodOf(input);

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

// A CHAIN, not a spare.
//
// Which image models an OpenAI account can reach varies by org verification
// status, project key scopes and whatever has since been retired — and the two
// failures do not look alike: gpt-image-1 on an unverified org returns 403
// "must be verified", while a model the account cannot address at all returns
// 400 "The model 'x' does not exist."
//
// This was a single fallback to dall-e-3, and the logs showed the exact hole
// that leaves: gpt-image-1 403'd, the fallback fired correctly, and dall-e-3
// answered "does not exist" — so a working chain ended one link short of a
// model this account can actually use. Ordered best-first; every link is tried
// before the request is called a failure.
const MODEL_CHAIN = ['gpt-image-1', 'gpt-image-1-mini', 'dall-e-3', 'dall-e-2'];

function modelChain() {
  // The configured model always leads, whether or not it is in the list.
  return [IMAGE_MODEL, ...MODEL_CHAIN].filter((model, index, all) => all.indexOf(model) === index);
}

// "This account cannot use this model" — worth trying the next link.
// Distinct from "this account cannot make images at all", which no amount of
// walking the chain will fix.
function isModelAccessError(status: number, body: string) {
  if (status === 404) return true;
  const text = body.toLowerCase();
  // A content-policy 400 is not a model-access problem, and treating it as one
  // would burn every remaining link on a prompt they will all reject.
  if (text.includes('content_policy') || text.includes('safety system')) return false;
  // OpenAI returns the verification gate as 400 or 403 depending on the
  // endpoint, so status alone cannot be the test.
  if (status !== 400 && status !== 403) return false;
  return text.includes('verif')
    || text.includes('does not exist')          // the one that broke this
    || text.includes('does not have access')
    || text.includes('must be verified')
    || text.includes('missing scopes')
    || text.includes('insufficient permission')
    || text.includes('model_not_found')
    || text.includes('unsupported');
}

async function callImageApi(apiKey: string, model: string, prompt: string) {
  // The DALL·E models reject sizes gpt-image-1 accepts, so the size follows the
  // model. 1024x1024 is the one square every model in the chain supports.
  const size = model.startsWith('gpt-image') ? IMAGE_SIZE : '1024x1024';
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, prompt, size, n: 1 }),
  });
  return { response, body: response.ok ? '' : (await response.text()).slice(0, 400) };
}

function isContentFilterError(status: number, body: string) {
  const text = body.toLowerCase();
  return status === 400 && (
    text.includes('content_policy')
    || text.includes('safety system')
    || text.includes('content policy')
  );
}

// The last resort. DALL·E 3's safety filter rejects prompts far more readily
// than the report's own model does, and a relationship described honestly —
// distance, conflict, the moment it changed — can trip it even though nothing
// about the request is unsafe. Rather than lose the picture entirely, retry
// with the mood and nothing else. A less specific image beats no image.
function neutralPrompt(mood: string) {
  return [
    'Create a single abstract painterly artwork: two flowing colour presences interacting across a canvas.',
    `Overall feeling: ${mood}.`,
    'Style: abstract expressionism, layered colour, soft edges, a sense of space between two forms.',
    'STRICT RULES: no text, no letters, no numbers, no faces, no logos, no charts or diagrams.',
  ].join('\n');
}

async function generateImage(apiKey: string, prompt: string, mood: string) {
  const chain = modelChain();
  let response: Response | null = null;
  let body = '';
  let usedModel = chain[0];
  // The FIRST failure is the one worth reporting. When every link is
  // unreachable, "verify your organisation for gpt-image-1" is actionable in a
  // way that "dall-e-2 does not exist either" is not.
  let firstFailure = '';

  for (const model of chain) {
    usedModel = model;
    ({ response, body } = await callImageApi(apiKey, model, prompt));

    if (!response.ok && isContentFilterError(response.status, body)) {
      console.warn(`IMAGE_PROMPT_REJECTED model=${model} body=${body} — retrying with a neutral prompt`);
      ({ response, body } = await callImageApi(apiKey, model, neutralPrompt(mood)));
    }

    if (response.ok) break;
    if (!firstFailure) firstFailure = `${response.status} (${model}): ${body}`;
    if (!isModelAccessError(response.status, body)) break;
    console.warn(`IMAGE_MODEL_UNAVAILABLE model=${model} status=${response.status} body=${body}`);
  }

  if (!response || !response.ok) {
    throw new Error(`Image API ${firstFailure || 'failed'}`);
  }
  console.log(`IMAGE_MODEL_USED ${usedModel}`);
  const data = await response.json();
  const first = data?.data?.[0];
  // gpt-image-1 returns base64; DALL·E 3 returns a short-lived URL. Support
  // both so the model can be swapped with an env var and nothing else.
  if (first?.b64_json) {
    return { bytes: Uint8Array.from(atob(first.b64_json), (c) => c.charCodeAt(0)), usedModel };
  }
  if (first?.url) {
    const file = await fetch(first.url);
    if (!file.ok) throw new Error(`Image download failed: ${file.status}`);
    return { bytes: new Uint8Array(await file.arrayBuffer()), usedModel };
  }
  throw new Error('Image API returned neither b64_json nor url');
}

// Every failure the user can see gets a sentence that names what happened.
//
// This list used to have three entries, two specific and one that swallowed
// everything else as "The image could not be generated." — which is how a
// broken deploy, a rejected prompt, an expired key and a missing bucket all
// came to look identical from the outside. Ordered most specific first;
// whatever still falls through carries `detail` alongside it, so the next
// failure is diagnosable from the page rather than from the logs.
function reasonFor(detail: string) {
  if (/verif/i.test(detail)) {
    return 'This OpenAI organisation is not verified for the image model. Verify it, or set OPENAI_IMAGE_MODEL to dall-e-3.';
  }
  // Distinct from the verification gate above: the ORG is verified, but the
  // PROJECT this key belongs to has no image model on its allowlist. Worth its
  // own sentence because the fix is in a different settings page entirely.
  if (/does not have access to model|model_not_found|does not exist/i.test(detail)) {
    return 'The OpenAI project behind this API key has no image model enabled. In the OpenAI dashboard, open that project → Limits → Model access, and enable gpt-image-1.';
  }
  if (/quota|billing|insufficient_quota|exceeded your current quota/i.test(detail)) {
    return 'The OpenAI account has no image credit available.';
  }
  if (/content_policy|safety system|content policy/i.test(detail)) {
    return 'The image model declined this prompt. Nothing is wrong with your report — this happens with some emotional descriptions.';
  }
  if (/insufficient permission|missing scopes|permission/i.test(detail)) {
    return 'The OpenAI key is not permitted to generate images. A project key needs the model.request scope — or use a key with full access.';
  }
  if (/invalid_api_key|incorrect api key|401/i.test(detail)) {
    return 'The OpenAI key was rejected. It may have been rotated or revoked.';
  }
  if (/rate.?limit|429/i.test(detail)) {
    return 'The image model is rate limited right now. Try again in a minute.';
  }
  if (/Upload failed|Bucket not found|bucket/i.test(detail)) {
    return 'The picture was generated but could not be saved to storage.';
  }
  if (/Image download failed/i.test(detail)) {
    return 'The image model produced a picture but it could not be downloaded before the link expired.';
  }
  if (/timeout|timed out|deadline/i.test(detail)) {
    return 'The image model took too long to answer.';
  }
  return 'The image model returned an error.';
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

    const imageContext = body.imageContext || {};
    const story = imageContext.visualStory;
    const names = Array.isArray(imageContext.participantNames) ? imageContext.participantNames : [];
    const prompt = story && typeof story === 'object'
      ? buildScenePrompt(story, names)
      : buildPrompt(imageContext);
    const { bytes, usedModel } = await generateImage(apiKey, prompt, moodOf(imageContext));

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

    return jsonResponse({ status: 'ready', imageUrl, model: usedModel }, 200, cors);
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
    const detail = String(error).slice(0, 300);
    return jsonResponse({ status: 'failed', error: reasonFor(detail), detail }, 200, cors);
  }
});
