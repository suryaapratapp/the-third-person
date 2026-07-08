import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import CardActions from '../components/CardActions.jsx';
import ParticleBackground from '../components/ParticleBackground.jsx';
import { exportElementAsImage, shareCardSummary } from '../lib/exportElementAsImage.js';
import { useAnalysis } from '../state/AnalysisContext.jsx';
import { useRouter } from '../state/RouterContext.jsx';

const chartColors = ['#a78bfa', '#f472b6', '#38bdf8', '#fb923c', '#34d399', '#818cf8'];
const emptyText = 'Not enough evidence yet';
const emotionalWords = ['love', 'miss', 'care', 'sorry', 'hurt', 'fine', 'trust', 'confused', 'ignored', 'distant', 'honest', 'jaan', 'pyaar', 'pyar', 'yaad'];
const affectionWords = ['love', 'miss', 'care', 'jaan', 'baby', 'cute', 'kiss', 'hug', 'yaad', 'pyaar', 'pyar'];
const conflictWords = ['fight', 'angry', 'hurt', 'ignored', 'leave', 'block', 'blocked', 'lie', 'toxic', 'hate', 'gussa', 'naraz', 'stop'];

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

function scoreTone(key, score) {
  const inverse = key === 'conflictIntensity' || key === 'mixedSignalLevel';
  const good = inverse ? score <= 35 : score >= 72;
  const mid = inverse ? score <= 68 : score >= 46;
  if (good) return { ring: '#34d399', glow: 'rgba(52,211,153,0.32)', label: 'green' };
  if (mid) return { ring: '#fb923c', glow: 'rgba(251,146,60,0.28)', label: 'amber' };
  return { ring: '#fb7185', glow: 'rgba(251,113,133,0.32)', label: 'rose' };
}

