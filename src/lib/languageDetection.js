const scriptDetectors = [
  ['Hindi', /[\u0900-\u097F]/],
  ['Bengali', /[\u0980-\u09FF]/],
  ['Punjabi', /[\u0A00-\u0A7F]/],
  ['Gujarati', /[\u0A80-\u0AFF]/],
  ['Odia', /[\u0B00-\u0B7F]/],
  ['Tamil', /[\u0B80-\u0BFF]/],
  ['Telugu', /[\u0C00-\u0C7F]/],
  ['Kannada', /[\u0C80-\u0CFF]/],
  ['Malayalam', /[\u0D00-\u0D7F]/],
  ['Assamese', /[\u0980-\u09FF]/],
  ['Urdu', /[\u0600-\u06FF]/],
];

const romanHints = {
  Hinglish: /\b(hai|haan|nahi|kya|kyu|kyun|mat|kar|karo|apko|aapko|sahi|shi|lagta|lage|yaad|pyaar|pyar|gussa|naraz|bata|samajh|iska|uska|sakta|skta|hu|tum|aap|thoda|scene|vibe)\b/i,
  Bengali: /\b(ami|tumi|bhalo|kotha|keno|hoye|ache|korbo|bujhte)\b/i,
  Marathi: /\b(majha|majhi|tula|mala|kay|nahi|ahe|karu|bolu)\b/i,
  Tamil: /\b(naan|nee|enna|illa|seri|romba|pesu|pannu)\b/i,
  Telugu: /\b(nenu|nuvvu|enti|ledu|chala|matlad|cheppu)\b/i,
  Gujarati: /\b(tame|kem|nathi|che|sarun|vat)\b/i,
  Punjabi: /\b(main|tusi|ki|nahi|haanji|gall|pyaar)\b/i,
};

function asText(input) {
  if (Array.isArray(input)) return input.map((item) => item?.message || item?.text || '').join('\n');
  return String(input || '');
}

export function detectConversationLanguageProfile(input) {
  const text = asText(input);
  const scores = new Map();
  const add = (language, amount = 1) => scores.set(language, (scores.get(language) || 0) + amount);

  scriptDetectors.forEach(([language, regex]) => {
    const matches = text.match(new RegExp(regex.source, 'g')) || [];
    if (matches.length) add(language, matches.length);
  });

  Object.entries(romanHints).forEach(([language, regex]) => {
    const matches = text.match(new RegExp(regex.source, 'gi')) || [];
    if (matches.length) add(language, matches.length * 2);
  });

  const latinWordCount = (text.match(/[a-z]{3,}/gi) || []).length;
  if (latinWordCount) add('English', Math.min(latinWordCount, 250));

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const dominantLanguage = ranked[0]?.[0] || 'English';
  const languagesUsed = ranked
    .filter(([, score]) => score >= Math.max(2, (ranked[0]?.[1] || 0) * 0.08))
    .map(([language]) => language);
  const hasIndianMix = languagesUsed.some((language) => ['Hindi', 'Hinglish', 'Urdu', 'Bengali', 'Marathi', 'Tamil', 'Telugu', 'Gujarati', 'Punjabi'].includes(language));
  const hasEnglish = languagesUsed.includes('English');
  const recommendedOutputStyle = hasIndianMix && hasEnglish
    ? 'Natural Indian-style mixed language where useful'
    : dominantLanguage === 'Hinglish'
      ? 'Natural Hinglish'
      : `Mostly ${dominantLanguage}`;

  return {
    dominantLanguage,
    languagesUsed: languagesUsed.length ? languagesUsed : ['English'],
    languageMix: languagesUsed.length > 1 ? 'mixed' : 'single-language',
    recommendedOutputStyle,
    confidence: ranked.length ? 'medium' : 'low',
  };
}
