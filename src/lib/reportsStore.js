import { retainableConversation } from './retainedConversation.js';

const REPORTS_KEY = 'thirdperson_relationship_reports';
const RELATIONSHIP_PERSONALITY_CARDS_KEY = 'thirdperson_relationship_personality_cards_v1';

function readReports() {
  try {
    return JSON.parse(window.localStorage.getItem(REPORTS_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeReports(reports) {
  window.localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}

function readRelationshipPersonalityCards() {
  try {
    return JSON.parse(window.localStorage.getItem(RELATIONSHIP_PERSONALITY_CARDS_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeRelationshipPersonalityCards(cards) {
  window.localStorage.setItem(RELATIONSHIP_PERSONALITY_CARDS_KEY, JSON.stringify(cards));
}

// Used by the "delete my analysis data" control so a privacy wipe also clears
// the on-device copies, not just the server rows.
export function clearLocalReportsAndCards() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(REPORTS_KEY);
  window.localStorage.removeItem(RELATIONSHIP_PERSONALITY_CARDS_KEY);
}

function asList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value].filter(Boolean);
}

// Flags/traits may be typed objects ({ label, explanation, ... }) or strings.
// Reduce to readable text so summaries never persist "[object Object]".
function toReadableText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(toReadableText).filter(Boolean).join(' • ');
  if (typeof value === 'object') {
    for (const key of ['label', 'title', 'text', 'name', 'summary', 'explanation', 'value', 'note', 'trait', 'flag']) {
      if (typeof value[key] === 'string' && value[key].trim()) return value[key].trim();
    }
    const firstString = Object.values(value).find((item) => typeof item === 'string' && item.trim());
    return firstString ? firstString.trim() : '';
  }
  return '';
}

function shortText(value, fallback = 'Not enough evidence yet.') {
  if (Array.isArray(value)) {
    return value.map(toReadableText).filter(Boolean).slice(0, 4).join(' • ') || fallback;
  }
  const text = toReadableText(value);
  if (!text) return fallback;
  return text.length > 420 ? `${text.slice(0, 417).trim()}...` : text;
}

function relationshipWorldLabel(relationshipType = 'Relationship') {
  const value = String(relationshipType || '').toLowerCase();
  if (/friend/.test(value)) return 'Friends';
  if (/family|mom|dad|brother|sister|cousin/.test(value)) return 'Family';
  if (/ex/.test(value)) return 'Ex';
  if (/partner|dating|crush|love|boyfriend|girlfriend|spouse|wife|husband/.test(value)) return 'Partner';
  if (/colleague|coworker/.test(value)) return 'Colleagues';
  if (/client/.test(value)) return 'Clients';
  if (/manager|boss/.test(value)) return 'Manager';
  return relationshipType || 'Relationship';
}

export function buildRelationshipPersonalityCard({ analysis = {}, report = {}, preparedConversation = {} }) {
  const meta = preparedConversation?.metadata || {};
  const relationshipType = report.relationshipType || meta.relationshipType || analysis.relationshipPersonalityCard?.relationshipType || 'Relationship';
  const otherPersonName = report.personName || meta.personName || analysis.conversationRecap?.personName || '';
  const world = relationshipWorldLabel(relationshipType);
  const rawCard = analysis.relationshipPersonalityCard || analysis.personalityCardUpdate || {};
  const signals = analysis.mainUserPersonalitySignals || {};
  const title = rawCard.title || `Your Personality With ${world}`;
  const greenFlags = asList(rawCard.greenFlags || rawCard.coreTraits || signals.strongSignals);
  const redFlags = asList(rawCard.redFlags || rawCard.growthAreas || signals.weakSignals);
  const growthAreas = asList(rawCard.growthAreas || signals.notEnoughEvidence);
  const topWords = asList(rawCard.keywords || signals.topWords)
    .map((item) => (typeof item === 'string' ? item : item?.word || item?.label))
    .filter(Boolean)
    .slice(0, 12);
  const summary = rawCard.summaryParagraph
    || rawCard.conciseSummaryForDatabase
    || rawCard.emotionalSignature
    || rawCard.headline
    || signals.emotionalPattern
    || signals.communicationStyle
    || 'Not enough evidence yet. Upload more chats in this relationship world to make this clearer.';

  return {
    id: rawCard.id || `rpc-${report.analysisId || Date.now()}`,
    userId: rawCard.userId || '',
    relationshipType,
    otherPersonName,
    reportId: report.analysisId || rawCard.reportId || null,
    title,
    shortSummary: shortText(rawCard.conciseSummaryForDatabase || summary),
    summaryParagraph: shortText(rawCard.summaryParagraph || summary),
    personalityLabel: rawCard.personalityLabel || rawCard.shareableLabel || rawCard.headline || 'Early personality signal',
    personalityTypeSignal: rawCard.personalityTypeSignal || 'Personality signal still forming',
    greenFlagsSummary: shortText(greenFlags),
    redFlagsSummary: shortText(redFlags),
    communicationStyleSummary: shortText(rawCard.communicationStyle || signals.communicationStyle),
    emotionalSignatureSummary: shortText(rawCard.emotionalSignature || signals.emotionalPattern),
    attractionEnergySummary: shortText(rawCard.attractionEnergy || rawCard.magneticEnergy || rawCard.conversationMagnet),
    growthAreasSummary: shortText(growthAreas),
    keywords: topWords.length ? topWords : ['Early signal'],
    confidenceLevel: rawCard.confidenceLevel || (signals.notEnoughEvidence?.length ? 'Early Signal' : 'Repeated Pattern'),
    createdAt: report.dateAnalysed || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    rawCard,
  };
}

export function getRelationshipPersonalityCards() {
  if (typeof window === 'undefined') return [];
  return readRelationshipPersonalityCards();
}

export function saveRelationshipPersonalityCardLocal({ analysis, report, preparedConversation }) {
  if (typeof window === 'undefined' || !analysis || !report) return null;
  const card = buildRelationshipPersonalityCard({ analysis, report, preparedConversation });
  const cards = readRelationshipPersonalityCards().filter((item) => {
    if (card.reportId && item.reportId) return item.reportId !== card.reportId;
    return item.id !== card.id;
  });
  cards.unshift(card);
  writeRelationshipPersonalityCards(cards.slice(0, 120));
  return card;
}

export function getReports() {
  if (typeof window === 'undefined') return [];
  return readReports();
}

export function saveAnalysisReport({ analysis, preparedConversation }) {
  if (typeof window === 'undefined' || !analysis) return null;
  const recap = analysis.conversationRecap || {};
  const meta = preparedConversation?.metadata || {};
  const personName = recap.personName || meta.personName || 'Unknown person';
  const relationshipType = recap.relationshipType || meta.relationshipType || 'Relationship';
  const platform = recap.platform || meta.platform || 'Unknown';
  const chainId = `${personName}-${relationshipType}-${platform}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const report = {
    analysisId: `analysis-${Date.now()}`,
    personName,
    relationshipType,
    platform,
    dateAnalysed: new Date().toISOString(),
    dateRange: preparedConversation?.estimatedDateRange || 'Date range unavailable',
    mainDynamic: recap.mainDynamic || analysis.relationshipReport?.overallDynamic || analysis.summary?.currentDynamic || 'Relationship pattern available',
    compatibilityScore: recap.compatibilityScore || analysis.relationshipReport?.scores?.compatibility || analysis.scores?.compatibility || 0,
    emotionalTrend: recap.emotionalTrend || analysis.relationshipReport?.emotionalTone || 'Mixed',
    participants: preparedConversation?.participants || preparedConversation?.participantNames || analysis.participants?.detectedParticipants || [],
    messageCount: preparedConversation?.messageCount || 0,
    analysisJson: analysis,
    // Aggregates only. This is the offline/fallback path and it writes to
    // localStorage, so persisting the transcript here would leave the full
    // conversation sitting in the browser of a device the user may share —
    // while the product tells them it was discarded after analysis.
    preparedConversation: retainableConversation(preparedConversation),
    bestieContextSummary: analysis.bestieContextSummary || {},
    reportSummaryForFutureUse: analysis.reportSummaryForFutureUse || {},
    mainUserPersonalitySignals: analysis.mainUserPersonalitySignals || {},
    chainId,
  };
  const reports = readReports().filter((item) => item.analysisId !== report.analysisId);
  reports.unshift(report);
  writeReports(reports.slice(0, 80));
  saveRelationshipPersonalityCardLocal({ analysis, report, preparedConversation });
  return report;
}

export function groupReports(reports) {
  return reports.reduce((groups, report) => {
    const existing = groups.get(report.chainId) || {
      chainId: report.chainId,
      personName: report.personName,
      relationshipType: report.relationshipType,
      platform: report.platform,
      reports: [],
    };
    existing.reports.push(report);
    groups.set(report.chainId, existing);
    return groups;
  }, new Map());
}

export function getChainById(chainId) {
  return groupReports(getReports()).get(chainId) || null;
}

export function buildAnalysisChainContext(chain) {
  if (!chain?.reports?.length) return null;
  const sorted = [...chain.reports].sort((a, b) => new Date(a.dateAnalysed) - new Date(b.dateAnalysed));
  const latest = sorted[sorted.length - 1];
  const analysis = latest.analysisJson || {};
  const report = analysis.relationshipReport || {};

  const flagLabels = (items) => (Array.isArray(items) ? items : [])
    .map((flag) => (typeof flag === 'string' ? flag : flag?.label))
    .filter(Boolean);

  const repeatedRedFlags = [...new Set(sorted.flatMap((item) => flagLabels(
    item.analysisJson?.relationshipReport?.redFlags || item.analysisJson?.improvedRedFlags || item.analysisJson?.redFlags,
  )))].slice(0, 8);
  const repeatedGreenFlags = [...new Set(sorted.flatMap((item) => flagLabels(
    item.analysisJson?.relationshipReport?.greenFlags || item.analysisJson?.improvedGreenFlags || item.analysisJson?.greenFlags,
  )))].slice(0, 8);
  const compat = sorted.map((item) => item.compatibilityScore || 0);

  // Deliberately lean: the coach answers FROM THE REPORT, so it only needs the
  // latest report's conclusions plus what repeats across the chain. The old
  // shape resent every report's full summary/advice/flags on every message,
  // which multiplied input tokens for no extra insight.
  return {
    chainId: chain.chainId,
    personName: chain.personName,
    relationshipType: chain.relationshipType,
    reportCount: sorted.length,
    dateRange: `${sorted[0].dateRange || 'Unknown'} → ${latest.dateRange || 'Unknown'}`,
    latestSummary: report.summaryParagraph || analysis.summary?.relationshipOverview || latest.mainDynamic,
    latestReport: {
      overallDynamic: report.overallDynamic || latest.mainDynamic,
      emotionalTone: report.emotionalTone || latest.emotionalTrend,
      timelineArc: report.timelineArc || '',
      nextBestMove: report.nextBestMove || analysis.advice?.nextBestStep || '',
      compatibility: latest.compatibilityScore,
      energyMatch: report.energyMatchScore?.score ?? analysis.energyMatchScore?.score,
      redFlags: (report.redFlags || analysis.redFlags || []).slice(0, 4)
        .map((flag) => ({ label: flag?.label, whyItMatters: flag?.whyItMatters })),
      greenFlags: (report.greenFlags || analysis.greenFlags || []).slice(0, 4)
        .map((flag) => ({ label: flag?.label, whyItMatters: flag?.whyItMatters })),
    },
    // Facts the other person revealed about themselves, each already quote-backed.
    personFacts: (analysis.personProfile?.items || []).slice(0, 12)
      .map((item) => ({ category: item.category, fact: item.fact })),
    repeatedRedFlags,
    repeatedGreenFlags,
    compatibilityMovement: compat.length > 1 ? compat[compat.length - 1] - compat[0] : 0,
    emotionalTrendAcrossReports: sorted.map((item) => item.emotionalTrend).filter(Boolean).join(' → ') || latest.emotionalTrend,
    bestieContextSummary: latest.bestieContextSummary || analysis.bestieContextSummary,
    reportSummaryForFutureUse: latest.reportSummaryForFutureUse || analysis.reportSummaryForFutureUse,
    mainUserPersonalitySignals: latest.mainUserPersonalitySignals || analysis.mainUserPersonalitySignals,
    languageProfile: latest.preparedConversation?.languageProfile || analysis.detectedLanguageStyle || null,
    languageStyle: latest.preparedConversation?.languageProfile?.recommendedOutputStyle
      || analysis.detectedLanguageStyle?.recommendedOutputStyle
      || 'English',
  };
}
