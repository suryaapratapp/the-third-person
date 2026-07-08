import { detectPromptInjection } from '../lib/promptInjectionFilter.js';
import { parseConversationText, prepareConversationForAnalysis } from '../lib/conversationPreprocessor.js';
import { generateRelationshipAnalysis } from '../lib/relationshipAnalysisEngine.js';
import { useEffect, useMemo, useState } from 'react';
import { filterSensitiveData } from '../lib/sensitiveDataFilter.js';
import { createConversationFingerprint, findCachedAnalysis, removeCachedAnalysis, saveCachedAnalysis } from '../lib/conversationFingerprint.js';
import { getUserProfile } from '../lib/profileStore.js';
import { buildZodiacCompatibility, getZodiacElement, getZodiacGlyph, getZodiacSign } from '../lib/zodiac.js';
import { generateRelationshipReportViaSupabase } from '../lib/backendAiService.js';
import { fetchUsageEntitlements } from '../lib/creditsService.js';
import RotatingQuote from './RotatingQuote.jsx';
import UsageWarningModal from './UsageWarningModal.jsx';
import { useRouter } from '../state/RouterContext.jsx';
import { generateFreeRelationshipAnalysisViaPuter } from '../lib/puterFreeAiService.js';
import {
  fetchRelationshipReportById,
  fetchRemotePersonality,
  rowToReport,
  saveRelationshipPersonalityCardToSupabase,
  saveRelationshipReportToSupabase,
  upsertPersonalityMemoryFromAnalysis,
} from '../lib/supabaseDataService.js';
import { ensurePuterReady, ensurePuterSignedInFromUserGesture } from '../lib/puterAuthService.js';

function mergeAnalysisFallback(fallback, candidate) {
  if (!candidate || typeof candidate !== 'object') return fallback;
  return {
    ...fallback,
    ...candidate,
    summary: { ...fallback.summary, ...(candidate.summary || {}) },
    scores: { ...fallback.scores, ...(candidate.scores || {}) },
    engagementAnalysis: { ...fallback.engagementAnalysis, ...(candidate.engagementAnalysis || {}) },
    communicationPatterns: { ...fallback.communicationPatterns, ...(candidate.communicationPatterns || {}) },
    bestieBreakdown: { ...fallback.bestieBreakdown, ...(candidate.bestieBreakdown || {}) },
    energyMatchScore: { ...fallback.energyMatchScore, ...(candidate.energyMatchScore || {}) },
    mixedSignalsMap: { ...fallback.mixedSignalsMap, ...(candidate.mixedSignalsMap || {}) },
    attachmentVibe: { ...fallback.attachmentVibe, ...(candidate.attachmentVibe || {}) },
    friendsWouldNotice: { ...fallback.friendsWouldNotice, ...(candidate.friendsWouldNotice || {}) },
    communicationStyleSignals: { ...fallback.communicationStyleSignals, ...(candidate.communicationStyleSignals || {}) },
    personalityCardViral: { ...fallback.personalityCardViral, ...(candidate.personalityCardViral || {}) },
    personality: {
      user: { ...fallback.personality.user, ...(candidate.personality?.user || {}) },
      otherPerson: { ...fallback.personality.otherPerson, ...(candidate.personality?.otherPerson || {}) },
    },
    wordCloud: { ...fallback.wordCloud, ...(candidate.wordCloud || {}) },
    advice: { ...fallback.advice, ...(candidate.advice || {}) },
    personalitySnapshot: { ...fallback.personalitySnapshot, ...(candidate.personalitySnapshot || {}) },
    conversationRecap: { ...fallback.conversationRecap, ...(candidate.conversationRecap || {}) },
    participants: { ...fallback.participants, ...(candidate.participants || {}) },
    dayNightDynamics: { ...fallback.dayNightDynamics, ...(candidate.dayNightDynamics || {}) },
    timeline: Array.isArray(candidate.timeline) && candidate.timeline.length ? candidate.timeline : fallback.timeline,
    sentimentStoryboard: Array.isArray(candidate.sentimentStoryboard) && candidate.sentimentStoryboard.length ? candidate.sentimentStoryboard : fallback.sentimentStoryboard,
    redFlags: Array.isArray(candidate.redFlags) && candidate.redFlags.length ? candidate.redFlags : fallback.redFlags,
    greenFlags: Array.isArray(candidate.greenFlags) && candidate.greenFlags.length ? candidate.greenFlags : fallback.greenFlags,
    improvedRedFlags: Array.isArray(candidate.improvedRedFlags) && candidate.improvedRedFlags.length ? candidate.improvedRedFlags : fallback.improvedRedFlags,
    improvedGreenFlags: Array.isArray(candidate.improvedGreenFlags) && candidate.improvedGreenFlags.length ? candidate.improvedGreenFlags : fallback.improvedGreenFlags,
    relationshipSpecificInsights: Array.isArray(candidate.relationshipSpecificInsights) && candidate.relationshipSpecificInsights.length ? candidate.relationshipSpecificInsights : fallback.relationshipSpecificInsights,
    turningPoints: Array.isArray(candidate.turningPoints) && candidate.turningPoints.length ? candidate.turningPoints : fallback.turningPoints,
    simpleSummaryForYoungAudience: candidate.simpleSummaryForYoungAudience || fallback.simpleSummaryForYoungAudience,
    screenshotWorthySummary: candidate.screenshotWorthySummary || fallback.screenshotWorthySummary,
  };
}

