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
