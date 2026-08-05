const signs = [
  ['Capricorn', 1, 19],
  ['Aquarius', 2, 18],
  ['Pisces', 3, 20],
  ['Aries', 4, 19],
  ['Taurus', 5, 20],
  ['Gemini', 6, 20],
  ['Cancer', 7, 22],
  ['Leo', 8, 22],
  ['Virgo', 9, 22],
  ['Libra', 10, 22],
  ['Scorpio', 11, 21],
  ['Sagittarius', 12, 21],
  ['Capricorn', 12, 31],
];

const glyphs = {
  Aries: '♈',
  Taurus: '♉',
  Gemini: '♊',
  Cancer: '♋',
  Leo: '♌',
  Virgo: '♍',
  Libra: '♎',
  Scorpio: '♏',
  Sagittarius: '♐',
  Capricorn: '♑',
  Aquarius: '♒',
  Pisces: '♓',
};

const elements = {
  Aries: 'Fire',
  Leo: 'Fire',
  Sagittarius: 'Fire',
  Taurus: 'Earth',
  Virgo: 'Earth',
  Capricorn: 'Earth',
  Gemini: 'Air',
  Libra: 'Air',
  Aquarius: 'Air',
  Cancer: 'Water',
  Scorpio: 'Water',
  Pisces: 'Water',
};

const insights = {
  Fire: 'brings warmth, action, and expressive energy',
  Earth: 'brings steadiness, practicality, and consistency needs',
  Air: 'brings curiosity, mental connection, and room to breathe',
  Water: 'brings emotional depth, sensitivity, and closeness needs',
};

export function getZodiacSign(dateOfBirth) {
  if (!dateOfBirth) return '';
  const date = new Date(dateOfBirth);
  if (Number.isNaN(date.getTime())) return '';
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return signs.find(([, endMonth, endDay]) => month < endMonth || (month === endMonth && day <= endDay))?.[0] || 'Capricorn';
}

export function getZodiacGlyph(sign) {
  return glyphs[sign] || '✦';
}

export function getZodiacElement(sign) {
  return elements[sign] || '';
}

export function getZodiacShortInsight(sign) {
  const element = getZodiacElement(sign);
  return element ? `${sign} ${insights[element]}.` : '';
}

export function buildZodiacCompatibility({ userSign, otherSign, conversationPattern = '' }) {
  if (!userSign && !otherSign) return null;
  const userElement = getZodiacElement(userSign);
  const otherElement = getZodiacElement(otherSign);
  const sameElement = userElement && otherElement && userElement === otherElement;
  const contrast = userElement && otherElement && userElement !== otherElement;
  return {
    userSign,
    userGlyph: getZodiacGlyph(userSign),
    userElement,
    otherSign,
    otherGlyph: getZodiacGlyph(otherSign),
    otherElement,
    interpretation: sameElement
      ? `${userSign} and ${otherSign} share ${userElement} energy, which can make the emotional rhythm feel familiar. The chat still matters more than the sign match.`
      : contrast
        ? `${userSign || 'One sign'} and ${otherSign || 'the other sign'} may express care through different emotional rhythms. The conversation pattern is the stronger signal.`
        : 'Add both dates of birth to unlock a fuller zodiac reflection layer.',
    conversationLayer: conversationPattern
      ? `In this chat, the zodiac layer should be read alongside the actual pattern: ${conversationPattern}`
      : 'The actual conversation patterns matter more than zodiac assumptions.',
    disclaimer: 'Zodiac insights are for reflection and fun. The actual conversation patterns matter more than the sign match.',
  };
}

// ---------------------------------------------------------------------------
// Zodiac compatibility — computed LOCALLY, not by the AI.
//
// Compatibility in astrology is a fixed lookup: element pairing, modality, and
// the angular aspect between the two signs on the wheel. That makes it exact,
// free, instant, and — most importantly — DETERMINISTIC. The same two birthdays
// must always produce the same reading; an LLM would drift between runs and
// cost tokens for something a table answers perfectly.

const ORDER = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

