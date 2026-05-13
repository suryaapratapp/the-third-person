const REPORTS_KEY = 'thirdperson_relationship_reports';

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
    mainDynamic: recap.mainDynamic || analysis.summary?.currentDynamic || 'Relationship pattern available',
    compatibilityScore: recap.compatibilityScore || analysis.scores?.compatibility || 0,
    emotionalTrend: recap.emotionalTrend || 'Mixed',
    participants: preparedConversation?.participants || preparedConversation?.participantNames || analysis.participants?.detectedParticipants || [],
    messageCount: preparedConversation?.messageCount || 0,
    analysisJson: analysis,
    preparedConversation,
    chainId,
  };
  const reports = readReports().filter((item) => item.analysisId !== report.analysisId);
  reports.unshift(report);
  writeReports(reports.slice(0, 80));
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
  const repeatedRedFlags = [...new Set(sorted.flatMap((report) => (report.analysisJson?.improvedRedFlags || report.analysisJson?.redFlags || []).map((flag) => flag.label)).filter(Boolean))].slice(0, 8);
  const repeatedGreenFlags = [...new Set(sorted.flatMap((report) => (report.analysisJson?.improvedGreenFlags || report.analysisJson?.greenFlags || []).map((flag) => flag.label)).filter(Boolean))].slice(0, 8);
  const turningPoints = sorted.flatMap((report) => report.analysisJson?.turningPoints || []).slice(-8);
  const compat = sorted.map((report) => report.compatibilityScore || report.analysisJson?.scores?.compatibility || 0);
  const movement = compat.length > 1 ? compat[compat.length - 1] - compat[0] : 0;
  return {
    chainId: chain.chainId,
    personName: chain.personName,
    relationshipType: chain.relationshipType,
    platform: chain.platform,
    reportCount: sorted.length,
    dateRange: `${sorted[0].dateRange || 'Unknown'} → ${latest.dateRange || 'Unknown'}`,
    latestSummary: latest.analysisJson?.simpleSummaryForYoungAudience || latest.mainDynamic,
    compatibilityMovement: movement,
    emotionalTrendAcrossReports: sorted.map((report) => report.emotionalTrend).filter(Boolean).join(' → ') || latest.emotionalTrend,
    repeatedRedFlags,
    repeatedGreenFlags,
    turningPoints,
    dayNightDynamics: latest.analysisJson?.dayNightDynamics,
    personalitySnapshot: latest.analysisJson?.personalitySnapshot,
    energyMatch: latest.analysisJson?.energyMatchScore,
    mixedSignals: latest.analysisJson?.mixedSignalsMap,
    zodiacCompatibility: latest.analysisJson?.zodiacCompatibility || latest.preparedConversation?.metadata?.zodiacCompatibility,
    participants: latest.participants,
    messageCount: sorted.reduce((sum, report) => sum + (report.messageCount || 0), 0),
    languageStyle: latest.preparedConversation?.topWords?.some((item) => /hai|nahi|kyu|haan|yaar|mat|kar/i.test(item.word)) ? 'Hinglish / Indian English' : 'English',
    compressedReports: sorted.map((report) => ({
      dateAnalysed: report.dateAnalysed,
      dateRange: report.dateRange,
      mainDynamic: report.mainDynamic,
      emotionalTrend: report.emotionalTrend,
      compatibilityScore: report.compatibilityScore,
      summary: report.analysisJson?.summary,
      advice: report.analysisJson?.advice,
      bestieBreakdown: report.analysisJson?.bestieBreakdown,
      redFlags: (report.analysisJson?.improvedRedFlags || report.analysisJson?.redFlags || []).slice(0, 4),
      greenFlags: (report.analysisJson?.improvedGreenFlags || report.analysisJson?.greenFlags || []).slice(0, 4),
    })),
  };
}