function progressStageForRoute(route) {
  if (route === 'chunked_synthesis') return 'Understanding each conversation period…';
  if (route === 'long_async_ready') return 'Preparing a deeper long-chat report…';
  return 'Preparing private relationship intelligence…';
}

export default function ReviewAnalysisStep({ flow, updateFlow, onStart }) {
  const { navigate } = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [processingStage, setProcessingStage] = useState('');
  const [creditBlock, setCreditBlock] = useState(null);
  const [entitlements, setEntitlements] = useState(null);
  const [pendingFreeAnalysis, setPendingFreeAnalysis] = useState(null);
  const [secureSignInMessage, setSecureSignInMessage] = useState('');
  const reviewPrep = useMemo(() => {
    if (!flow.chatText.trim()) return null;
    const sensitive = filterSensitiveData(flow.chatText);
    const parsed = parseConversationText(sensitive.protectedText, flow.platform || 'Chat');
    return { sensitive, parsed };
  }, [flow.chatText, flow.platform]);
  const userProfile = useMemo(() => getUserProfile(), []);
  const userZodiac = getZodiacSign(userProfile.dateOfBirth);
  const otherZodiac = getZodiacSign(flow.otherPersonDateOfBirth);
  const aiUserProfile = useMemo(() => ({
    firstName: userProfile.firstName,
    lastName: userProfile.lastName,
    genderIdentity: userProfile.genderIdentity,
    preferredLanguageTone: userProfile.preferredLanguageTone,
    preferredAnalysisLanguages: userProfile.preferredAnalysisLanguages || [],
    zodiacSign: userZodiac,
    zodiacElement: getZodiacElement(userZodiac),
  }), [userProfile, userZodiac]);
  const estimatedSize = flow.chatText ? `${flow.chatText.length.toLocaleString()} characters` : 'No conversation text detected';
  const rows = [
    ['Platform', flow.platform || 'Not selected'],
    ['Relationship', flow.relationshipType || 'Not selected'],
    ['Person', flow.personName || 'Not entered'],
    ['Source', flow.sourceMode === 'upload' ? flow.fileName || 'Uploaded file pending' : 'Pasted conversation'],
    ['Conversation size', estimatedSize],
    ['Participants detected', reviewPrep?.parsed.participants.join(', ') || 'Not enough data yet'],
    ['Date range detected', reviewPrep?.parsed.dateRange || 'Not enough data yet'],
    ['Message count', reviewPrep?.parsed.messageCount?.toLocaleString() || '0'],
    ['Zodiac layer', [userZodiac && `You: ${getZodiacGlyph(userZodiac)} ${userZodiac}`, otherZodiac && `${flow.personName || 'Other'}: ${getZodiacGlyph(otherZodiac)} ${otherZodiac}`].filter(Boolean).join(' • ') || 'Optional'],
  ];

  useEffect(() => {
    let mounted = true;
    fetchUsageEntitlements().then((result) => {
      if (mounted) setEntitlements(result);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!entitlements || entitlements.hasPaidPack || entitlements.freeAnalysesRemaining <= 0) return;
    ensurePuterReady();
  }, [entitlements]);

  function finishSuccessfulAnalysis({
    fallbackAnalysis,
    aiAnalysis,
    preparedConversation,
    fingerprintData,
    scan,
    sensitiveData,
    reportRecord = null,
    analysisError = '',
  }) {
    const analysisResult = mergeAnalysisFallback(fallbackAnalysis, aiAnalysis);
    saveCachedAnalysis(fingerprintData, { reportId: reportRecord?.analysisId });
    updateFlow({
      promptScan: scan,
      preparedConversation,
      analysisResult,
      analysisError,
      sensitiveData,
      cacheNotice: '',
    });
    setIsGenerating(false);
    setProcessingStage('');
    setPendingFreeAnalysis(null);
    setSecureSignInMessage('');
    onStart('/analysis/result');
  }

  async function continueSecureFreeAnalysis() {
    if (!pendingFreeAnalysis) return;
    setIsGenerating(true);
    setAnalysisError('');
    setSecureSignInMessage('');
    setProcessingStage('Opening secure analysis sign-in…');

    const ready = await ensurePuterSignedInFromUserGesture();
    if (!ready.ok) {
      setIsGenerating(false);
      setProcessingStage('');
      setSecureSignInMessage('Safari may block sign-in windows unless they are opened directly from a tap. Tap Open Sign-In below to continue securely. If nothing opens, check Safari pop-up settings and try again.');
      setAnalysisError(ready.error || 'Secure analysis sign-in could not open. Please try again.');
      return;
    }

    try {
      setProcessingStage('Creating your free relationship analysis…');
      const freeAnalysis = await generateFreeRelationshipAnalysisViaPuter({
        preparedConversation: pendingFreeAnalysis.preparedConversation,
        promptScan: pendingFreeAnalysis.scan,
        sensitiveData: pendingFreeAnalysis.sensitiveData,
        userProfile: aiUserProfile,
        analysisDraft: pendingFreeAnalysis.fallbackAnalysis,
        runtimeContext: pendingFreeAnalysis.runtimeContext,
      });
      const markedFreeAnalysis = {
        ...freeAnalysis,
        providerMode: 'free',
        generationTier: 'free_relationship_analysis',
        freeAnalysisNotice: '',
      };
      const savedReport = await saveRelationshipReportToSupabase({
        analysis: markedFreeAnalysis,
        preparedConversation: pendingFreeAnalysis.preparedConversation,
      });
      await upsertPersonalityMemoryFromAnalysis({
        analysis: markedFreeAnalysis,
        reportId: savedReport?.analysisId,
      });
      finishSuccessfulAnalysis({
        ...pendingFreeAnalysis,
        aiAnalysis: markedFreeAnalysis,
        reportRecord: savedReport,
      });
    } catch (error) {
      setIsGenerating(false);
      setProcessingStage('');
      setAnalysisError(error.message || 'Secure analysis could not complete. Please try again.');
      setSecureSignInMessage('We could not complete the secure analysis. Please try again from the button below so the sign-in window can open from your tap.');
    }
  }

  async function startAnalysis({ skipUsageCheck = false } = {}) {
    setIsGenerating(true);
    setAnalysisError('');
    setProcessingStage(skipUsageCheck ? 'Preparing private relationship intelligence…' : 'Checking secure analysis access…');
    setProcessingStage('Preparing private relationship intelligence…');
    const sensitiveData = filterSensitiveData(flow.chatText);
    const scan = detectPromptInjection(sensitiveData.protectedText);
    const preparedConversationBase = prepareConversationForAnalysis(scan.cleanedText, {
      platform: flow.platform,
      relationshipType: flow.relationshipType,
      personName: flow.personName,
    });
    const zodiacCompatibility = buildZodiacCompatibility({
      userSign: userZodiac,
      otherSign: otherZodiac,
      conversationPattern: preparedConversationBase.importantMoments?.[0]?.message || preparedConversationBase.compressedConversation?.slice(0, 160),
    });
    const preparedConversation = {
      ...preparedConversationBase,
      metadata: {
        ...preparedConversationBase.metadata,
        userProfile: aiUserProfile,
        otherPersonZodiac: {
          sign: otherZodiac,
          element: getZodiacElement(otherZodiac),
          glyph: getZodiacGlyph(otherZodiac),
        },
        zodiacCompatibility,
      },
    };
    setProcessingStage(progressStageForRoute(preparedConversation.analysisPipeline?.route));
    const fingerprintData = await createConversationFingerprint({
      platform: flow.platform,
      relationshipType: flow.relationshipType,
      personName: flow.personName,
      parsedMessages: preparedConversation.parsedMessages,
      rawText: preparedConversation.cleanedText,
    });
    const cached = findCachedAnalysis(fingerprintData);
    if (cached?.reportId) {
      const cachedReport = await fetchRelationshipReportById(cached.reportId);
      if (!cachedReport) {
        removeCachedAnalysis(cached.fingerprint);
      } else {
        const cachedPreparedConversation = cachedReport.preparedConversation || preparedConversation;
        const cachedAnalysisResult = cachedReport.analysisJson || null;
        const hasPreparedConversation = cachedPreparedConversation && Object.keys(cachedPreparedConversation).length;
        if (cachedAnalysisResult && Object.keys(cachedAnalysisResult).length && hasPreparedConversation) {
          updateFlow({
            promptScan: scan,
            preparedConversation: cachedPreparedConversation,
            analysisResult: cachedAnalysisResult,
            sensitiveData,
            cacheNotice: 'We found an existing report for this conversation and opened it instantly.',
            analysisError: '',
          });
          setIsGenerating(false);
          setProcessingStage('');
          onStart('/analysis/result');
          return;
        }
        removeCachedAnalysis(cached.fingerprint);
      }
    }
    const fallbackAnalysis = generateRelationshipAnalysis({
      preparedConversation,
      promptRiskLevel: scan.riskLevel,
    });

    const latestEntitlements = await fetchUsageEntitlements();
    const previousPersonalityMemory = await fetchRemotePersonality();
    setEntitlements(latestEntitlements);
    const runtimeContext = {
      selectedRelationshipType: flow.relationshipType,
      selectedMessagingApp: flow.platform,
      selectedPersonName: flow.personName,
      mainUserProfileDetails: aiUserProfile,
      selectedProfileLanguages: aiUserProfile.preferredAnalysisLanguages || [],
      userStatus: latestEntitlements.hasPaidPack ? 'paid' : 'free',
      paidCredits: {
        relationshipReportsLeft: latestEntitlements.paidRelationshipReportsLeft,
        bestieChatsLeft: latestEntitlements.paidBestieChatsLeft,
      },
      freeAnalysesUsed: latestEntitlements.freeAnalysesUsed,
      freeAnalysesRemaining: latestEntitlements.freeAnalysesRemaining,
      languageProfile: preparedConversation.languageProfile,
      detectedLanguageStyle: preparedConversation.languageStyle || 'Mixed / inferred from chat',
      participants: preparedConversation.participants || preparedConversation.participantNames,
      dateRange: preparedConversation.estimatedDateRange,
      messageCount: preparedConversation.messageCount,
      senderStats: preparedConversation.senderStats,
      dayNightConversationPatterns: preparedConversation.dailyNightBreakdown,
      sensitiveDataSummary: sensitiveData.protectionSummary,
      importantMoments: preparedConversation.importantMoments,
      topWords: preparedConversation.topWords,
      previousPersonalityCardSummary: previousPersonalityMemory?.personality_json || null,
      previousPersonalityMemory: previousPersonalityMemory ? {
        personality: previousPersonalityMemory.personality_json,
        emotionalLifeStory: previousPersonalityMemory.emotional_life_story,
        recurringWords: previousPersonalityMemory.recurring_words,
      } : null,
    };

    let aiResult = null;
    if (latestEntitlements.paidRelationshipReportsLeft > 0) {
      setProcessingStage(
        preparedConversation.analysisPipeline?.route === 'single_compressed'
          ? 'Creating paid relationship intelligence…'
          : 'Combining timeline signals into your report…',
      );
      const backendResult = await generateRelationshipReportViaSupabase({
        preparedConversation,
        promptScan: scan,
        sensitiveData,
        userProfile: aiUserProfile,
        previousPersonalityMemory,
        analysisDraft: fallbackAnalysis,
        runtimeContext,
      }).catch((error) => {
        if (error.code === 'OUT_OF_CREDITS') {
          setCreditBlock('report');
        }
        return { blocked: true, error: error.message || 'You’re out of Relationship Reports. Top up to generate more relationship intelligence summaries.' };
      });
      if (backendResult?.blocked) {
        setAnalysisError(backendResult.error);
        setIsGenerating(false);
        setProcessingStage('');
        return;
      }
      if (!backendResult?.analysis || !backendResult?.report) {
        setAnalysisError('Paid relationship intelligence is temporarily unavailable. Please try again in a moment.');
        setIsGenerating(false);
        setProcessingStage('');
        return;
      }
      aiResult = {
        analysis: { ...backendResult.analysis, providerMode: 'paid' },
        reportRecord: rowToReport(backendResult.report),
        error: '',
      };
      await saveRelationshipPersonalityCardToSupabase({
        analysis: aiResult.analysis,
        report: aiResult.reportRecord,
        preparedConversation,
      });
    } else if (!latestEntitlements.hasPaidPack && latestEntitlements.freeAnalysesRemaining > 0) {
      setPendingFreeAnalysis({
        preparedConversation,
        scan,
        sensitiveData,
        fallbackAnalysis,
        runtimeContext,
        fingerprintData,
      });
      setSecureSignInMessage('');
      setIsGenerating(false);
      setProcessingStage('');
      return;
    } else {
      setCreditBlock('report');
      setAnalysisError('You’re out of Relationship Reports. Top up to generate more relationship intelligence summaries.');
      setIsGenerating(false);
      setProcessingStage('');
      return;
    }

    finishSuccessfulAnalysis({
      fallbackAnalysis,
      aiAnalysis: aiResult.analysis,
      preparedConversation,
      fingerprintData,
      scan,
      sensitiveData,
      reportRecord: aiResult.reportRecord,
      analysisError: aiResult.error || '',
    });
  }

  const canStart = flow.platform && flow.relationshipType && flow.personName.trim() && flow.chatText.trim().length > 10;

  return (
    <div className="relative grid gap-6 lg:grid-cols-[1fr_360px]">
      {creditBlock && (
        <UsageWarningModal
          feature="report"
          status="exhausted"
          onPlans={() => navigate('/pricing?reason=usage-limit')}
          onBack={() => navigate('/reports')}
          onContinue={() => setCreditBlock(null)}
        />
      )}
      {isGenerating && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 px-4 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-labelledby="analysis-progress-heading"
          aria-live="polite"
        >
          <div className="accent-panel max-w-lg p-7 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-purple-200/40 bg-purple-300/10">
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-purple-200 border-t-transparent" />
            </div>
            <h3 id="analysis-progress-heading" className="serif-title mt-6 text-4xl">Preparing your private analysis…</h3>
            <div className="mt-5 space-y-2 font-mono text-xs uppercase tracking-[0.13em] text-smoke">
              <p>{processingStage || 'Preparing private relationship intelligence…'}</p>
              <p>Checking previous reports…</p>
              <p>Mapping conversation phases</p>
              <p>Creating clarity notes</p>
              <p>Building your relationship report</p>
            </div>
            <div className="mt-6 border-t border-white/10 pt-5">
              <RotatingQuote />
            </div>
          </div>
        </div>
      )}
      {pendingFreeAnalysis && !isGenerating && (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 px-4 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-labelledby="secure-signin-heading"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setPendingFreeAnalysis(null);
              setSecureSignInMessage('');
              setAnalysisError('');
            }
          }}
        >
          <div className="accent-panel max-w-lg p-7 text-center">
            <p className="tech-label text-smoke">ThirdPerson AI free analysis</p>
            <h3 id="secure-signin-heading" className="serif-title mt-5 text-4xl">Open secure analysis sign-in</h3>
            <p className="mt-5 text-sm leading-7 text-smoke">
              Safari may block sign-in windows unless they are opened directly from a tap. Tap the button below to continue securely.
            </p>
            {secureSignInMessage && <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-xs leading-6 text-smoke">{secureSignInMessage}</p>}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button onClick={continueSecureFreeAnalysis} className="glass-button px-5 py-4 font-mono text-xs uppercase tracking-[0.16em] text-bone">
                {secureSignInMessage ? 'Open Sign-In' : 'Continue to secure analysis'}
              </button>
              <button
                onClick={() => {
                  setPendingFreeAnalysis(null);
                  setSecureSignInMessage('');
                  setAnalysisError('');
                }}
                className="glass-button px-5 py-4 font-mono text-xs uppercase tracking-[0.16em] text-smoke"
              >
                Go back
              </button>
            </div>
            <p className="mt-5 text-xs leading-6 text-ash">If nothing opens, check Safari pop-up settings and try again.</p>
          </div>
        </div>
      )}
      <div className="thin-panel p-5">
        <p className="tech-label text-smoke">Review analysis package</p>
        <div className="mt-6 divide-y divide-white/10">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 py-4">
              <span className="text-sm text-ash">{label}</span>
              <span className="max-w-[60%] text-right text-sm text-bone">{value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="thin-panel p-5">
        <p className="tech-label text-bone">Before analysis</p>
        <p className="mt-4 text-sm leading-7 text-smoke">
          ThirdPerson AI prepares your conversation safely, protects sensitive details, checks conversation structure, and builds careful relationship insights from the chat you provide.
        </p>
        <p className="mt-4 rounded-2xl border border-pink-200/15 bg-pink-300/[0.045] p-3 text-sm leading-6 text-smoke">
          One conversation can generate your Relationship Report and update your Personality Card.
        </p>
        <p className="mt-4 border border-purple-300/15 bg-purple-300/5 p-3 font-mono text-xs uppercase tracking-[0.12em] text-smoke">
          Preparing secure analysis
        </p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-xs leading-6 text-smoke">
          {entitlements ? `${entitlements.paidRelationshipReportsLeft} paid Relationship Reports left • ${entitlements.paidBestieChatsLeft} paid Coach Chats left • ${entitlements.freeAnalysesRemaining} free analyses left` : 'Checking your credit balance…'}
        </div>
        <button
          disabled={!canStart || isGenerating}
          onClick={startAnalysis}
          className="glass-button mt-8 w-full px-5 py-4 font-mono text-xs uppercase tracking-[0.16em] text-bone disabled:cursor-not-allowed disabled:border-white/10 disabled:text-ash"
        >
          {isGenerating ? 'Preparing Analysis' : 'Start Analysis'}
        </button>
        {analysisError && <p className="mt-4 text-xs leading-6 text-smoke">{analysisError}</p>}
        {!canStart && <p className="mt-4 text-xs leading-6 text-ash">Complete every step and add at least a short conversation sample.</p>}
      </div>
    </div>
  );
}
