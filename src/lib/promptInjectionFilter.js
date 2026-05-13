const suspiciousPhrases = [
  'ignore previous instructions',
  'ignore above prompt',
  'disregard system prompt',
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
];

function isInstructionLike(line) {
  const trimmed = line.trim().toLowerCase();
  if (!trimmed) return false;
  const phraseHit = suspiciousPhrases.some((phrase) => trimmed.includes(phrase));
  const imperativeShape = /^(system|assistant|developer|admin|user)\s*:/i.test(line)
    || /^(ignore|reveal|show|print|output|bypass|override|forget)\b/i.test(trimmed);
  return phraseHit && imperativeShape;
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
