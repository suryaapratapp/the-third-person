// VADER-style sentiment, tuned for the chats this product actually reads.
//
// WHY NOT THE `vader-sentiment` PACKAGE: it is 725KB unpacked, almost all of
// it a 7,500-word lexicon, and this runs CLIENT-SIDE during preprocessing — so
// it is 725KB every visitor downloads. The valuable half of VADER is not the
// lexicon anyway; it is the five heuristics below, which is what separates it
// from naive word counting. Those are implemented faithfully here, against a
// lexicon covering the emotional vocabulary that actually appears in chat.
//
// It also covers HINGLISH, which upstream VADER does not at all. For this
// product's users that matters more than the English long tail: "bahut sahi
// yaar" carries more signal than "resplendent".
//
// Honest limits: no sarcasm detection (that is the model's job, and it is
// prompted for it), no idioms, and a shorter English tail than real VADER. It
// is a strong signal, not a verdict, and every surface that shows it says so.

// Valence, roughly -4..+4 on VADER's scale.
const LEXICON = {
  // --- strong positive ---
  love: 3.2, loved: 3.0, loving: 3.0, adore: 3.3, amazing: 3.1, awesome: 3.1,
  perfect: 3.0, excellent: 3.1, wonderful: 3.0, fantastic: 3.1, brilliant: 3.0,
  best: 3.0, beautiful: 2.9, gorgeous: 3.0, incredible: 2.9, grateful: 2.7,
  proud: 2.6, happy: 2.7, excited: 2.6, glad: 2.2, delighted: 2.9,
  // --- moderate positive ---
  good: 1.9, great: 2.6, nice: 1.8, sweet: 2.0, cool: 1.5, fun: 2.1, kind: 2.2,
  thanks: 1.9, thank: 1.9, thankyou: 2.2, welcome: 1.5, please: 0.9, sorry: 0.4,
  care: 1.9, cares: 1.9, caring: 2.1, miss: 1.4, missed: 1.2, hug: 2.2,
  kiss: 2.3, cute: 2.0, lovely: 2.5, safe: 1.6, calm: 1.4, better: 1.6,
  congrats: 2.8, congratulations: 2.8, yay: 2.2, haha: 1.9, hahaha: 2.2,
  lol: 1.7, lmao: 2.0, hehe: 1.6, funny: 1.8, enjoy: 2.1, enjoyed: 2.0,
  // --- strong negative ---
  hate: -3.2, hated: -3.0, awful: -2.9, terrible: -3.0, horrible: -3.0,
  worst: -3.1, disgusting: -3.0, pathetic: -2.8, useless: -2.5, stupid: -2.4,
  furious: -3.0, betrayed: -3.1, humiliated: -3.0, devastated: -3.0,
  // --- moderate negative ---
  angry: -2.4, annoyed: -1.9, annoying: -2.0, upset: -2.1, sad: -2.1,
  hurt: -2.2, hurts: -2.2, tired: -1.3, exhausted: -1.8, done: -1.0,
  whatever: -1.3, ignore: -1.9, ignored: -2.2, ignoring: -2.1, alone: -1.6,
  lonely: -2.3, unfair: -2.0, wrong: -1.6, bad: -1.9, worse: -2.0,
  fight: -1.8, fighting: -1.9, argue: -1.8, argument: -1.7, blocked: -2.0,
  disappointed: -2.3, confused: -1.1, worried: -1.7, scared: -1.9, afraid: -1.8,
  guilty: -1.6, jealous: -1.7, awkward: -1.2, boring: -1.5, bored: -1.3,
  // --- Hinglish / Hindi, Latin script. Upstream VADER has none of this. ---
  pyaar: 3.0, jaan: 2.6, yaar: 1.0, accha: 1.6, acha: 1.6, achaa: 1.6,
  badhiya: 2.4, mast: 2.3, zabardast: 2.9, sahi: 1.7, theek: 0.9, thik: 0.9,
  khush: 2.5, shukriya: 2.0, dhanyavad: 2.0, maaf: 0.6, sundar: 2.4,
  bekar: -2.0, galat: -1.8, gussa: -2.3, pareshan: -2.0, bakwas: -2.2,
  dukh: -2.4, rona: -1.9, dard: -2.1, jhagda: -2.0, dhoka: -3.0,
  // Affectionate insults sit near zero on purpose. Between close friends
  // "bsdk" is warmth, and scoring it as profanity mislabels the whole chat.
  // The subtext prompt handles the genuinely hostile cases.
  bsdk: 0.2, chutiya: 0.1, saale: 0.3, kutte: 0.1, kamine: 0.2, harami: 0.1,
};

