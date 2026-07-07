const suspiciousPatterns = [
  /<script\b/i,
  /\beval\s*\(/i,
  /document\.cookie/i,
  /\bpowershell\b/i,
  /\bcmd\.exe\b/i,
  /\bcurl\s+https?:\/\//i,
  /\bwget\s+https?:\/\//i,
  /\brm\s+-rf\b/i,
  /\bsudo\b/i,
  /\bDROP\s+TABLE\b/i,
  /\bUNION\s+SELECT\b/i,
  /BEGIN\s+RSA\s+PRIVATE\s+KEY/i,
  /\bapi_key\s*=/i,
  /\bsecret\s*=/i,
  /\bpassword\s*=/i,
  /[A-Za-z0-9+/=]{600,}/,
  /\bfunction\s+\w+\s*\(/,
  /\bimport\s+.+\s+from\b/,
  /\brequire\s*\(/,
];

const lineRemovalPatterns = [
  /<script\b/i,
  /\beval\s*\(/i,
  /document\.cookie/i,
  /\bpowershell\b/i,
  /\bcmd\.exe\b/i,
  /\bcurl\s+https?:\/\//i,
  /\bwget\s+https?:\/\//i,
  /\brm\s+-rf\b/i,
  /\bsudo\b/i,
  /\bDROP\s+TABLE\b/i,
  /\bUNION\s+SELECT\b/i,
  /\bapi_key\s*=/i,
  /\bsecret\s*=/i,
  /\bpassword\s*=/i,
  /\bfunction\s+\w+\s*\(/,
  /\bimport\s+.+\s+from\b/,
  /\brequire\s*\(/,
];

function looksLikeConversation(text = '') {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const chatLike = lines.filter((line) => (
    /^\[?\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(line)
    || /^[^:]{1,40}:\s+/.test(line)
  )).length;
  return chatLike >= 2 || chatLike / Math.max(1, lines.length) > 0.2;
}

export function scanUploadedFileContent({ fileName = '', text = '' }) {
  const technicalFlags = [];
  const reasons = [];
  let cleanedText = String(text || '');

  suspiciousPatterns.forEach((pattern) => {
    if (pattern.test(cleanedText)) technicalFlags.push(String(pattern));
  });

  if (technicalFlags.length) {
    cleanedText = cleanedText
      .replace(/<script[\s\S]*?<\/script>/gi, '[TECHNICAL_CONTENT_REMOVED]')
      .replace(/[A-Za-z0-9+/=]{600,}/g, '[TECHNICAL_CONTENT_REMOVED]')
      .replace(/BEGIN\s+RSA\s+PRIVATE\s+KEY[\s\S]*?END\s+RSA\s+PRIVATE\s+KEY/gi, '[TECHNICAL_CONTENT_REMOVED]');
    cleanedText = cleanedText
      .split(/\r?\n/)
      .filter((line) => !lineRemovalPatterns.some((pattern) => pattern.test(line)))
      .join('\n');
    reasons.push('Some technical content was removed so your conversation can be prepared safely.');
  }

  const codeHeavy = technicalFlags.length >= 4 && !looksLikeConversation(cleanedText);
  const highRisk = codeHeavy || (technicalFlags.length >= 2 && /\.(js|ts|py|php|sh|bat|cmd|exe|dll|msi|apk|dmg|jar|scr)$/i.test(fileName));
  const mediumRisk = !highRisk && technicalFlags.length > 0;
  const remainingText = cleanedText.replace(/\[TECHNICAL_CONTENT_REMOVED\]/g, '').trim();
  const conversationalPlainText = remainingText.split(/\s+/).length >= 30 && !/[{}();=<>]/.test(remainingText);
  const conversationLeft = looksLikeConversation(cleanedText) || (technicalFlags.length ? conversationalPlainText : remainingText.length > 20);

  if (highRisk || !conversationLeft) {
    return {
      isAllowed: false,
      riskLevel: 'high',
      reasons,
      cleanedText: '',
      userMessage: 'We could not process this file safely. Please upload a standard chat export file such as .txt, .json, or .csv.',
      technicalFlags,
    };
  }

  return {
    isAllowed: true,
    riskLevel: mediumRisk ? 'medium' : 'low',
    reasons,
    cleanedText,
    userMessage: mediumRisk
      ? 'Some technical content was removed so your conversation can be prepared safely.'
      : '',
    technicalFlags,
  };
}