function CardShell({ id, title, emoji, summary, children, className = '', accent = 'purple' }) {
  const accentClass = {
    purple: 'from-purple-300/18 via-pink-300/10 to-violet-300/10',
    pink: 'from-pink-300/18 via-purple-300/10 to-orange-300/10',
    blue: 'from-violet-300/18 via-purple-300/10 to-fuchsia-300/10',
    orange: 'from-orange-300/16 via-pink-300/10 to-purple-300/10',
    green: 'from-emerald-300/14 via-green-200/8 to-purple-300/10',
  }[accent] || 'from-purple-300/18 via-pink-300/10 to-violet-300/10';

  return (
    <section id={id} data-export-bg="#100d21" className={`glass-card glow-border relative overflow-hidden p-5 sm:p-6 ${className}`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accentClass} opacity-80`} />
      <div className="relative">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title && <p className="tech-label text-smoke">{emoji ? `${title} ${emoji}` : title}</p>}
          </div>
          {id && <CardActions targetId={id} name={title || id} summary={summary} />}
        </div>
        {children}
      </div>
    </section>
  );
}

function Badge({ children, tone = 'purple' }) {
  const colors = {
    purple: 'border-purple-200/25 bg-purple-300/10 text-purple-100',
    pink: 'border-pink-200/25 bg-pink-300/10 text-pink-100',
    blue: 'border-violet-200/25 bg-violet-300/10 text-violet-100',
    orange: 'border-orange-200/25 bg-orange-300/10 text-orange-100',
    green: 'border-emerald-200/25 bg-emerald-300/10 text-emerald-100',
  };
  return <span className={`rounded-full border px-3 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.13em] ${colors[tone]}`}>{children}</span>;
}

function ScoreBubble({ item }) {
  const score = Math.max(0, Math.min(100, Number(item.score) || 0));
  const tone = scoreTone(item.key, score);
  const circumference = 2 * Math.PI * 42;
  return (
    <div className="glass-card p-5 transition duration-200 hover:-translate-y-1" style={{ boxShadow: `0 22px 80px ${tone.glow}` }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-2xl">{item.icon}</p>
          <p className="tech-label mt-3 text-smoke">{item.label}</p>
          <p className="mt-3 text-sm leading-6 text-smoke">{item.description}</p>
        </div>
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 100 100" className="-rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={tone.ring}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (score / 100) * circumference}
            />
          </svg>
          <p className="absolute inset-0 flex items-center justify-center font-mono text-2xl text-bone">{score}</p>
        </div>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-pink-300 via-purple-300 to-orange-300" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function WeightedChips({ words = [], fallback = emptyText }) {
  const items = list(words).slice(0, 18);
  if (!items.length) return <p className="text-sm leading-7 text-smoke">{fallback}</p>;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map((item, index) => {
        const count = Number(item.count || item.weight || 1);
        const size = Math.min(1.35, 0.74 + count / 18);
        return (
          <span
            key={`${item.word || item.label}-${index}`}
            className="rounded-full border border-white/14 bg-white/[0.07] px-3 py-2 font-mono uppercase tracking-[0.11em] text-bone shadow-[0_0_28px_rgba(168,85,247,0.12)]"
            style={{ fontSize: `${size}rem` }}
          >
            {item.word || item.label}
          </span>
        );
      })}
    </div>
  );
}

function EmptyHint({ children = 'More chats can make this clearer.' }) {
  return <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-smoke">{children}</p>;
}

export default function ResultPage() {
  const { flow } = useAnalysis();
  const { navigate } = useRouter();
  const [selectedTimeline, setSelectedTimeline] = useState(0);
  const [toast, setToast] = useState('');
  const analysis = useMemo(() => flow.analysisResult, [flow.analysisResult]);
  const prepared = flow.preparedConversation || {};
  const meta = prepared.metadata || analysis?.conversationRecap || {};
  const personName = meta.personName || flow.personName || analysis?.participants?.selectedOtherPerson || 'Their';

  const relationshipReport = analysis?.relationshipReport || {};
  const summary = {
    ...(analysis?.summary || {}),
    relationshipOverview: relationshipReport.summaryParagraph || relationshipReport.summary || analysis?.summary?.relationshipOverview,
    currentDynamic: relationshipReport.overallDynamic || relationshipReport.vibeLabel || analysis?.summary?.currentDynamic,
    mainEmotionalPattern: relationshipReport.emotionalTone || analysis?.summary?.mainEmotionalPattern,
  };
  const scores = analysis?.scores || {};
  const mixedSignals = analysis?.mixedSignalsMap || {};
  const energy = analysis?.energyMatchScore || {};
  const dayNight = analysis?.dayNightDynamics || relationshipReport.dayNightDynamics || {};
  const timeline = list(analysis?.timeline).length ? list(analysis.timeline) : list(analysis?.turningPoints).map((point, index) => ({
    period: point.period || `Phase ${index + 1}`,
    title: point.title || 'Signal shift',
    happened: point.whatChanged,
    why: point.whyItMatters,
    quote: point.quote,
    sentiment: 'mixed',
    compatibility: scores.compatibility || 50,
  }));
  const storyboard = list(analysis?.sentimentStoryboard);
  const flags = {
    red: list(relationshipReport.redFlags || analysis?.improvedRedFlags || analysis?.redFlags),
    green: list(relationshipReport.greenFlags || analysis?.improvedGreenFlags || analysis?.greenFlags),
  };
  const senderStats = list(prepared.senderStats || analysis?.participants?.messageCountByParticipant);
  const volumeByPeriod = list(dayNight.volumeByPeriod || prepared.dailyNightBreakdown);
  const reportDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const detectedLanguage = prepared.languageStyle || analysis?.detectedLanguageStyle?.recommendedOutputStyle || analysis?.reportSummaryForFutureUse?.languageStyle || 'Language style inferred from the chat';

  async function exportFullReport() {
    try {
      await exportElementAsImage('relationship-report-export', `thirdperson-relationship-report-${new Date().toISOString().slice(0, 10)}.png`);
      setToast('Report card downloaded.');
    } catch {
      setToast('Could not export this report on this device.');
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
    return (
      <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
        <ParticleBackground className="opacity-70" />
        <div className="relative mx-auto max-w-5xl">
          <div className="accent-panel corner-frame p-8 text-center sm:p-14">
            <p className="tech-label text-smoke">Relationship Intelligence Report</p>
            <h1 className="serif-title mx-auto mt-5 max-w-3xl text-5xl leading-tight sm:text-7xl">Your report will appear here.</h1>
            <p className="mx-auto mt-6 max-w-2xl text-sm leading-8 text-smoke">
              Run an analysis to unlock emotional timelines, score cards, sticky notes, receipts, word clouds, and a clear next move.
            </p>
            <button onClick={() => navigate('/analysis/new')} className="glass-button mt-8 rounded-full px-6 py-4 font-mono text-xs uppercase tracking-[0.16em] text-bone">
              Start a conversation analysis
            </button>
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

  const dayPie = volumeByPeriod.map((item) => ({ name: item.period, value: item.percentage || item.count || 0 }));
  const participantPie = senderStats.map((item) => ({ name: item.sender, value: item.count || 0 }));
  const signalPie = [
    { name: 'Green signals', value: Math.max(flags.green.length, 1) },
    { name: 'Red signals', value: Math.max(flags.red.length, 1) },
  ];
  const affectionTensionPie = [
    { name: 'Affection', value: prepared.affectionSignals?.count || dayNight.affectionByPeriod?.reduce((sum, item) => sum + (item.count || 0), 0) || 1 },
    { name: 'Tension', value: prepared.conflictSignals?.count || dayNight.tensionByPeriod?.reduce((sum, item) => sum + (item.count || 0), 0) || 1 },
  ];

  const radarData = [
    { subject: 'You', value: Number(energy.score || scores.effortBalance || 50) },
    { subject: personName, value: Number(scores.communicationHealth || 50) },
    { subject: 'Clarity', value: Number(scores.clarity || 50) },
    { subject: 'Safety', value: Number(scores.emotionalSafety || 50) },
    { subject: 'Trust', value: Number(scores.trustSignal || 50) },
  ];

  const receipts = [
    ...list(analysis.turningPoints).map((point) => ({
      title: point.title,
      quote: point.quote,
      why: point.whyItMatters,
      signal: point.whatChanged,
    })),
    ...list(prepared.importantMoments).slice(0, 5).map((moment) => ({
      title: moment.period || 'Emotional moment',
      quote: moment.text || moment.message,
      why: 'This stood out because it carried emotional language or a repeated signal.',
      signal: list(moment.emotionalTags).join(', ') || 'emotional signal',
    })),
  ].filter((item) => item.quote).slice(0, 8);

  const reportStickyNotes = list(relationshipReport.stickyNotes || analysis.aiStickyNotes);
  const stickyNotes = reportStickyNotes.length
    ? reportStickyNotes.map((note, index) => [
      note.label || note.title || ['What the AI noticed', 'What feels important', 'What not to ignore', 'What needs clarity'][index % 4],
      note.value || note.text || note.summary || note,
    ])
    : [
      ['What the AI noticed', summary.mainEmotionalPattern || analysis.simpleSummaryForYoungAudience],
      ['What feels important', energy.explanation || summary.currentDynamic],
      ['What not to ignore', analysis.bestieBreakdown?.whatNotToIgnore],
      ['What needs clarity', mixedSignals.bestieNote],
      ['Guidance note', analysis.friendsWouldNotice?.theyMightRemindYou],
      ['The soft truth', analysis.screenshotWorthySummary || relationshipReport.vibeLabel],
      ['The next best move', relationshipReport.nextBestMove || analysis.advice?.nextBestStep],
    ];
  const reportWordCloud = list(relationshipReport.wordCloud);
  const wordCloudWords = {
    userTopWords: analysis.wordCloud?.userTopWords || reportWordCloud.filter((item) => item.owner === 'mainUser' || item.group === 'mainUser'),
    otherTopWords: analysis.wordCloud?.otherTopWords || reportWordCloud.filter((item) => item.owner === 'otherPerson' || item.group === 'otherPerson'),
    shared: reportWordCloud.length ? reportWordCloud : list(prepared.topWords),
  };

  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
      <ParticleBackground className="opacity-80" />
      <div id="relationship-report-export" data-export-bg="#090817" className="relative mx-auto max-w-[1560px] rounded-[38px] bg-[#090817]/70 p-2 sm:p-4">
        <header className="accent-panel glow-border relative mb-6 overflow-hidden p-6 sm:p-8">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-purple-400/25 blur-3xl" />
          <div className="absolute -bottom-20 left-1/4 h-64 w-64 rounded-full bg-pink-400/18 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-4xl">
              <p className="tech-label text-purple-100">Relationship Intelligence Report</p>
              <h1 className="serif-title mt-4 text-5xl leading-none sm:text-7xl">{personName}</h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-smoke">
                This is your private emotional map of what the conversation appears to show: warm signals, clarity gaps, energy balance, key moments, and the next best move.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Badge tone="purple">{meta.relationshipType || flow.relationshipType || 'Relationship'}</Badge>
                <Badge tone="blue">{meta.platform || flow.platform || 'Chat'}</Badge>
                <Badge tone="pink">{prepared.estimatedDateRange || 'Period unclear'}</Badge>
                <Badge tone="orange">{(prepared.messageCount || 0).toLocaleString()} messages</Badge>
              </div>
            </div>
            <div className="grid min-w-[260px] gap-3 rounded-[28px] border border-white/14 bg-white/[0.06] p-4 backdrop-blur">
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
              <button data-export-ignore onClick={exportFullReport} className="glass-button mt-2 rounded-full px-4 py-3 font-mono text-xs uppercase tracking-[0.15em] text-bone">
                Download Report
              </button>
            </div>
          </div>
          {(flow.analysisError || flow.cacheNotice || toast) && (
            <p data-export-ignore className="relative mt-5 rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm leading-7 text-smoke">
              {toast || flow.cacheNotice || flow.analysisError}
            </p>
          )}
        </header>

        <div className="grid gap-5">
          <CardShell id="report-summary-card" title="Relationship Summary" emoji="✨" summary={analysis.screenshotWorthySummary || summary.currentDynamic} accent="pink">
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
                  <div key={label} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                    <p className="tech-label text-ash">{label}</p>
                    <p className="mt-2 text-sm leading-7 text-bone">{safe(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardShell>

          <section id="score-cards" data-export-bg="#090817" className="relative">
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="tech-label text-emerald-100">Score Cards 🧠</p>
              <CardActions targetId="score-cards" name="score-cards" summary={`Compatibility ${scores.compatibility || 0}/100`} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {scoreCards.map((item) => <ScoreBubble key={item.key} item={item} />)}
            </div>
          </section>

          <CardShell id="emotional-timeline" title="Emotional Timeline" emoji="✨" summary="Timeline of emotional phases." accent="blue">
            <div className="overflow-x-auto pb-3">
              <div className="relative flex min-w-[920px] items-start gap-5 px-2">
                <div className="absolute left-12 right-12 top-[4.1rem] h-1 rounded-full bg-gradient-to-r from-orange-300 via-purple-300 to-pink-300 opacity-70" />
                {(timeline.length ? timeline : Array.from({ length: 5 })).map((item = {}, index) => (
                  <button
                    key={`${item.period}-${index}`}
                    onClick={() => setSelectedTimeline(index)}
                    className="group relative w-40 shrink-0 text-left"
                  >
                    <p className="h-12 font-mono text-[0.67rem] uppercase tracking-[0.13em] text-ash">{compactPeriod(item.period, index)}</p>
                    <span className={`relative z-10 block h-7 w-7 rounded-full border ${selectedTimeline === index ? 'border-violet-100 bg-violet-200 shadow-[0_0_34px_rgba(167,139,250,0.55)]' : 'border-white/35 bg-white/10'} transition group-hover:border-pink-200`} />
                    <div className="mt-5 rounded-2xl border border-white/12 bg-white/[0.05] p-4 backdrop-blur">
                      <p className="text-sm font-semibold text-bone">{item.title || ['Soft beginning', 'Flirty rise', 'Confusion phase', 'Distance phase', 'Clarity moment'][index % 5]}</p>
                      <p className="mt-2 text-xs leading-5 text-smoke">{item.sentiment || 'mixed'} • {item.compatibility || scores.compatibility || 50}/100</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 grid gap-4 rounded-[26px] border border-white/10 bg-white/[0.045] p-5 md:grid-cols-3">
              {[
                ['What changed', timeline[selectedTimeline]?.happened || timeline[selectedTimeline]?.whatChanged],
                ['Why it matters', timeline[selectedTimeline]?.why || timeline[selectedTimeline]?.whyItMatters],
                ['Receipt', timeline[selectedTimeline]?.quote],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="tech-label text-ash">{label}</p>
                  <p className="mt-3 text-sm leading-7 text-smoke">{safe(value, 'More chats can make this phase clearer.')}</p>
                </div>
              ))}
            </div>
          </CardShell>

          <CardShell id="sentiment-storyboard" title="Sentiment Storyboard" emoji="🎬" summary="Relationship story scenes from this chat." accent="purple">
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={storyboard.length ? storyboard : timeline.map((item, index) => ({ period: compactPeriod(item.period, index), intensity: item.compatibility || 50 }))} margin={{ top: 10, right: 14, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="storyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f472b6" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="period" tick={{ fill: '#b9b7b1', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#7b7a75', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'rgba(10,8,24,.92)', border: '1px solid rgba(255,255,255,.18)', borderRadius: 16, color: '#f3f1ed' }} />
                  <Area type="monotone" dataKey="intensity" stroke="#f472b6" fill="url(#storyGradient)" strokeWidth={2.4} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
              {(storyboard.length ? storyboard : timeline.slice(0, 5)).map((item, index) => (
                <div key={`${item.period}-${index}`} className="sticky-glass min-w-[250px] rotate-[-1deg] p-4 even:rotate-[1deg]">
                  <p className="text-3xl">{['✨', '💬', '🌙', '💭', '🫶'][index % 5]}</p>
                  <p className="mt-3 text-lg text-bone">{item.sceneTitle || item.title || ['The warm phase', 'The mixed signal moment', 'The emotional distance', 'The repair attempt', 'The current energy'][index % 5]}</p>
                  <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-ash">{compactPeriod(item.period, index)} • {item.emotion || item.sentiment || 'mixed'}</p>
                  <p className="mt-3 text-sm leading-6 text-smoke">{safe(item.explanation || item.happened || item.whatChanged, 'This scene needs more conversation evidence.')}</p>
                </div>
              ))}
            </div>
          </CardShell>

          <CardShell id="day-night-dynamics" title="Day vs Night Dynamics" emoji="🌙" summary={dayNight.interpretation} accent="blue">
            <p className="max-w-3xl text-sm leading-7 text-smoke">A softer look at when the conversation feels warmer, heavier, more active, or more emotionally intense.</p>
            <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
              <div className="h-80 rounded-[26px] border border-white/10 bg-black/15 p-4">
                <ResponsiveContainer>
                  <BarChart data={volumeByPeriod}>
                    <XAxis dataKey="period" tick={{ fill: '#b9b7b1', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#7b7a75', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'rgba(10,8,24,.92)', border: '1px solid rgba(255,255,255,.18)', borderRadius: 16, color: '#f3f1ed' }} />
                    <Bar dataKey="count" radius={[12, 12, 0, 0]}>
                      {volumeByPeriod.map((item, index) => <Cell key={item.period || index} fill={['#38bdf8', '#f472b6', '#7c3aed'][index % 3]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="h-72 rounded-[26px] border border-white/10 bg-black/15 p-4">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={dayPie} dataKey="value" nameKey="name" innerRadius={54} outerRadius={90} paddingAngle={4}>
                        {dayPie.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'rgba(10,8,24,.92)', border: '1px solid rgba(255,255,255,.18)', borderRadius: 16, color: '#f3f1ed' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid gap-3">
                  {[
                    ['Most active period', dayNight.mostActivePeriod, '06:00–17:59 / 18:00–21:59 / 22:00–05:59'],
                    ['Warmest period', dayNight.warmestPeriod],
                    ['Highest tension period', dayNight.highestTensionPeriod],
                    ['Deepest conversation period', dayNight.deepestConversationPeriod],
                  ].map(([label, value, note]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
                      <p className="tech-label text-ash">{label}</p>
                      <p className="mt-2 text-xl text-bone">{safe(value)}</p>
                      {note && <p className="mt-1 text-xs text-ash">Day / Evening / Night windows</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-smoke">{safe(dayNight.interpretation, 'More timestamped chats can make this section stronger.')}</p>
          </CardShell>

          <CardShell id="word-cloud" title="Word Cloud / Top Words" emoji="☁️" summary="Weighted language chips from this conversation." accent="pink">
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
                <p className="tech-label mb-4 text-ash">Your top words</p>
                <WeightedChips words={wordCloudWords.userTopWords || []} />
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
                <p className="tech-label mb-4 text-ash">{personName}’s top words</p>
                <WeightedChips words={wordCloudWords.otherTopWords || []} />
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
                <p className="tech-label mb-4 text-ash">Shared emotional words</p>
                <WeightedChips words={wordCloudWords.shared.filter((item) => emotionalWords.includes(String(item.word || item.label || item).toLowerCase()))} fallback="No strong emotional word cluster yet." />
              </div>
              <div className="rounded-[24px] border border-orange-200/15 bg-orange-300/[0.055] p-4 lg:col-span-3">
                <p className="tech-label mb-4 text-orange-100">Affection + conflict signals</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <WeightedChips words={wordCloudWords.shared.filter((item) => affectionWords.includes(String(item.word || item.label || item).toLowerCase()))} fallback="Affection words were not strong in this sample." />
                  <WeightedChips words={wordCloudWords.shared.filter((item) => conflictWords.includes(String(item.word || item.label || item).toLowerCase()))} fallback="Conflict words were not strong in this sample." />
                </div>
              </div>
            </div>
          </CardShell>

          <div className="grid gap-5 lg:grid-cols-2">
            <CardShell id="red-flags" title="Red Flags" emoji="🚩" summary="Gentle red flag reflections." accent="pink">
              <div className="grid gap-4">
                {flags.red.length ? flags.red.map((flag, index) => (
                  <div key={`${flag.label}-${index}`} className="rounded-[24px] border border-pink-200/16 bg-pink-300/[0.055] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-xl text-bone">{safe(flag.label || flag.title, 'Pattern worth noticing')}</h3>
                      <Badge tone="pink">{flag.severity || 'soft signal'}</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-smoke">{safe(flag.explanation, 'This may be worth noticing based on the conversation.')}</p>
                    <p className="mt-3 text-sm leading-7 text-smoke"><span className="text-pink-100">Why it matters:</span> {safe(flag.whyItMatters, 'This could affect clarity or emotional safety over time.')}</p>
                    <p className="mt-3 text-sm leading-7 text-smoke"><span className="text-pink-100">Reflection:</span> {safe(flag.reflectionQuestion, 'What would you need to ask clearly instead of guessing?')}</p>
                  </div>
                )) : <EmptyHint>This conversation did not show strong red flag evidence. That does not prove everything is fine, it just means the signal is limited.</EmptyHint>}
              </div>
            </CardShell>

            <CardShell id="green-flags" title="Green Flags" emoji="🟢" summary="Positive signals from this conversation." accent="green">
              <div className="grid gap-4">
                {flags.green.length ? flags.green.map((flag, index) => (
                  <div key={`${flag.label}-${index}`} className="rounded-[24px] border border-emerald-200/16 bg-emerald-300/[0.045] p-4">
                    <h3 className="text-xl text-bone">{safe(flag.label || flag.title, 'Promising signal')}</h3>
                    <p className="mt-3 text-sm leading-7 text-smoke">{safe(flag.explanation, 'A possible positive sign appears in this chat.')}</p>
                    <p className="mt-3 text-sm leading-7 text-smoke"><span className="text-emerald-100">Why it matters:</span> {safe(flag.whyItMatters, 'Healthy signals can create room for calmer repair.')}</p>
                    <p className="mt-3 text-sm leading-7 text-smoke"><span className="text-emerald-100">Build on it:</span> {safe(flag.howToBuildOnIt, 'Name the good signal and ask for one clear next step.')}</p>
                  </div>
                )) : <EmptyHint>Green flags were not strong in this sample yet. More chats can make this clearer.</EmptyHint>}
              </div>
            </CardShell>
          </div>

          <CardShell id="mixed-signals-map" title="Mixed Signals Map" emoji="🧭" summary={mixedSignals.bestieNote} accent="purple">
            <div className="grid gap-4 md:grid-cols-4">
              {[
                ['Warm signals', mixedSignals.warmSignals, '💗', 'border-pink-200/16 bg-pink-300/[0.055]'],
                ['Distant signals', mixedSignals.distantSignals, '🌫️', 'border-violet-200/16 bg-violet-300/[0.055]'],
                ['Confusing signals', mixedSignals.confusingSignals, '🌀', 'border-purple-200/16 bg-purple-300/[0.055]'],
                ['Stable signals', mixedSignals.stableSignals, '🫶', 'border-emerald-200/16 bg-emerald-300/[0.045]'],
              ].map(([label, value, icon, cls]) => (
                <div key={label} className={`rounded-[24px] border p-4 ${cls}`}>
                  <p className="text-2xl">{icon}</p>
                  <p className="tech-label mt-3 text-ash">{label}</p>
                  <p className="mt-3 text-sm leading-7 text-smoke">{safe(value)}</p>
                </div>
              ))}
            </div>
            <div className="sticky-glass mx-auto mt-5 max-w-3xl rotate-[-1deg] p-5">
              <p className="tech-label text-orange-100">Guidance note</p>
              <p className="mt-3 text-lg leading-8 text-bone">{safe(mixedSignals.bestieNote, 'This looks like mixed signals, not a clear yes. More consistency would make the signal stronger.')}</p>
            </div>
          </CardShell>

          <CardShell id="energy-match" title="Energy Match Score" emoji="⚡" summary={energy.explanation} accent="orange">
            <div className="grid gap-5 xl:grid-cols-[.75fr_1.25fr]">
              <div className="flex flex-col justify-between rounded-[28px] border border-orange-200/16 bg-orange-300/[0.055] p-5">
                <div>
                  <p className="tech-label text-orange-100">Overall energy match</p>
                  <p className="serif-title mt-3 text-7xl">{Number(energy.score ?? scores.effortBalance) || 50}</p>
                  <p className="mt-4 text-sm leading-7 text-smoke">{safe(energy.explanation, 'The energy balance needs more data, but effort and clarity are the main things to watch.')}</p>
                </div>
                <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-orange-300 via-pink-300 to-purple-300" style={{ width: `${Number(energy.score ?? scores.effortBalance) || 50}%` }} />
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ['Your energy', energy.userEnergy],
                    [`${personName}’s energy`, energy.otherPersonEnergy],
                    ['Effort balance', energy.effortBalance],
                    ['Emotional availability', energy.emotionalAvailability],
                    ['Consistency', energy.consistency],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
                      <p className="tech-label text-ash">{label}</p>
                      <p className="mt-3 text-sm leading-7 text-bone">{safe(value)}</p>
                    </div>
                  ))}
                </div>
                <div className="h-72 rounded-[26px] border border-white/10 bg-black/15 p-4">
                  <ResponsiveContainer>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,.16)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#b9b7b1', fontSize: 10 }} />
                      <Radar dataKey="value" stroke="#f472b6" fill="#a78bfa" fillOpacity={0.32} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </CardShell>

          <CardShell id="communication-pattern-map" title="Communication Pattern Map" emoji="💬" summary={analysis.communicationPatterns?.conflictStyle} accent="blue">
            <div className="grid gap-4 lg:grid-cols-5">
              {[
                ['Your style', analysis.communicationPatterns?.userStyle],
                [`${personName}’s style`, analysis.communicationPatterns?.otherPersonStyle],
                ['Conflict style', analysis.communicationPatterns?.conflictStyle],
                ['Repair attempts', analysis.communicationPatterns?.repairAttempts],
                ['Avoidance pattern', analysis.communicationPatterns?.avoidancePatterns],
              ].map(([label, value], index) => (
                <div key={label} className="relative rounded-[24px] border border-white/10 bg-white/[0.05] p-4">
                  {index < 4 && <span className="absolute -right-3 top-1/2 hidden h-px w-6 bg-gradient-to-r from-purple-300 to-pink-300 lg:block" />}
                  <p className="tech-label text-ash">{label}</p>
                  <p className="mt-3 text-sm leading-7 text-smoke">{safe(value)}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="sticky-glass p-4">
                <p className="tech-label text-purple-100">Clarity pattern</p>
                <p className="mt-3 text-sm leading-7 text-smoke">{safe(analysis.relationshipReport?.communicationPattern || analysis.communicationPatterns?.relationshipPattern || summary.currentDynamic)}</p>
              </div>
              <div className="sticky-glass rotate-[1deg] p-4">
                <p className="tech-label text-purple-100">Quote evidence</p>
                <p className="mt-3 text-sm leading-7 text-smoke">{receipts[0]?.quote ? `“${receipts[0].quote.slice(0, 180)}”` : 'More clear quote evidence will appear when the uploaded chat has stronger moments.'}</p>
              </div>
            </div>
          </CardShell>

          <CardShell id="pie-chart-lab" title="Signal Donut Lab" emoji="🍩" summary="Pie charts for participant, time, and signal balance." accent="purple">
            <div className="grid gap-5 lg:grid-cols-4">
              {[
                ['Message share', participantPie],
                ['Day / evening / night', dayPie],
                ['Flag balance', signalPie],
                ['Affection vs tension', affectionTensionPie],
              ].map(([label, data], chartIndex) => (
                <div key={label} className="rounded-[26px] border border-white/10 bg-black/15 p-4">
                  <p className="tech-label text-ash">{label}</p>
                  <div className="mt-3 h-56">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={data.length ? data : [{ name: emptyText, value: 1 }]} dataKey="value" nameKey="name" innerRadius={45} outerRadius={76} paddingAngle={4}>
                          {(data.length ? data : [{ name: emptyText }]).map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={chartColors[(index + chartIndex) % chartColors.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'rgba(10,8,24,.92)', border: '1px solid rgba(255,255,255,.18)', borderRadius: 16, color: '#f3f1ed' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          </CardShell>

          <CardShell id="ai-sticky-notes" title="AI Sticky Notes" emoji="💭" summary="Small reflections from this report." accent="orange">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stickyNotes.map(([label, value], index) => (
                <div key={label} className={`sticky-glass min-h-44 p-5 ${index % 2 ? 'rotate-[1deg]' : 'rotate-[-1deg]'}`}>
                  <span className="block h-3 w-3 rounded-full bg-gradient-to-r from-pink-300 to-orange-300 shadow-[0_0_22px_rgba(251,146,60,0.55)]" />
                  <p className="tech-label mt-4 text-ash">{label}</p>
                  <p className="mt-3 text-sm leading-7 text-bone">{safe(value, 'More chats can make this sticky note clearer.')}</p>
                </div>
              ))}
            </div>
          </CardShell>

          <CardShell id="receipts-ai-noticed" title="Receipts AI Noticed" emoji="🧾" summary="Short representative moments from the conversation." accent="blue">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {receipts.length ? receipts.map((receipt, index) => (
                <div key={`${receipt.title}-${index}`} className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
                  <p className="tech-label text-purple-100">{receipt.title || `Moment ${index + 1}`}</p>
                  <p className="mt-3 font-mono text-sm leading-7 text-bone">“{String(receipt.quote).slice(0, 170)}”</p>
                  <p className="mt-3 text-sm leading-7 text-smoke">{safe(receipt.why)}</p>
                  <Badge tone="blue">{safe(receipt.signal, 'relationship signal')}</Badge>
                </div>
              )) : <EmptyHint>No short receipts are strong enough yet. More message history can reveal better evidence.</EmptyHint>}
            </div>
          </CardShell>

          <CardShell id="next-best-move" title="Next Best Move" emoji="💬" summary={analysis.advice?.nextBestStep} accent="orange">
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
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                    <p className="tech-label text-ash">{label}</p>
                    <p className="mt-2 text-sm leading-7 text-bone">{safe(value)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div data-export-ignore className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => navigate('/reports')} className="glass-button rounded-full px-5 py-3 font-mono text-xs uppercase tracking-[0.14em] text-bone">Open AI Relationship Coach</button>
              <button onClick={exportFullReport} className="glass-button rounded-full px-5 py-3 font-mono text-xs uppercase tracking-[0.14em] text-bone">Download Report Card</button>
              <button onClick={shareSummary} className="glass-button rounded-full px-5 py-3 font-mono text-xs uppercase tracking-[0.14em] text-bone">Share Summary</button>
            </div>
          </CardShell>

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