// Words that scale whatever follows them.
const BOOSTERS = {
  very: 0.293, really: 0.293, so: 0.293, extremely: 0.393, absolutely: 0.393,
  completely: 0.293, totally: 0.293, super: 0.293, incredibly: 0.393,
  bohot: 0.293, bahut: 0.293, bhot: 0.293, itna: 0.2, kitna: 0.2, ekdum: 0.35,
  slightly: -0.293, somewhat: -0.293, barely: -0.293, kinda: -0.25,
  kind: -0.1, sort: -0.1, thoda: -0.293, halka: -0.25,
};

const NEGATIONS = new Set([
  'not', 'no', 'never', 'none', 'nobody', 'nothing', 'neither', 'nowhere',
  'cannot', 'cant', 'wont', 'dont', 'didnt', 'doesnt', 'isnt', 'wasnt',
  'arent', 'werent', 'hasnt', 'havent', 'shouldnt', 'wouldnt', 'couldnt',
  'without', 'nahi', 'nhi', 'nahin', 'mat', 'na', 'kabhi',
]);

// VADER's constants, kept as published.
// Hindi and Hinglish negate AFTER the word, not before: English says "not
// good", Hindi says "accha nahi hai". A lookback-only rule — which is all
// VADER has, being built for English — reads that as a compliment.
const POST_NEGATIONS = new Set(['nahi', 'nhi', 'nahin', 'nai', 'mat', 'na', 'nako']);

const NEGATION_SCALAR = -0.74;
const ALL_CAPS_SCALAR = 0.733;
const EXCLAMATION_WEIGHT = 0.292;
const QUESTION_WEIGHT_LOW = 0.18;
const QUESTION_WEIGHT_HIGH = 0.96;
const ALPHA = 15; // normalisation constant

// Emoji valence. A small set, because these are the ones that carry a
// conversation — and unlike words they are unambiguous.
const EMOJI_VALENCE = [
  [[0x1f600, 0x1f60f], 2.0], [[0x1f617, 0x1f61d], 2.0], [[0x1f642, 0x1f643], 1.5],
  [[0x1f495, 0x1f49f], 2.8], [[0x2764, 0x2764], 3.0], [[0x1f970, 0x1f972], 2.4],
  [[0x1f929, 0x1f929], 2.6], [[0x1f917, 0x1f917], 2.2], [[0x1f973, 0x1f973], 2.5],
  [[0x1f620, 0x1f624], -2.4], [[0x1f61e, 0x1f61f], -1.8], [[0x1f62d, 0x1f62d], -2.2],
  [[0x1f612, 0x1f612], -1.6], [[0x1f644, 0x1f644], -1.2], [[0x1f494, 0x1f494], -2.8],
  [[0x1f922, 0x1f922], -2.0], [[0x1f92c, 0x1f92c], -2.6],
];

function emojiValence(text) {
  let total = 0;
  for (const character of text) {
    const point = character.codePointAt(0);
    for (const [[low, high], value] of EMOJI_VALENCE) {
      if (point >= low && point <= high) { total += value; break; }
    }
  }
  return total;
}

function isAllCaps(word) {
  return word.length > 1 && word === word.toUpperCase() && /[A-Z]/.test(word);
}

function punctuationEmphasis(text) {
  const exclamations = Math.min((text.match(/!/g) || []).length, 4);
  let amplifier = exclamations * EXCLAMATION_WEIGHT;
  const questions = (text.match(/\?/g) || []).length;
  if (questions > 1) amplifier += questions <= 3 ? questions * QUESTION_WEIGHT_LOW : QUESTION_WEIGHT_HIGH;
  return amplifier;
}

