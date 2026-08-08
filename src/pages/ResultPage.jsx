import { useEffect, useMemo, useState } from 'react';
import CardActions from '../components/CardActions.jsx';
import { formatDuration } from '../lib/conversationMetrics.js';
import AfterReportActions from '../components/AfterReportActions.jsx';
import FloatingCoach from '../components/FloatingCoach.jsx';
import CoachDialog from '../components/CoachDialog.jsx';
import { buildAnalysisChainContext, getChainById, groupReports } from '../lib/reportsStore.js';
import QuickStats from '../components/QuickStats.jsx';
import RhythmHeatmap from '../components/RhythmHeatmap.jsx';
import ToneOverTime from '../components/ToneOverTime.jsx';
import { buildZodiacMatch } from '../lib/zodiac.js';
import { shareCardSummary } from '../lib/exportElementAsImage.js';
import { exportElementAsPdf, pdfFileName } from '../lib/exportPdf.js';
import { fetchRelationshipReportById, fetchRelationshipReports } from '../lib/supabaseDataService.js';
import { useAnalysis } from '../state/AnalysisContext.jsx';
import { useRouter } from '../state/RouterContext.jsx';

const emptyText = 'Not enough evidence yet';

// Mirrors FACT_CATEGORIES in supabase/functions/generate-relationship-report.
const FACT_CATEGORY_LABELS = {
  work_or_study: 'Work & study',
  interests_and_hobbies: 'Interests & hobbies',
  routines_and_habits: 'Routines & habits',
  places: 'Places',
  people_in_their_life: 'People in their life',
  plans_and_intentions: 'Plans & intentions',
  likes: 'Likes',
  dislikes: 'Dislikes',
  values_or_priorities: 'Values & priorities',
  stressors_or_pressures: 'Stressors & pressures',
};

function stringifyUnexpectedValue(value) {
  if (typeof value !== 'object' || value === null) return String(value);
  return value.label || value.text || value.title || value.summary || value.value || '';
}

function safe(value, fallback = emptyText) {
  if (Array.isArray(value)) {
    if (!value.length) return fallback;
    return value.map((item) => (typeof item === 'object' && item !== null ? stringifyUnexpectedValue(item) : item)).filter(Boolean).join(', ') || fallback;
  }
  if (value === 0) return value;
  if (value && typeof value === 'object') return stringifyUnexpectedValue(value) || fallback;
  return value || fallback;
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function compactPeriod(period = '', index = 0) {
  const value = String(period || '').trim();
  if (!value) return `Phase ${index + 1}`;
  if (/^\d{1,2}:\d{2}/.test(value)) return `Phase ${index + 1}`;
  return value.replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, '').replace(/\s{2,}/g, ' ').trim() || `Phase ${index + 1}`;
}

// Some scores are better when low. Conflict intensity of 90 is not a win.
function scoreTone(key, score) {
  const inverse = key === 'conflictIntensity' || key === 'mixedSignalLevel';
  const good = inverse ? score <= 35 : score >= 72;
  const mid = inverse ? score <= 68 : score >= 46;
  if (good) return { ring: 'var(--good)', wash: 'var(--good-wash)', label: 'good' };
  if (mid) return { ring: 'var(--warn)', wash: 'var(--warn-wash)', label: 'mixed' };
  return { ring: 'var(--risk)', wash: 'var(--risk-wash)', label: 'strained' };
}