const MODALITIES = {
  Aries: 'Cardinal', Cancer: 'Cardinal', Libra: 'Cardinal', Capricorn: 'Cardinal',
  Taurus: 'Fixed', Leo: 'Fixed', Scorpio: 'Fixed', Aquarius: 'Fixed',
  Gemini: 'Mutable', Virgo: 'Mutable', Sagittarius: 'Mutable', Pisces: 'Mutable',
};

// Aspect by distance around the 12-sign wheel (classical synastry).
const ASPECTS = {
  0: { name: 'Conjunction', score: 78, note: 'the same sign — instantly familiar, and prone to sharing the same blind spot' },
  1: { name: 'Semi-sextile', score: 58, note: 'neighbouring signs — different pace, needs translation' },
  2: { name: 'Sextile', score: 84, note: 'an easy, encouraging angle' },
  3: { name: 'Square', score: 52, note: 'a friction angle — growth through tension' },
  4: { name: 'Trine', score: 92, note: 'the most harmonious angle' },
  5: { name: 'Quincunx', score: 48, note: 'an awkward angle — you see the world differently' },
  6: { name: 'Opposition', score: 70, note: 'opposites — magnetic pull with a push' },
};

const ELEMENT_PAIRS = {
  'Fire|Fire': ['shared drive and momentum', 'both want to lead, so heat builds fast'],
  'Earth|Earth': ['steady, reliable rhythm', 'change can feel threatening to you both'],
  'Air|Air': ['endless conversation and ideas', 'feelings can get talked around instead of felt'],
  'Water|Water': ['deep emotional attunement', 'moods amplify each other'],
  'Air|Fire': ['ideas feed action — naturally energising', 'plans can outrun follow-through'],
  'Earth|Water': ['care becomes practical and safe', 'comfort can slide into stagnation'],
  'Earth|Fire': ['ambition meets patience', 'one wants to go now, the other wants a plan'],
  'Fire|Water': ['passion and depth in the same room', 'directness can read as harshness'],
  'Air|Earth': ['perspective plus practicality', 'one lives in ideas, the other in reality'],
  'Air|Water': ['imagination and empathy', 'logic and feeling can talk past each other'],
};

function elementPairKey(a, b) {
  return [a, b].sort().join('|');
}

export function getZodiacModality(sign) {
  return MODALITIES[sign] || '';
}

export function buildZodiacMatch(userSign, otherSign) {
  if (!userSign || !otherSign) return null;
  const userIndex = ORDER.indexOf(userSign);
  const otherIndex = ORDER.indexOf(otherSign);
  if (userIndex < 0 || otherIndex < 0) return null;

  const distance = Math.min(Math.abs(userIndex - otherIndex), 12 - Math.abs(userIndex - otherIndex));
  const aspect = ASPECTS[distance] || ASPECTS[0];
  const userElement = getZodiacElement(userSign);
  const otherElement = getZodiacElement(otherSign);
  const [strength, friction] = ELEMENT_PAIRS[elementPairKey(userElement, otherElement)] || ['a mix of styles', 'differences worth naming out loud'];

  const sameModality = MODALITIES[userSign] === MODALITIES[otherSign];
  // Same modality means both approach change the same way, which classically
  // reads as friction rather than harmony.
  const score = Math.max(35, Math.min(96, aspect.score + (sameModality ? -6 : 4)));

  const label = score >= 85 ? 'Naturally in sync'
    : score >= 70 ? 'Workable with awareness'
      : score >= 55 ? 'Different rhythms'
        : 'Opposite wiring';

  return {
    userSign,
    userGlyph: getZodiacGlyph(userSign),
    userElement,
    userModality: MODALITIES[userSign],
    otherSign,
    otherGlyph: getZodiacGlyph(otherSign),
    otherElement,
    otherModality: MODALITIES[otherSign],
    score,
    label,
    aspect: aspect.name,
    aspectNote: aspect.note,
    strength,
    friction,
    modalityNote: sameModality
      ? `Both are ${MODALITIES[userSign]} signs, so you tend to approach change the same way — which can mean deadlock when you disagree.`
      : `${userSign} is ${MODALITIES[userSign]} and ${otherSign} is ${MODALITIES[otherSign]}, so you handle change differently — useful when you let it balance instead of compete.`,
    disclaimer: 'For fun and reflection only. Everything else in this report comes from the actual conversation — that is the part worth trusting.',
  };
}