// Returns a compound score in -1..1, the same shape VADER reports.
export function sentimentOf(text) {
  const raw = String(text || '');
  if (!raw.trim()) return { compound: 0, hits: 0 };

  const tokens = raw.split(/\s+/).filter(Boolean);
  const words = tokens.map((token) => token.replace(/[^\p{L}\p{M}']/gu, ''));
  const lower = words.map((word) => word.toLowerCase().replace(/'/g, ''));

  const scored = [];   // per-token valence, so the "but" rule can reweight sides
  let hits = 0;

  lower.forEach((word, index) => {
    let valence = LEXICON[word];
    if (valence === undefined) return;
    hits += 1;

    // ALL CAPS is emphasis, but only when the message is not entirely caps —
    // some people simply type that way.
    if (isAllCaps(words[index]) && !tokens.every((token) => isAllCaps(token))) {
      valence += valence > 0 ? ALL_CAPS_SCALAR : -ALL_CAPS_SCALAR;
    }

    // Up to three preceding words can boost or negate, with the effect
    // decaying by distance — VADER's key insight over bag-of-words.
    for (let back = 1; back <= 3; back += 1) {
      const previous = lower[index - back];
      if (!previous) break;
      const boost = BOOSTERS[previous];
      if (boost !== undefined) {
        const decay = back === 1 ? 1 : back === 2 ? 0.95 : 0.9;
        valence += (valence > 0 ? boost : -boost) * decay;
      }
      if (NEGATIONS.has(previous)) valence *= NEGATION_SCALAR;
    }

    // Forward negation, for the Hindi/Hinglish word order. Two words is
    // enough: "accha nahi", "accha nahi hai", "sahi nahi lag raha".
    for (let ahead = 1; ahead <= 2; ahead += 1) {
      const next = lower[index + ahead];
      if (!next) break;
      if (POST_NEGATIONS.has(next)) {
        valence *= NEGATION_SCALAR;
        break;
      }
    }

    scored.push({ index, valence });
  });

  // "but" splits a sentence and the half after it is what the person actually
  // means. "I love you but you never call" is a complaint, not a declaration.
  // VADER's weights: halve everything before, amplify everything after.
  const butIndex = lower.findIndex((word) => word === 'but' || word === 'lekin' || word === 'par');
  let total = scored.reduce((sum, item) => {
    if (butIndex === -1) return sum + item.valence;
    return sum + item.valence * (item.index < butIndex ? 0.5 : 1.5);
  }, 0);

  total += emojiValence(raw);

  const emphasis = punctuationEmphasis(raw);
  total += total > 0 ? emphasis : total < 0 ? -emphasis : 0;

  // VADER's normalisation: squashes any magnitude into -1..1.
  const compound = total / Math.sqrt(total * total + ALPHA);
  return { compound: Math.max(-1, Math.min(1, compound)), hits };
}

const POSITIVE_CUTOFF = 0.05;
const NEGATIVE_CUTOFF = -0.05;

export function classifySentiment(compound) {
  if (compound >= POSITIVE_CUTOFF) return 'positive';
  if (compound <= NEGATIVE_CUTOFF) return 'negative';
  return 'neutral';
}

// Per-person sentiment summary.
//
// Reported as shares rather than an average alone: a mean near zero can mean
// "everything was mild" or "half ecstatic, half furious", and those are
// completely different relationships.
export function computeSentimentProfile(messages = []) {
  const usable = messages.filter((message) => message?.sender);
  if (usable.length < 20) return null;

  const bySender = new Map();
  usable.forEach((message) => {
    const entry = bySender.get(message.sender) || { sender: message.sender, scores: [] };
    // rawBody, not message: the parsed body has emoji stripped out of it.
    const { compound } = sentimentOf(message.rawBody ?? message.message);
    entry.scores.push(compound);
    bySender.set(message.sender, entry);
  });

  const people = [...bySender.values()].map((entry) => {
    const { scores } = entry;
    const mean = scores.reduce((sum, value) => sum + value, 0) / scores.length;
    const counts = { positive: 0, neutral: 0, negative: 0 };
    scores.forEach((score) => { counts[classifySentiment(score)] += 1; });
    const variance = scores.reduce((sum, value) => sum + (value - mean) ** 2, 0) / scores.length;
    return {
      sender: entry.sender,
      messages: scores.length,
      mean: Math.round(mean * 100) / 100,
      positiveShare: Math.round((counts.positive / scores.length) * 100),
      neutralShare: Math.round((counts.neutral / scores.length) * 100),
      negativeShare: Math.round((counts.negative / scores.length) * 100),
      // Standard deviation: how far the person swings, not where they sit.
      volatility: Math.round(Math.sqrt(variance) * 100) / 100,
    };
  }).sort((a, b) => b.messages - a.messages);

  if (people.length < 2) return null;

  const warmer = [...people].sort((a, b) => b.mean - a.mean)[0];
  const swingier = [...people].sort((a, b) => b.volatility - a.volatility)[0];

  return {
    people,
    warmerPerson: warmer.sender,
    warmerBy: Math.round((warmer.mean - people.find((p) => p.sender !== warmer.sender).mean) * 100) / 100,
    mostVolatile: swingier.sender,
  };
}