// Every section of the report is one of these. The `accent` prop used to pick a
// gradient wash for the card's whole surface; the theme has no washes, so the
// card is simply a card and the prop is gone. Section identity now comes from
// the heading, which is where a reader looks for it anyway.
function CardShell({ id, title, emoji, summary, children, className = '' }) {
  return (
    <section id={id} data-export-bg="#ffffff" className={`card p-5 sm:p-6 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        {title && (
          <h2 className="text-base font-semibold leading-6 text-ink">
            {emoji ? `${emoji} ${title}` : title}
          </h2>
        )}
        {id && <CardActions targetId={id} name={title || id} summary={summary} />}
      </div>
      {children}
    </section>
  );
}

function Badge({ children, tone = 'purple' }) {
  const colors = {
    purple: 'border-signal/35 bg-signal/10 text-signal',
    pink: 'border-you/35 bg-you/10 text-you',
    blue: 'border-signal/35 bg-signal/10 text-signal',
    orange: 'border-warn/35 bg-warn/10 text-warn',
    green: 'border-good/35 bg-good/10 text-good',
  };
  return <span className={`rounded-sm border px-3 py-1.5 text-xs ${colors[tone]}`}>{children}</span>;
}

function ScoreBubble({ item }) {
  const score = Math.max(0, Math.min(100, Number(item.score) || 0));
  const tone = scoreTone(item.key, score);
  const circumference = 2 * Math.PI * 42;
  return (
    <div className="card p-5 transition duration-150 hover:-translate-y-0.5 hover:shadow-raised">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xl leading-none">{item.icon}</p>
          <p className="mt-2.5 text-sm font-semibold text-ink">{item.label}</p>
          <p className="mt-1.5 text-sm leading-6 text-smoke">{item.description}</p>
        </div>
        <div className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 100 100" className="-rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke={tone.wash} strokeWidth="9" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={tone.ring}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (score / 100) * circumference}
            />
          </svg>
          <p className="absolute inset-0 flex items-center justify-center text-xl font-semibold" style={{ color: tone.ring }}>{score}</p>
        </div>
      </div>
      <div className="mt-4 h-1.5 bar-track">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: tone.ring }} />
      </div>
    </div>
  );
}

function EmptyHint({ children = 'More chats can make this clearer.' }) {
  return <p className="rounded-2xl border border-line bg-paper p-4 text-sm leading-7 text-smoke">{children}</p>;
}

// Sized to fit the card without horizontal scrolling: the bucket count is
// already capped upstream, and bars flex to share the available width.
function ActivityBars({ activity }) {
  const buckets = list(activity?.buckets);
  if (!buckets.length) return <EmptyHint>No dated messages, so activity over time cannot be charted.</EmptyHint>;
  const unit = { week: 'week', month: 'month', year: 'year' }[activity.granularity] || 'period';
  const peak = Math.max(1, ...buckets.map((bucket) => bucket.count));
  return (
    <div>
      <p className="text-sm leading-7 text-smoke">
        Messages per {unit} — {activity.total.toLocaleString()} messages across {buckets.length} {unit}s.
      </p>
      <div className="mt-5 flex h-48 w-full items-end gap-[2px] sm:gap-1">
        {buckets.map((bucket) => (
          <div key={bucket.key} className="group flex h-full min-w-0 flex-1 flex-col justify-end" title={`${bucket.label}: ${bucket.count}`}>
            <span className="mb-1 text-center font-mono text-[0.55rem] text-ash opacity-0 transition group-hover:opacity-100">{bucket.count}</span>
            <div
              className="w-full rounded-t bg-signal transition hover:bg-signalStrong"
              style={{ height: `${Math.max(3, (bucket.count / peak) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex w-full gap-[2px] sm:gap-1">
        {buckets.map((bucket, index) => (
          <span
            key={bucket.key}
            className="min-w-0 flex-1 truncate text-center text-xs tracking-tight text-ash sm:text-xs"
          >
            {/* Thin the labels on dense charts so they never overlap. */}
            {buckets.length > 12 && index % 2 ? '' : bucket.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// Uses the two person tokens rather than the brand accent: this bar is about
// who did more, so it should be readable against the same colours every other
// per-person figure in the report uses.
function EffortBar({ value, personName = 'Them' }) {
  const userShare = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div>
      <div className="flex justify-between text-xs font-medium">
        <span className="ink-you">You {userShare}%</span>
        <span className="ink-them">{personName} {100 - userShare}%</span>
      </div>
      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-them">
        <div className="h-full bg-you" style={{ width: `${userShare}%` }} />
      </div>
    </div>
  );
}

function TimelinePhaseDetail({ phase = {}, personName }) {
  const hasEffort = phase.effortBalance !== undefined && phase.effortBalance !== null && phase.effortBalance !== '';
  return (
    <div className="mt-6 grid gap-5 rounded-sm border border-line bg-paper p-5 lg:grid-cols-[1.1fr_.9fr]">
      <div className="grid content-start gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="serif-title text-3xl leading-tight">{safe(phase.title, 'This phase')}</h3>
          {phase.confidence && <Badge tone="blue">{phase.confidence}</Badge>}
        </div>
        <div className="flex flex-wrap gap-2">
          {phase.emotionalTone && <Badge tone="pink">{safe(phase.emotionalTone)}</Badge>}
          {phase.initiator && <Badge tone="purple">Led by {safe(phase.initiator)}</Badge>}
        </div>
        {hasEffort && <EffortBar value={phase.effortBalance} personName={personName} />}
        <div>
          <p className="tech-label text-ash">What happened</p>
          <p className="mt-2 text-sm leading-7 text-smoke">{safe(phase.whatHappened || phase.happened || phase.whatChanged, 'More chats can make this phase clearer.')}</p>
        </div>
        {(phase.turningPoint || phase.quote) && (
          <div className="sticky-glass rotate-[-1deg] p-4">
            <p className="tech-label text-warn">Turning point</p>
            {phase.turningPoint && <p className="mt-2 text-sm leading-7 text-bone">{safe(phase.turningPoint)}</p>}
            {phase.quote && <p className="mt-2 font-mono text-sm leading-6 text-smoke">“{String(phase.quote).slice(0, 200)}”</p>}
          </div>
        )}
      </div>
      <div className="grid content-start gap-3">
        {[
          ['What went right', phase.whatWentRight],
          ['What went wrong', phase.whatWentWrong],
          ['What you might not have noticed', phase.youMightNotHaveNoticed],
          ['How it shaped what came next', phase.affectedNextPhase || phase.why || phase.whyItMatters],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-well p-4">
            <p className="tech-label text-ash">{label}</p>
            <p className="mt-2 text-sm leading-7 text-smoke">{safe(value, 'Not enough evidence for this yet.')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResultPage({ reportId = '', openCoach = false }) {
  const { flow } = useAnalysis();
  const { navigate } = useRouter();
  const [selectedTimeline, setSelectedTimeline] = useState(0);
  const [toast, setToast] = useState('');
  const [fetchedReport, setFetchedReport] = useState(null);
  const [fetchState, setFetchState] = useState('idle');
  // The coach is a dialog over this page, not a route of its own. Old
  // /reports/:id/coach links still resolve here and open it, so nothing that
  // was ever linked or bookmarked breaks.
  const [coachOpen, setCoachOpen] = useState(Boolean(openCoach));
  const [coachChain, setCoachChain] = useState(null);

  // Prefer the in-memory flow when it already holds the report being viewed
  // (a fresh generation, or a saved report opened from history). Otherwise —
  // a hard refresh, a new tab, or a shared /reports/:id link — fetch it by id
  // so a report is never lost just because React state was reset.
  const contextMatches = Boolean(flow.analysisResult) && (!reportId || flow.reportSource === reportId);

  useEffect(() => {
    if (contextMatches || !reportId) return undefined;
    let mounted = true;
    setFetchState('loading');
    setFetchedReport(null);
    fetchRelationshipReportById(reportId)
      .then((report) => {
        if (!mounted) return;
        if (!report || !report.analysisJson || !Object.keys(report.analysisJson).length) {
          setFetchState('notfound');
          return;
        }
        setFetchedReport(report);
        setFetchState('ready');
      })
      .catch(() => {
        if (mounted) setFetchState('error');
      });
    return () => {
      mounted = false;
    };
  }, [reportId, contextMatches]);

  const source = contextMatches
    ? {
      analysisResult: flow.analysisResult,
      preparedConversation: flow.preparedConversation || {},
      personName: flow.personName,
      relationshipType: flow.relationshipType,
      platform: flow.platform,
      analysisError: flow.analysisError,
      cacheNotice: flow.cacheNotice,
      chainId: flow.chainId || null,
    }
    : fetchedReport
      ? {
        analysisResult: fetchedReport.analysisJson,
        preparedConversation: fetchedReport.preparedConversation || {},
        personName: fetchedReport.personName,
        relationshipType: fetchedReport.relationshipType,
        platform: fetchedReport.platform,
        analysisError: '',
        cacheNotice: '',
        chainId: fetchedReport.chainId || null,
      }
      : null;

  const chainId = source?.chainId || null;

  // The coach answers from the whole CHAIN, not just this one report — several
  // analyses of the same person build on each other. Loaded only when the
  // dialog is actually opened; the report itself does not need it.
  useEffect(() => {
    if (!coachOpen || !chainId) return undefined;
    let active = true;
    setCoachChain(getChainById(chainId));
    fetchRelationshipReports()
      .then((reports) => {
        if (!active) return;
        setCoachChain(groupReports(reports).get(chainId) || getChainById(chainId));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [coachOpen, chainId]);

  const coachContext = useMemo(() => buildAnalysisChainContext(coachChain), [coachChain]);

  const analysis = source?.analysisResult || null;
  const prepared = source?.preparedConversation || {};
  const meta = prepared.metadata || analysis?.conversationRecap || {};
  const personName = meta.personName || source?.personName || analysis?.participants?.selectedOtherPerson || 'Their';

  const relationshipReport = analysis?.relationshipReport || {};
  const summary = {
    ...(analysis?.summary || {}),
    relationshipOverview: relationshipReport.summaryParagraph || relationshipReport.summary || analysis?.summary?.relationshipOverview,
    currentDynamic: relationshipReport.overallDynamic || relationshipReport.vibeLabel || analysis?.summary?.currentDynamic,
    mainEmotionalPattern: relationshipReport.emotionalTone || analysis?.summary?.mainEmotionalPattern,
  };
  const scores = analysis?.scores || {};
  const energy = analysis?.energyMatchScore || {};
  const timeline = list(analysis?.timeline).length ? list(analysis.timeline) : list(analysis?.turningPoints).map((point, index) => ({
    period: point.period || `Phase ${index + 1}`,
    title: point.title || 'Signal shift',
    happened: point.whatChanged,
    why: point.whyItMatters,
    quote: point.quote,
    sentiment: 'mixed',
    compatibility: scores.compatibility || 50,
  }));
  const timelineArc = analysis?.timelineArc || relationshipReport.timelineArc || '';
  const flags = {
    red: list(relationshipReport.redFlags || analysis?.improvedRedFlags || analysis?.redFlags),
    green: list(relationshipReport.greenFlags || analysis?.improvedGreenFlags || analysis?.greenFlags),
  };
  const reportDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  // Honest evidence framing: the parser already computes warningFlags and a
  // parse confidence, but nothing surfaced them — so a 6-message chat used to
  // read exactly as confidently as a 600-message one.
  const evidenceStrength = (() => {
    const notes = list(prepared.warningFlags).map((flag) => (typeof flag === 'string' ? flag : stringifyUnexpectedValue(flag))).filter(Boolean);
    const messageCount = Number(prepared.messageCount) || 0;
    const parseConfidence = prepared.parseConfidence || '';
    const thin = messageCount > 0 && (messageCount < 10 || parseConfidence === 'low');
    const moderate = !thin && (messageCount < 40 || parseConfidence === 'medium' || notes.length > 0);
    if (thin) {
      return {
        icon: '🌱',
        title: 'Directional read — small sample',
        description: `This report is based on ${messageCount} message${messageCount === 1 ? '' : 's'}. Treat everything below as a first impression worth checking, not a conclusion about this relationship.`,
        notes,
        className: 'border-warn/35 bg-warn/10',
      };
    }
    if (moderate) {
      return {
        icon: '🔎',
        title: 'Moderate evidence',
        description: `Based on ${messageCount.toLocaleString()} messages. The strongest patterns are the repeated ones — single moments may just be one bad day.`,
        notes,
        className: 'border-line bg-paper',
      };
    }
    return null;
  })();
  const detectedLanguage = prepared.languageStyle || analysis?.detectedLanguageStyle?.recommendedOutputStyle || analysis?.reportSummaryForFutureUse?.languageStyle || 'Language style inferred from the chat';

  // PDF, not a PNG. A relationship report runs several screens; as an image it
  // was one enormous unreadable strip, and the text in it could not be
  // selected, searched or read by a screen reader. Printing gives real
  // pagination and real text, and costs no bundle.
  function exportFullReport() {
    try {
      exportElementAsPdf(
        'relationship-report-export',
        pdfFileName(`thirdperson-report-${String(personName || 'relationship').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`),
      );
    } catch {
      setToast('Could not open the print view on this device.');
    }
  }

  async function shareSummary() {
    try {
      const result = await shareCardSummary('ThirdPerson AI Relationship Report', analysis?.screenshotWorthySummary || summary.currentDynamic || 'Relationship report summary');
      setToast(result === 'shared' ? 'Summary shared.' : 'Summary copied.');
    } catch {
      setToast('Sharing is not available on this device.');
    }
  }

  if (!analysis) {
    const isLoading = fetchState === 'loading' || (reportId && !contextMatches && fetchState === 'idle');
    const notFound = fetchState === 'notfound' || fetchState === 'error';
    return (
      <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
        <div className="relative mx-auto max-w-5xl">
          <div className="accent-panel corner-frame p-8 text-center sm:p-14">
            {isLoading ? (
              <>
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-signal/35 border-t-transparent" />
                <p className="mt-6 text-xs text-smoke">Loading your report…</p>
              </>
            ) : (
              <>
                <p className="tech-label text-smoke">Relationship Intelligence Report</p>
                <h1 className="serif-title mx-auto mt-5 max-w-3xl text-5xl leading-tight sm:text-7xl">
                  {notFound ? 'We couldn’t find that report.' : 'Your report will appear here.'}
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-sm leading-8 text-smoke">
                  {notFound
                    ? 'It may have been deleted, or the link is incorrect. Your saved reports are always available in your history.'
                    : 'Run an analysis to see the timeline, effort balance, red and green flags, your zodiac layer, and a clear next move.'}
                </p>
                <button
                  onClick={() => navigate(notFound ? '/reports' : '/analysis/new')}
                  className="glass-button mt-8 rounded-sm px-6 py-4 text-xs text-bone"
                >
                  {notFound ? 'Go to your reports' : 'Start a conversation analysis'}
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    );
  }

  const scoreCards = [
    ['compatibility', 'Compatibility Signal', 'Overall relational fit in this sample.', '✨'],
    ['communicationHealth', 'Communication Health', 'Clarity, responsiveness, and repair quality.', '💬'],
    ['emotionalSafety', 'Emotional Safety', 'How safe the chat seems for honest emotion.', '🫶'],
    ['effortBalance', 'Effort Balance', 'Whether energy and initiative feel reciprocal.', '⚖️'],
    ['clarity', 'Clarity', 'How easy the next step feels to understand.', '🧠'],
    ['trustSignal', 'Trust Signal', 'Language that may support openness and reliability.', '🔐'],
    ['conflictIntensity', 'Conflict Intensity', 'Pressure, escalation, or tension signals.', '🌩️'],
    ['mixedSignalLevel', 'Mixed Signal Level', 'Warmth and distance showing up together.', '🧭'],
  ].map(([key, label, description, icon]) => ({
    key,
    label,
    description,
    icon,
    score: key === 'mixedSignalLevel'
      ? Math.max(15, Math.min(95, 100 - (scores.clarity || 50) + Math.round(((scores.conflictIntensity || 40) / 4))))
      : scores[key] ?? 50,
  }));


  // Top words are counted locally by the parser — no AI tokens spent on
  // something a simple frequency count does exactly and for free.
  const topWords = list(prepared.topWords)
    .filter((item) => item && item.word)
    .slice(0, 5);
  // Grouped facts about the other person, each backed by a verbatim quote.
  const personFactGroups = Object.entries(analysis?.personProfile?.categories || {})
    .filter(([, items]) => Array.isArray(items) && items.length)
    .sort((a, b) => b[1].length - a[1].length);
  // Zodiac is computed locally from the two birth dates captured in the wizard.
  // A fixed astrological lookup — no tokens, and identical on every re-open.
  const zodiacMatch = buildZodiacMatch(
    prepared.metadata?.userProfile?.zodiacSign || '',
    prepared.metadata?.otherPersonZodiac?.sign || '',
  );
  const metrics = prepared.localMetrics || {};
  // ONE colour per participant, decided here and passed to every chart, so a
  // reader learns "pink is me, blue is them" once instead of re-reading a
  // legend on each figure. Anyone who is not the named other person is you —
  // exports name the account holder inconsistently, and defaulting the unknown
  // case to "them" would mislabel the person reading their own report.
  const colorFor = (sender) => (
    String(sender || '').trim().toLowerCase() === String(personName || '').trim().toLowerCase()
      ? 'var(--them)'
      : 'var(--you)'
  );
  const emojis = list(metrics.emojis);
  const effort = metrics.effort || null;
  // Scored on dimensions chosen for THIS relationship type — a partner report
  // and a parent report are measured on different things, not one shared rubric.
  const signatureMetrics = list(analysis?.relationshipReport?.signatureMetrics)
    .filter((metric) => metric && (metric.label || metric.key));
  const effortPeople = list(effort?.people);
  const trend = effort?.trend || null;

  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
      {/* Rides the top-right corner once the reader is past the header. */}
      <FloatingCoach onOpen={() => setCoachOpen(true)} />
      <CoachDialog
        open={coachOpen}
        onClose={() => setCoachOpen(false)}
        chainId={chainId}
        context={coachContext}
      />
      <div id="relationship-report-export" data-export-bg="#ffffff" className="relative mx-auto max-w-[1560px] rounded-sm bg-transparent p-2 sm:p-4">
        <header className="accent-panel glow-border relative mb-6 overflow-hidden p-6 sm:p-8">
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-4xl">
              <p className="tech-label text-signal">Relationship Intelligence Report</p>
              <h1 className="serif-title mt-4 text-5xl leading-none sm:text-7xl">{personName}</h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-smoke">
                This is your private emotional map of what the conversation appears to show: warm signals, clarity gaps, energy balance, key moments, and the next best move.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Badge tone="purple">{meta.relationshipType || source?.relationshipType || 'Relationship'}</Badge>
                <Badge tone="blue">{meta.platform || source?.platform || 'Chat'}</Badge>
                <Badge tone="pink">{prepared.estimatedDateRange || 'Period unclear'}</Badge>
                <Badge tone="orange">{(prepared.messageCount || 0).toLocaleString()} messages</Badge>
              </div>
            </div>
            <div className="grid min-w-[260px] gap-3 rounded-sm border border-line bg-paper p-4 ">
              {[
                ['Participants', list(prepared.participants || prepared.participantNames || analysis.participants?.detectedParticipants).join(', ')],
                ['Language style', detectedLanguage],
                ['Generated', reportDate],
                ['Privacy', 'Sensitive details protected'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="tech-label text-ash">{label}</p>
                  <p className="mt-1 text-sm leading-6 text-bone">{safe(value)}</p>
                </div>
              ))}
              <button data-export-ignore onClick={exportFullReport} className="btn btn-secondary btn-sm mt-2">
                Download Report
              </button>
            </div>
          </div>
          {evidenceStrength && (
            <div className={`relative mt-5 rounded-sm border p-4 ${evidenceStrength.className}`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xl">{evidenceStrength.icon}</span>
                <p className="tech-label text-bone">{evidenceStrength.title}</p>
              </div>
              <p className="mt-3 text-sm leading-7 text-smoke">{evidenceStrength.description}</p>
              {evidenceStrength.notes.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-sm leading-6 text-smoke">
                  {evidenceStrength.notes.map((note) => <li key={note}>• {note}</li>)}
                </ul>
              )}
            </div>
          )}
          {(source?.analysisError || source?.cacheNotice || toast) && (
            <p data-export-ignore className="relative mt-5 rounded-2xl border border-line bg-paper p-4 text-sm leading-7 text-smoke">
              {toast || source?.cacheNotice || source?.analysisError}
            </p>
          )}
        </header>

        <div className="grid gap-5">
          {/* Counted facts before interpreted ones. Everything in this strip is
              arithmetic the reader could redo by hand, which is what buys the
              credit that the hedged sections below it spend. */}
          {list(metrics.quickStats).length > 0 && (
            <CardShell id="quick-stats" title="At a glance" emoji="📌" summary="Exact counts from the conversation.">
              <QuickStats stats={list(metrics.quickStats)} />
            </CardShell>
          )}

          <CardShell id="report-summary-card" title="Relationship Summary" emoji="✨" summary={analysis.screenshotWorthySummary || summary.currentDynamic}>
            <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
              <div>
                <h2 className="serif-title text-4xl leading-tight sm:text-5xl">{safe(analysis.screenshotWorthySummary || relationshipReport.vibeLabel, 'This connection has signals worth reading gently.')}</h2>
                <p className="mt-5 text-base leading-8 text-smoke">{safe(summary.relationshipOverview)}</p>
              </div>
              <div className="grid gap-3">
                {[
                  ['Overall dynamic', summary.currentDynamic],
                  ['Emotional tone', summary.mainEmotionalPattern || analysis.relationshipReport?.emotionalTone],
                  ['Current vibe', analysis.simpleSummaryForYoungAudience],
                  ['Quick read', analysis.bestieBreakdown?.whatItLooksLike || relationshipReport.vibeLabel],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-line bg-well p-4">
                    <p className="tech-label text-ash">{label}</p>
                    <p className="mt-2 text-sm leading-7 text-bone">{safe(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardShell>

          <section id="score-cards" data-export-bg="#ffffff" className="relative">
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="tech-label text-good">Score Cards 🧠</p>
              <CardActions targetId="score-cards" name="score-cards" summary={`Compatibility ${scores.compatibility || 0}/100`} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {scoreCards.map((item) => <ScoreBubble key={item.key} item={item} />)}
            </div>
          </section>

          <CardShell id="emotional-timeline" title="Relationship Timeline" emoji="🗺️" summary={timelineArc || 'Timeline of relationship phases.'}>
            {timelineArc && <p className="mb-5 max-w-3xl text-base leading-8 text-smoke">{safe(timelineArc)}</p>}
            {timeline.length ? (
              <>
                {/* Phones: vertical rail. The horizontal version needed a ~680px
                    sideways drag, which was the weakest mobile surface in the report. */}
                <div className="relative grid gap-3 sm:hidden">
                  <div className="absolute bottom-5 left-[0.72rem] top-5 w-1 rounded-full bg-signal opacity-60" />
                  {timeline.map((item = {}, index) => {
                    const active = selectedTimeline === index;
                    const phaseSentiment = item.sentiment || item.emotionalTone || 'mixed';
                    return (
                      <button
                        key={`${item.period}-${index}-m`}
                        onClick={() => setSelectedTimeline(index)}
                        aria-pressed={active}
                        className="relative flex items-start gap-4 text-left"
                      >
                        <span className={`relative z-10 mt-4 block h-6 w-6 shrink-0 rounded-full border ${active ? 'border-signal bg-signal' : 'border-line bg-well'} transition`} />
                        <span className={`min-w-0 flex-1 rounded-2xl border p-4 transition ${active ? 'border-signal/35 bg-paper' : 'border-line bg-paper'}`}>
                          <span className="block text-xs text-ash">{compactPeriod(item.period, index)}</span>
                          <span className="mt-1.5 block text-sm font-semibold text-bone">{safe(item.title, `Phase ${index + 1}`)}</span>
                          <span className="mt-1.5 block text-xs leading-5 text-smoke">{phaseSentiment} • {item.compatibility || scores.compatibility || 50}/100</span>
                          {item.confidence && <span className="mt-2 block text-xs text-ash">{item.confidence}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="hidden overflow-x-auto pb-3 sm:block">
                  <div className="relative flex min-w-[680px] items-start gap-5 px-2 sm:min-w-[880px]">
                    <div className="absolute left-12 right-12 top-[4.1rem] h-1 rounded-full bg-signal opacity-70" />
                    {timeline.map((item = {}, index) => {
                      const active = selectedTimeline === index;
                      const phaseSentiment = item.sentiment || item.emotionalTone || 'mixed';
                      return (
                        <button
                          key={`${item.period}-${index}`}
                          onClick={() => setSelectedTimeline(index)}
                          aria-pressed={active}
                          className="group relative w-44 shrink-0 text-left"
                        >
                          <p className="h-12 text-xs text-ash">{compactPeriod(item.period, index)}</p>
                          <span className={`relative z-10 block h-7 w-7 rounded-full border ${active ? 'border-signal bg-signal' : 'border-line bg-well'} transition group-hover:border-signal`} />
                          <div className={`mt-5 rounded-2xl border p-4  transition ${active ? 'border-signal/35 bg-paper' : 'border-line bg-paper'}`}>
                            <p className="text-sm font-semibold text-bone">{safe(item.title, `Phase ${index + 1}`)}</p>
                            <p className="mt-2 text-xs leading-5 text-smoke">{phaseSentiment} • {item.compatibility || scores.compatibility || 50}/100</p>
                            {item.confidence && <p className="mt-2 text-xs text-ash">{item.confidence}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <TimelinePhaseDetail phase={timeline[selectedTimeline] || timeline[0] || {}} personName={personName} />
              </>
            ) : (
              <EmptyHint>
                This conversation did not have enough dated messages to build a phase-by-phase timeline yet. A longer export with timestamps will unlock the full relationship timeline.
              </EmptyHint>
            )}
          </CardShell>

          {personFactGroups.length > 0 && (
            <CardShell id="person-profile" title={`About ${personName}`} emoji="🔍" summary={`What ${personName}'s own messages reveal about them.`}>
              <p className="max-w-3xl text-sm leading-7 text-smoke">
                Everything {personName} revealed about themselves in this chat — each point backed by their own words.
                Mentioned in more than one period shows as <span className="text-signal">Confirmed</span>.
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {personFactGroups.map(([category, items]) => (
                  <div key={category} className="rounded-sm border border-line bg-paper p-5">
                    <p className="tech-label text-signal">{FACT_CATEGORY_LABELS[category] || category.replace(/_/g, ' ')}</p>
                    <ul className="mt-4 space-y-4">
                      {items.map((item, index) => (
                        <li key={`${item.fact}-${index}`}>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="text-sm leading-6 text-bone">{item.fact}</p>
                            {item.confidence === 'Confirmed' && <Badge tone="green">Confirmed</Badge>}
                          </div>
                          <p className="mt-1.5 border-l-2 border-line pl-3 font-mono text-xs leading-5 text-smoke">
                            “{String(item.quote).slice(0, 160)}”
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardShell>
          )}

          <CardShell id="activity-over-time" title="Messages Over Time" emoji="📊" summary="How much you both talked across the life of this chat.">
            <ActivityBars activity={metrics.activity} />
          </CardShell>

          {signatureMetrics.length > 0 && (
              <CardShell
                id="signature-metrics"
                title={`What Matters In ${meta.relationshipType || 'This Relationship'}`}
                emoji="🎯"
                summary={signatureMetrics.map((metric) => `${metric.label}: ${metric.score}`).join(' · ')}
              >
                <p className="max-w-3xl text-sm leading-7 text-smoke">
                  These four are scored specifically for a {String(meta.relationshipType || 'relationship').toLowerCase()}.
                  A different relationship type is measured on different things — what counts as healthy here
                  would be the wrong question somewhere else.
                </p>
                <div className="mt-5 grid gap-3 sm:gap-4 md:grid-cols-2">
                  {signatureMetrics.map((metric) => {
                    const score = Math.max(0, Math.min(100, Number(metric.score) || 0));
                    return (
                      <div key={metric.key || metric.label} className="rounded-sm border border-line bg-paper p-5">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h3 className="text-lg leading-6 text-bone">{metric.label || metric.key}</h3>
                          <span className="font-mono text-xl tabular-nums text-bone">{score}</span>
                        </div>
                        <div className="neon-meter mt-3">
                          <span style={{ width: `${score}%` }} />
                        </div>
                        {metric.reading && (
                          <p className="mt-3 text-sm leading-6 text-smoke">{metric.reading}</p>
                        )}
                        {metric.evidenceQuote && (
                          <p className="mt-3 border-l-2 border-you/35 pl-3 text-sm italic leading-6 text-ash">
                            “{metric.evidenceQuote}”
                          </p>
                        )}
                        {metric.confidence && (
                          <p className="mt-3 text-xs text-ash">
                            {metric.confidence}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardShell>
          )}

          {effort && (
            <CardShell id="effort-balance" title="Effort & Reciprocity" emoji="⚖️" summary="Measured counts: who starts, who replies faster, who lets it end.">
              <p className="max-w-3xl text-sm leading-7 text-smoke">
                These are exact counts from the messages themselves — not an AI estimate — across {effort.conversations.toLocaleString()} separate conversations.
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {effortPeople.map((person) => (
                  <div key={person.sender} className="rounded-sm border border-line bg-paper p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="flex items-center gap-2 text-xl text-bone">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: colorFor(person.sender) }}
                          aria-hidden="true"
                        />
                        {person.sender}
                      </h3>
                      <Badge tone="purple">{person.messageShare}% of messages</Badge>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-4">
                      {[
                        ['Starts conversations', `${person.initiationShare}%`, `${person.initiations} of ${effort.conversations}`],
                        ['Median reply time', formatDuration(person.medianReplyMinutes), null],
                        ['Double texts', String(person.doubleTexts), 'messages in a row'],
                        ['Lets chat end', String(person.conversationEnds), 'had the last word'],
                        ['Asks questions', `${person.questionRate}%`, 'of their messages'],
                        ['Message length', `${person.averageWordsPerMessage} words`, 'on average'],
                      ].map(([label, value, hint]) => (
                        <div key={label}>
                          <dt className="tech-label text-ash">{label}</dt>
                          <dd className="mt-1.5 text-lg leading-6 text-bone">{value}</dd>
                          {hint && <p className="mt-0.5 text-xs text-ash">{hint}</p>}
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
              {trend && (
                <div className="mt-4 grid gap-3 rounded-sm border border-line bg-well p-5 sm:grid-cols-2">
                  <div>
                    <p className="tech-label text-ash">Reply speed, then vs now</p>
                    <p className="mt-2 text-sm leading-7 text-smoke">
                      {trend.replyMinutesDelta === null
                        ? 'Not enough timestamped replies to compare.'
                        : trend.replyMinutesDelta > 0
                          ? `Replies now take about ${formatDuration(Math.abs(trend.replyMinutesDelta))} longer than at the start.`
                          : trend.replyMinutesDelta < 0
                            ? `Replies now come about ${formatDuration(Math.abs(trend.replyMinutesDelta))} faster than at the start.`
                            : 'Reply speed has stayed about the same.'}
                    </p>
                  </div>
                  <div>
                    <p className="tech-label text-ash">Message volume, then vs now</p>
                    <p className="mt-2 text-sm leading-7 text-smoke">
                      {trend.messageVolumeDelta === 0
                        ? 'You are exchanging about the same number of messages as when this chat began.'
                        : trend.messageVolumeDelta > 0
                          ? `Recent messages are up about ${trend.messageVolumeDelta}% versus the earliest stretch.`
                          : `Recent messages are down about ${Math.abs(trend.messageVolumeDelta)}% versus the earliest stretch.`}
                    </p>
                  </div>
                </div>
              )}
            </CardShell>
          )}

          {emojis.length > 0 && (
            <CardShell id="top-emojis" title="Top Emojis" emoji="😊" summary="The nine emojis used most in this chat.">
              <p className="max-w-2xl text-sm leading-7 text-smoke">Counted directly from the uploaded chat.</p>
              <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
                {emojis.map((item) => (
                  <div key={item.emoji} className="rounded-sm border border-line bg-paper p-3 text-center">
                    <p className="text-3xl leading-none">{item.emoji}</p>
                    <p className="mt-2 font-mono text-xs text-bone">{item.count}×</p>
                  </div>
                ))}
              </div>
            </CardShell>
          )}

          {(metrics.rhythm || metrics.tone) && (
            <CardShell
              id="conversation-patterns"
              title="Patterns Over Time"
              emoji="📈"
              summary={metrics.rhythm ? `Busiest ${metrics.rhythm.peakLabel}.` : 'How the tone moved.'}
            >
              <p className="max-w-3xl text-sm leading-7 text-smoke">
                Counted from the timestamps and the words themselves. No model
                was asked for any of this — it is arithmetic on your own chat.
              </p>
              <div className="mt-5 grid gap-6">
                {metrics.rhythm && <RhythmHeatmap rhythm={metrics.rhythm} />}
                {metrics.tone && <ToneOverTime tone={metrics.tone} colorFor={colorFor} />}
              </div>
            </CardShell>
          )}

          {zodiacMatch && (
            <CardShell id="zodiac-match" title="Zodiac Layer" emoji="✨" summary={`${zodiacMatch.userSign} + ${zodiacMatch.otherSign}: ${zodiacMatch.label}`}>
              <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
                <div className="rounded-sm border border-signal/35 bg-signal/10 p-5 text-center">
                  <div className="flex items-center justify-center gap-4">
                    <div>
                      <p className="text-4xl leading-none text-bone">{zodiacMatch.userGlyph}</p>
                      <p className="mt-2 text-sm text-bone">{zodiacMatch.userSign}</p>
                      <p className=" text-xs text-ash">You · {zodiacMatch.userElement}</p>
                    </div>
                    <p className="text-2xl text-ash">+</p>
                    <div>
                      <p className="text-4xl leading-none text-bone">{zodiacMatch.otherGlyph}</p>
                      <p className="mt-2 text-sm text-bone">{zodiacMatch.otherSign}</p>
                      <p className=" text-xs text-ash">{personName} · {zodiacMatch.otherElement}</p>
                    </div>
                  </div>
                  <p className="serif-title mt-5 text-6xl leading-none text-bone">{zodiacMatch.score}</p>
                  <p className="mt-1 text-xs text-signal">{zodiacMatch.label}</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-well">
                    <div className="h-full rounded-full bg-signal" style={{ width: `${zodiacMatch.score}%` }} />
                  </div>
                </div>
                <div className="grid gap-3">
                  {[
                    ['Aspect', `${zodiacMatch.aspect} — ${zodiacMatch.aspectNote}`],
                    ['Where you flow', zodiacMatch.strength],
                    ['Where you rub', zodiacMatch.friction],
                    ['Pace', zodiacMatch.modalityNote],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-line bg-paper p-4">
                      <p className="tech-label text-ash">{label}</p>
                      <p className="mt-2 text-sm leading-6 text-smoke">{value}</p>
                    </div>
                  ))}
                  <p className="text-xs leading-6 text-ash">{zodiacMatch.disclaimer}</p>
                </div>
              </div>
            </CardShell>
          )}

          <CardShell id="word-cloud" title="Top Words" emoji="☁️" summary="The five words used most across this conversation.">
            <p className="max-w-2xl text-sm leading-7 text-smoke">
              The five words that came up most across this conversation, counted directly from the messages.
            </p>
            {topWords.length ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-5">
                {topWords.map((item, index) => (
                  <div key={item.word} className="rounded-sm border border-line bg-paper p-4 text-center">
                    <p className=" text-xs text-ash">#{index + 1}</p>
                    <p className="mt-2 break-words text-xl text-bone">{item.word}</p>
                    <p className="mt-2 font-mono text-xs text-smoke">{item.count}×</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5"><EmptyHint>Not enough message text yet to count word frequency.</EmptyHint></div>
            )}
          </CardShell>

          <div className="grid gap-5 lg:grid-cols-2">
            <CardShell id="red-flags" title="Red Flags" emoji="🚩" summary="Gentle red flag reflections.">
              <div className="grid gap-4">
                {flags.red.length ? flags.red.map((flag, index) => (
                  <div key={`${flag.label}-${index}`} className="rounded-sm border border-you/35 bg-you/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-xl text-bone">{safe(flag.label || flag.title, 'Pattern worth noticing')}</h3>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone="pink">{flag.severity || 'soft signal'}</Badge>
                        {flag.confidence && <Badge tone="blue">{flag.confidence}</Badge>}
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-smoke">{safe(flag.explanation, 'This may be worth noticing based on the conversation.')}</p>
                    {flag.evidenceQuote ? (
                      <blockquote className="mt-3 rounded-2xl border border-line bg-well p-3">
                        <p className="tech-label text-you">Receipt</p>
                        <p className="mt-2 font-mono text-sm leading-6 text-bone">“{String(flag.evidenceQuote).slice(0, 220)}”</p>
                      </blockquote>
                    ) : (
                      <p className="mt-3 rounded-2xl border border-line bg-well p-3 text-xs text-ash">No direct quote from this chat — treat as a limited-evidence signal</p>
                    )}
                    <p className="mt-3 text-sm leading-7 text-smoke"><span className="text-you">Why it matters:</span> {safe(flag.whyItMatters, 'This could affect clarity or emotional safety over time.')}</p>
                    <p className="mt-3 text-sm leading-7 text-smoke"><span className="text-you">Reflection:</span> {safe(flag.reflectionQuestion, 'What would you need to ask clearly instead of guessing?')}</p>
                  </div>
                )) : <EmptyHint>This conversation did not show strong red flag evidence. That does not prove everything is fine, it just means the signal is limited.</EmptyHint>}
              </div>
            </CardShell>

            <CardShell id="green-flags" title="Green Flags" emoji="🟢" summary="Positive signals from this conversation.">
              <div className="grid gap-4">
                {flags.green.length ? flags.green.map((flag, index) => (
                  <div key={`${flag.label}-${index}`} className="rounded-sm border border-good/35 bg-good/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-xl text-bone">{safe(flag.label || flag.title, 'Promising signal')}</h3>
                      {flag.confidence && <Badge tone="green">{flag.confidence}</Badge>}
                    </div>
                    <p className="mt-3 text-sm leading-7 text-smoke">{safe(flag.explanation, 'A possible positive sign appears in this chat.')}</p>
                    {flag.evidenceQuote ? (
                      <blockquote className="mt-3 rounded-2xl border border-line bg-well p-3">
                        <p className="tech-label text-good">Receipt</p>
                        <p className="mt-2 font-mono text-sm leading-6 text-bone">“{String(flag.evidenceQuote).slice(0, 220)}”</p>
                      </blockquote>
                    ) : (
                      <p className="mt-3 rounded-2xl border border-line bg-well p-3 text-xs text-ash">No direct quote from this chat — treat as a limited-evidence signal</p>
                    )}
                    <p className="mt-3 text-sm leading-7 text-smoke"><span className="text-good">Why it matters:</span> {safe(flag.whyItMatters, 'Healthy signals can create room for calmer repair.')}</p>
                    <p className="mt-3 text-sm leading-7 text-smoke"><span className="text-good">Build on it:</span> {safe(flag.howToBuildOnIt, 'Name the good signal and ask for one clear next step.')}</p>
                  </div>
                )) : <EmptyHint>Green flags were not strong in this sample yet. More chats can make this clearer.</EmptyHint>}
              </div>
            </CardShell>
          </div>

          <CardShell id="energy-match" title="Energy Match Score" emoji="⚡" summary={energy.explanation}>
            <div className="grid gap-5 xl:grid-cols-[.75fr_1.25fr]">
              <div className="flex flex-col justify-between rounded-sm border border-warn/35 bg-warn/10 p-5">
                <div>
                  <p className="tech-label text-warn">Overall energy match</p>
                  <p className="serif-title mt-3 text-7xl">{Number(energy.score ?? scores.effortBalance) || 50}</p>
                  <p className="mt-4 text-sm leading-7 text-smoke">{safe(energy.explanation, 'The energy balance needs more data, but effort and clarity are the main things to watch.')}</p>
                </div>
                <div className="mt-6 h-3 overflow-hidden rounded-full bg-well">
                  <div className="h-full rounded-full bg-signal" style={{ width: `${Number(energy.score ?? scores.effortBalance) || 50}%` }} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Your energy', energy.userEnergy],
                  [`${personName}’s energy`, energy.otherPersonEnergy],
                  ['Effort balance', energy.effortBalance],
                  ['Emotional availability', energy.emotionalAvailability],
                  ['Consistency', energy.consistency],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-line bg-paper p-4">
                    <p className="tech-label">{label}</p>
                    <p className="mt-2 text-sm leading-7 text-bone">{safe(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardShell>

          {list(analysis.reportSummaryForFutureUse?.personalityDelta).length > 0 && (
            <CardShell id="personality-update" title="Personality Update" emoji="🧬" summary="How this analysis refined your personality profile.">
              <p className="max-w-3xl text-sm leading-7 text-smoke">
                Each analysis teaches ThirdPerson AI a little more about you. This conversation updated your evolving profile in these ways:
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {list(analysis.reportSummaryForFutureUse.personalityDelta).slice(0, 6).map((delta, index) => {
                  const text = typeof delta === 'string' ? delta : stringifyUnexpectedValue(delta);
                  const tone = /^new:/i.test(text) ? 'purple' : /^softened:/i.test(text) ? 'orange' : 'green';
                  const kind = /^new:/i.test(text) ? 'New' : /^softened:/i.test(text) ? 'Softened' : 'Reinforced';
                  return (
                    <div key={`${text}-${index}`} className="rounded-sm border border-line bg-paper p-4">
                      <Badge tone={tone}>{kind}</Badge>
                      <p className="mt-3 text-sm leading-7 text-bone">{text.replace(/^(new|reinforced|softened):\s*/i, '')}</p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs leading-6 text-ash">See the full picture in Know Yourself, where every analysis builds on the last.</p>
            </CardShell>
          )}

          <CardShell id="next-best-move" title="Next Best Move" emoji="💬" summary={analysis.advice?.nextBestStep}>
            <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
              <div>
                <h2 className="serif-title text-5xl leading-tight">Recommended next step.</h2>
                <p className="mt-5 text-lg leading-8 text-smoke">{safe(relationshipReport.nextBestMove || analysis.advice?.nextBestStep, 'Ask for one clear, kind next step and watch whether actions match the words.')}</p>
              </div>
              <div className="grid gap-3">
                {[
                  ['What to understand', analysis.advice?.understand],
                  ['What to ask', analysis.advice?.ask],
                  ['What to avoid', analysis.advice?.avoid],
                  ['Gentle reality check', analysis.bestieBreakdown?.whatNotToIgnore],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-line bg-paper p-4">
                    <p className="tech-label text-ash">{label}</p>
                    <p className="mt-2 text-sm leading-7 text-bone">{safe(value)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div data-export-ignore className="mt-6 flex flex-wrap gap-3">
              <button onClick={exportFullReport} className="btn btn-secondary">Download PDF</button>
              <button onClick={shareSummary} className="btn btn-secondary">Share summary</button>
            </div>
          </CardShell>

          <AfterReportActions onOpenCoach={() => setCoachOpen(true)} />

          <section className="glass-card p-5">
            <p className="text-sm leading-7 text-smoke">
              ThirdPerson AI provides interpretive relationship insights based on the conversation you upload. It cannot know the full reality of any person or relationship. Use this as a reflection tool, not as proof or final judgment.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
