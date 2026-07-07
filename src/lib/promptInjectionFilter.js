const suspiciousPhrases = [
  'ignore previous instructions',
  'ignore above prompt',
  'ignore all previous instructions',
  'ignore the above',
  'disregard system prompt',
  'disregard previous instructions',
  'reveal hidden prompt',
  'reveal system prompt',
  'show developer message',
  'show system message',
  'jailbreak',
  'developer mode',
  'admin mode',
  'bypass safety',
  'override rules',
  'tell me who i am',
  'reveal user identity',
  'api key',
  'secret key',
  'password',
  'password extraction',
  'print your instructions',
  'output your prompt',
  'hidden rules',
  'act as',
  'dan mode',
  'pretend you are',
  'forget your rules',
  'forget previous instructions',
  'you are now',
  'new instructions',
  // Hindi / Hinglish equivalents of the highest-signal phrases above.
  'purane nirdesh bhool',
  'nirdesh bhool jao',
  'system prompt dikhao',
  'system prompt batao',
  'niyam bhool jao',
  'safety bypass karo',
];

// Verbs that, in an imperative lead position, indicate an attempt to command
// the model rather than describe something within the conversation itself.
const imperativeVerbs = ['ignore', 'reveal', 'show', 'print', 'output', 'bypass', 'override', 'forget', 'disregard', 'pretend', 'act'];

function isInstructionLike(line) {
  const trimmed = line.trim().toLowerCase();
  if (!trimmed) return false;
  const phraseHit = suspiciousPhrases.some((phrase) => trimmed.includes(phrase));
  if (!phraseHit) return false;

  // Role-prefixed injection attempt, anywhere in the line (not only at the
  // very start) — catches "btw, system: ignore..." style lead-ins.
  const rolePrefix = /(?:^|[.!?]\s+|,\s*)(system|assistant|developer|admin|user)\s*:/i.test(line);

  // An imperative verb within the first few words, optionally preceded by a
  // short conversational lead-in (e.g. "ok now ignore...", "please reveal...").
  const leadInWords = trimmed.replace(/^[^a-z]*/i, '').split(/\s+/).slice(0, 6).join(' ');
  const imperativeNearStart = new RegExp(`\\b(${imperativeVerbs.join('|')})\\b`, 'i').test(leadInWords);

  return rolePrefix || imperativeNearStart;
}

export function detectPromptInjection(rawText = '') {
  const flags = [];
  const suspiciousSegments = [];
  const lines = String(rawText).split(/\r?\n/);
  const cleanedLines = lines.map((line, index) => {
    const lower = line.toLowerCase();
    const matched = suspiciousPhrases.filter((phrase) => lower.includes(phrase));
    if (matched.length) {
      flags.push(...matched);
      suspiciousSegments.push({ line: index + 1, text: line.trim(), matches: matched });
    }
    if (isInstructionLike(line)) {
      return '[Neutralized instruction-like content inside uploaded chat]';
    }
    return line;
  });

  const uniqueFlags = [...new Set(flags)];
  const riskLevel = uniqueFlags.length >= 5 ? 'high' : uniqueFlags.length >= 2 ? 'medium' : uniqueFlags.length === 1 ? 'low' : 'none';
  const cleanedBody = cleanedLines.join('\n').trim();

  return {
    cleanedText: `<UNTRUSTED_CHAT_DATA>\n${cleanedBody}\n</UNTRUSTED_CHAT_DATA>`,
    flags: uniqueFlags,
    riskLevel,
    suspiciousSegments,
  };
}
