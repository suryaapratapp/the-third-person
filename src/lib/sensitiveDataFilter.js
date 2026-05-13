function collectMatches(text, regex) {
  return [...String(text).matchAll(regex)].map((match) => match[0]);
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function protectedItem(type, value, replacement) {
  return { type, value, replacement };
}

export function filterSensitiveData(rawText = '') {
  let protectedText = String(rawText);
  const protectedItems = [];
  const findings = {
    emails: unique(collectMatches(protectedText, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)),
    phoneNumbers: unique(collectMatches(protectedText, /(?:\+?91[-\s]?)?(?:\b[6-9]\d{9}\b|\b\d{3}[-\s]\d{3}[-\s]\d{4}\b)/g)),
    cardLikeNumbers: unique(collectMatches(protectedText, /\b(?:\d[ -]*?){13,19}\b/g)),
    addresses: unique(collectMatches(protectedText, /\b(?:flat|house|building|apt|apartment|sector|street|road|lane|nagar|colony|block)\b[^.\n]{8,90}/gi)),
    urls: unique(collectMatches(protectedText, /\bhttps?:\/\/[^\s]+|\bwww\.[^\s]+/gi)),
    upiIds: unique(collectMatches(protectedText, /\b[\w.-]+@[a-zA-Z]{3,}\b/g)),
    pinCodes: unique(collectMatches(protectedText, /\b\d{6}\b/g)),
    secrets: unique(collectMatches(protectedText, /\b(?:sk|pk|api|key|secret|token)[_-]?[A-Za-z0-9_-]{12,}\b/gi)),
    ids: unique([
      ...collectMatches(protectedText, /\b[A-Z]{5}\d{4}[A-Z]\b/g),
      ...collectMatches(protectedText, /\b\d{4}\s?\d{4}\s?\d{4}\b/g),
      ...collectMatches(protectedText, /\b[A-Za-z0-9._-]+@[a-zA-Z]{3,}\b/g),
      ...collectMatches(protectedText, /\b\d{10,}\b/g),
      ...collectMatches(protectedText, /\b(?:sk|pk|api|key|secret|token)[_-]?[A-Za-z0-9_-]{12,}\b/gi),
    ]),
  };

  const replacements = [
    ['Email', findings.emails, '[EMAIL_PROTECTED]'],
    ['URL', findings.urls, '[URL_PROTECTED]'],
    ['Phone', findings.phoneNumbers, '[PHONE_PROTECTED]'],
    ['Card-like number', findings.cardLikeNumbers, '[CARD_NUMBER_PROTECTED]'],
    ['Indian tax ID / PAN-like ID', unique(collectMatches(protectedText, /\b[A-Z]{5}\d{4}[A-Z]\b/g)), '[ID_PROTECTED]'],
    ['Aadhaar-like ID', unique(collectMatches(protectedText, /\b\d{4}\s?\d{4}\s?\d{4}\b/g)), '[ID_PROTECTED]'],
    ['UPI ID', findings.upiIds, '[ID_PROTECTED]'],
    ['Long numeric ID', unique(collectMatches(protectedText, /\b\d{10,}\b/g)), '[ID_PROTECTED]'],
    ['Secret-like token', findings.secrets, '[SECRET_PROTECTED]'],
    ['Address-like detail', findings.addresses, '[ADDRESS_PROTECTED]'],
    ['PIN code', findings.pinCodes, '[PIN_PROTECTED]'],
  ];

  replacements.forEach(([type, values, replacement]) => {
    values.forEach((value) => {
      protectedItems.push(protectedItem(type, value, replacement));
      protectedText = protectedText.replace(new RegExp(escapeRegExp(value), 'g'), replacement);
    });
  });

  const uniqueProtectedItems = protectedItems.filter((item, index, list) => (
    list.findIndex((candidate) => candidate.type === item.type && candidate.value === item.value) === index
  ));
  const totalProtectedItems = uniqueProtectedItems.length;
  findings.totalProtectedItems = totalProtectedItems;

  return {
    protectedText,
    findings,
    protectedItems: uniqueProtectedItems,
    protectionSummary: totalProtectedItems
      ? `${totalProtectedItems} sensitive detail${totalProtectedItems === 1 ? '' : 's'} protected before analysis.`
      : 'No obvious sensitive details needed protection.',
    safePreview: protectedText.slice(0, 420),
  };
}
