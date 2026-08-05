import { PiWarning } from 'react-icons/pi';
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
import { runRazorpayCheckout } from '../lib/paymentsService.js';
import { useAuth } from '../state/AuthContext.jsx';
import RotatingQuote from './RotatingQuote.jsx';
import UsageWarningModal from './UsageWarningModal.jsx';
import { useRouter } from '../state/RouterContext.jsx';
import {
  fetchRelationshipReportById,
  fetchRemotePersonality,
  rowToReport,
  saveRelationshipPersonalityCardToSupabase,
} from '../lib/supabaseDataService.js';

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
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [processingStage, setProcessingStage] = useState('');
  const [creditBlock, setCreditBlock] = useState(null);
  const [isPaying, setIsPaying] = useState(false);
  const [entitlements, setEntitlements] = useState(null);
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
    const reportId = reportRecord?.analysisId || null;
    saveCachedAnalysis(fingerprintData, { reportId });
    updateFlow({
      promptScan: scan,
      preparedConversation,
      analysisResult,
      analysisError,
      sensitiveData,
      cacheNotice: '',
      reportSource: reportId,
    });
    setIsGenerating(false);
    setProcessingStage('');
    // Deep-link to the persisted report so a refresh or shared link re-fetches
    // it. Fall back to the in-memory route only when no id exists (local/offline
    // save with no Supabase row).
    onStart(reportId ? `/reports/${encodeURIComponent(reportId)}` : '/analysis/result');
  }

  async function startAnalysis() {
    setIsGenerating(true);
    setAnalysisError('');
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
            reportSource: cached.reportId,
          });
          setIsGenerating(false);
          setProcessingStage('');
          onStart(`/reports/${encodeURIComponent(cached.reportId)}`);
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
      userStatus: 'paid',
      paidCredits: {
        relationshipReportsLeft: latestEntitlements.paidRelationshipReportsLeft,
        bestieChatsLeft: latestEntitlements.paidBestieChatsLeft,
      },
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
    // relationshipReportsLeft counts paid credits plus any legacy free credit
    // still held by early users (the free offer has since been withdrawn).
    // Know Yourself and Coach gate on paid-only balances elsewhere.
    if (latestEntitlements.relationshipReportsLeft > 0) {
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
    } else {
      // No credits: take payment right here instead of bouncing the user to the
      // pricing page and losing the conversation they just prepared.
      setIsGenerating(false);
      setProcessingStage('');
      if (!user) {
        navigate('/auth?next=/analysis/new');
        return;
      }
      setAnalysisError('');
      setIsPaying(true);
      try {
        await runRazorpayCheckout({
          reportCount: 1,
          packId: 'report_only',
          user,
          description: `Relationship Report for ${flow.personName || 'this conversation'}`,
        });
        setIsPaying(false);
        setEntitlements(await fetchUsageEntitlements());
        // Payment succeeded — run the analysis they already asked for.
        await startAnalysis();
      } catch (paymentError) {
        setIsPaying(false);
        if (!paymentError.cancelled) {
          setAnalysisError(paymentError.message || 'Payment could not be completed. Please try again.');
        }
      }
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
  // Warn before a credit is spent, so a thin upload is a choice rather than a
  // surprise about how hedged the resulting report has to be.
  const sampleWarning = (() => {
    if (!reviewPrep) return '';
    const count = reviewPrep.parsed.messageCount || 0;
    if (count && count < 10) return `Only ${count} message${count === 1 ? '' : 's'} detected. The report will be a directional first impression rather than a confident analysis — a longer export gives much stronger insight.`;
    if (reviewPrep.parsed.parseConfidence === 'low') return 'The chat format was hard to read, so participants and dates were estimated. A raw export from the app (.txt or .zip) gives far better results.';
    if (reviewPrep.parsed.participants.length < 2) return 'Only one participant was detected, so effort and reciprocity patterns may be unreliable. Check that the export includes both sides of the conversation.';
    return '';
  })();

  return (
    <div className="relative grid gap-5 lg:grid-cols-[1fr_380px]">
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
          {/* Only the live `processingStage` is shown. There used to be four
              more lines under it — "Mapping conversation phases", "Creating
              clarity notes" and so on — which were static text dressed up as a
              progress checklist and never changed state. An indeterminate bar
              is the honest signal when there is no real per-step progress. */}
          <div className="accent-panel w-full max-w-md p-6 text-center sm:p-7">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-purple-200/40 bg-purple-300/10">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-purple-200 border-t-transparent" />
            </div>
            <h3 id="analysis-progress-heading" className="serif-title mt-5 text-3xl leading-tight sm:text-4xl">
              Reading your conversation…
            </h3>
            <p className="mt-3 min-h-[3rem] text-sm leading-6 text-smoke">
              {processingStage || 'Preparing private relationship intelligence…'}
            </p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="analysis-progress h-full w-1/3 rounded-full accent-gradient" />
            </div>
            <p className="mt-4 text-xs leading-6 text-ash">
              This usually takes under two minutes. Keep this tab open.
            </p>
            <div className="mt-5 border-t border-white/10 pt-5">
              <RotatingQuote />
            </div>
          </div>
        </div>
      )}
      <div className="thin-panel p-4 sm:p-5">
        <p className="tech-label text-smoke">What will be analysed</p>
        <dl className="mt-4 divide-y divide-white/10">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 py-3">
              <dt className="text-sm text-ash">{label}</dt>
              <dd className="max-w-[58%] text-right text-sm text-bone">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid gap-4">
        {sampleWarning && (
          <div className="flex gap-3 rounded-[20px] border border-orange-200/25 bg-orange-300/[0.07] p-4">
            <PiWarning className="mt-0.5 shrink-0 text-lg text-orange-100" aria-hidden="true" />
            <p className="text-sm leading-6 text-smoke">{sampleWarning}</p>
          </div>
        )}

        {/* The price, or the balance, stated plainly right above the button that
            spends it — this used to be one of four small boxes of prose. */}
        <div className="rounded-[20px] border border-white/12 bg-white/[0.04] p-4">
          {!entitlements ? (
            <p className="text-sm leading-6 text-smoke">Checking your balance…</p>
          ) : entitlements.relationshipReportsLeft > 0 ? (
            <p className="text-sm leading-6 text-smoke">
              This uses <span className="text-bone">1 of your {entitlements.relationshipReportsLeft}</span> report
              credit{entitlements.relationshipReportsLeft === 1 ? '' : 's'}, and leaves{' '}
              <span className="text-bone">{entitlements.paidBestieChatsLeft}</span> coach chats available.
            </p>
          ) : (
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm leading-6 text-smoke">Secure checkout opens when you start.</p>
              <p className="serif-title shrink-0 text-3xl leading-none text-bone">₹199</p>
            </div>
          )}
        </div>

        <button
          disabled={!canStart || isGenerating || isPaying}
          onClick={startAnalysis}
          className="btn btn-primary min-h-[52px] w-full text-sm disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isGenerating ? 'Preparing analysis…' : isPaying ? 'Opening checkout…' : 'Start analysis'}
        </button>

        {analysisError && (
          <p className="rounded-[16px] border border-orange-200/25 bg-orange-300/[0.07] p-3 text-sm leading-6 text-orange-100">
            {analysisError}
          </p>
        )}
        {!canStart && (
          <p className="text-center text-xs leading-6 text-ash">
            Finish every step and add a conversation before starting.
          </p>
        )}
        <p className="text-center text-xs leading-6 text-ash">
          One conversation produces your report and updates your Know Yourself profile.
        </p>
      </div>
    </div>
  );
}
