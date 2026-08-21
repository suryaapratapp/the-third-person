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
import UsageWarningModal from './UsageWarningModal.jsx';
import AnalysisProgress from './AnalysisProgress.jsx';
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

// Stage KEYS, not prose. The progress bar used to infer its stage by pattern
// matching the sentence shown to the user, which broke silently the moment a
// sentence was added that matched none of its patterns — the bar sat at 34%
// for the whole model call and then jumped straight to a finished report.
function progressStageForRoute(route) {
  if (route === 'chunked_synthesis') return 'periods';
  if (route === 'long_async_ready') return 'slice';
  return 'slice';
}

export default function ReviewAnalysisStep({ flow, updateFlow, onStart }) {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [processingStage, setProcessingStage] = useState('read');
  // Where to go once the progress bar has finished running to 100%. Holding the
  // route here rather than navigating immediately is what lets the wait end on
  // a completed bar instead of cutting away mid-count.
  const [finishedRoute, setFinishedRoute] = useState('');
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
    // Deep-link to the persisted report so a refresh or shared link re-fetches
    // it. Fall back to the in-memory route only when no id exists (local/offline
    // save with no Supabase row).
    //
    // Handed to the progress bar rather than navigated to now: it finishes its
    // count to 100 and then calls back. The overlay stays up until it does.
    setFinishedRoute(reportId ? `/reports/${encodeURIComponent(reportId)}` : '/analysis/result');
  }

  async function startAnalysis() {
    setIsGenerating(true);
    setAnalysisError('');
    setFinishedRoute('');
    setProcessingStage('read');
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
          // Instant, but still ridden to 100% by the progress bar. A cached
          // hit that flashed the overlay for one frame looked like a glitch.
          setFinishedRoute(`/reports/${encodeURIComponent(cached.reportId)}`);
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
      // This one call is the whole model run — a minute or more with nothing
      // to report from inside it. The bar advances on its own from here.
      setProcessingStage('periods');
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
        setProcessingStage('read');
        return;
      }
      if (!backendResult?.analysis || !backendResult?.report) {
        setAnalysisError('Paid relationship intelligence is temporarily unavailable. Please try again in a moment.');
        setIsGenerating(false);
        setProcessingStage('read');
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
      setProcessingStage('read');
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
    <div className="relative grid items-start gap-4 lg:grid-cols-[1fr_320px]">
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
        <AnalysisProgress
          stageKey={processingStage}
          done={Boolean(finishedRoute)}
          onFinished={() => {
            setIsGenerating(false);
            setProcessingStage('read');
            onStart(finishedRoute);
          }}
          messageCount={flow?.preparedConversation?.messageCount || 0}
        />
      )}

      <div className="rounded-lg border border-line bg-paper p-4 sm:p-5">
        <p className="tech-label">What will be analysed</p>
        <dl className="mt-4 divide-y divide-line">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 py-3">
              <dt className="text-sm text-ash">{label}</dt>
              <dd className="max-w-[58%] text-right text-sm text-bone">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* `content-start` is doing real work here. Without it the grid stretches
          its rows to match the tall summary column beside it, and the primary
          button inflated to about 200px of solid indigo with the label floating
          in the middle of it. */}
      <div className="grid content-start gap-3">
        {sampleWarning && (
          <div className="flex gap-2.5 rounded-lg border border-warn/40 bg-warn/10 p-3">
            <PiWarning className="mt-0.5 shrink-0 text-base text-warn" aria-hidden="true" />
            <p className="text-sm leading-6 text-smoke">{sampleWarning}</p>
          </div>
        )}

        {/* Price and action in one card. They were two boxes and three lines of
            explanatory prose; the only question at this point is "what does it
            cost and where do I press". */}
        <div className="rounded-lg border border-line bg-paper p-4">
          {!entitlements ? (
            <p className="text-sm leading-6 text-smoke">Checking your balance…</p>
          ) : entitlements.relationshipReportsLeft > 0 ? (
            <p className="text-sm leading-6 text-smoke">
              Uses <span className="font-semibold text-bone">1 of {entitlements.relationshipReportsLeft}</span> report
              credit{entitlements.relationshipReportsLeft === 1 ? '' : 's'} · {entitlements.paidBestieChatsLeft} coach chats left
            </p>
          ) : (
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm text-smoke">Secure checkout</p>
              <p className="shrink-0 text-2xl font-semibold leading-none text-bone">₹199</p>
            </div>
          )}

          <button
            disabled={!canStart || isGenerating || isPaying}
            onClick={startAnalysis}
            className="btn btn-primary mt-3 w-full"
          >
            {isGenerating ? 'Preparing analysis…' : isPaying ? 'Opening checkout…' : 'Start analysis'}
          </button>

          {!canStart && (
            <p className="mt-2 text-center text-xs leading-5 text-ash">
              Finish every step and add a conversation first.
            </p>
          )}
        </div>

        {analysisError && (
          <p className="rounded-lg border border-risk/40 bg-risk/10 p-3 text-sm leading-6 text-risk">
            {analysisError}
          </p>
        )}
      </div>
    </div>
  );
}
