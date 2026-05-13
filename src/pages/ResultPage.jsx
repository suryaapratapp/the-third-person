import { useMemo, useState } from 'react';
import ParticleBackground from '../components/ParticleBackground.jsx';
import ScoreCard from '../components/ScoreCard.jsx';
import TimelineChart from '../components/TimelineChart.jsx';
import SentimentStoryboard from '../components/SentimentStoryboard.jsx';
import PersonalityCard from '../components/PersonalityCard.jsx';
import WordCloudChips from '../components/WordCloudChips.jsx';
import RedGreenFlags from '../components/RedGreenFlags.jsx';
import PersonalitySnapshot from '../components/PersonalitySnapshot.jsx';
import ConversationRecap from '../components/ConversationRecap.jsx';
import DayNightDynamics from '../components/DayNightDynamics.jsx';
import CardActions from '../components/CardActions.jsx';
import ShareableInsights from '../components/ShareableInsights.jsx';
import CommunicationStyleSignals from '../components/CommunicationStyleSignals.jsx';
import ZodiacCompatibilityCard from '../components/ZodiacCompatibilityCard.jsx';
import { getZodiacGlyph } from '../lib/zodiac.js';
import { exportElementAsImage } from '../lib/exportElementAsImage.js';
import { useAnalysis } from '../state/AnalysisContext.jsx';
import { useRouter } from '../state/RouterContext.jsx';

function DownloadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v12" strokeLinecap="round" />
      <path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20h14" strokeLinecap="round" />
    </svg>
  );
}

export default function ResultPage() {
  const { flow } = useAnalysis();
  const { navigate } = useRouter();
  const [selectedTimeline, setSelectedTimeline] = useState(0);
  const [isExportingReport, setIsExportingReport] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const analysis = useMemo(() => flow.analysisResult, [flow.analysisResult]);
  const prepared = flow.preparedConversation;
  const meta = prepared?.metadata || analysis?.conversationRecap || {};
  const profileName = [prepared?.metadata?.userProfile?.firstName, prepared?.metadata?.userProfile?.lastName].filter(Boolean).join(' ');
  const personName = meta.personName || flow.personName || analysis?.participants?.selectedOtherPerson || 'Their';

  async function exportFullReport() {
    try {
      setIsExportingReport(true);
      const date = new Date().toISOString().slice(0, 10);
      await exportElementAsImage('relationship-report-export', `thirdperson-relationship-report-${date}.png`);
      setReportMessage('Report image downloaded.');
    } catch {
      setReportMessage('Could not export the full report on this device. Please try again on desktop.');
    } finally {
      setIsExportingReport(false);
    }
  }

  if (!analysis) {
    return (
      <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
        <ParticleBackground className="opacity-50" />
        <div className="relative mx-auto max-w-5xl">
          <div className="corner-frame accent-panel p-8 text-center sm:p-14">
            <p className="tech-label text-smoke">Relationship Intelligence Summary</p>
            <h1 className="serif-title mx-auto mt-5 max-w-3xl text-5xl leading-tight sm:text-7xl">Your analysis will appear here.</h1>
            <p className="mx-auto mt-6 max-w-2xl text-sm leading-8 text-smoke">
              Run an analysis to generate your first relationship intelligence summary, emotional timeline, communication pattern map, personality snapshot, and conversation recap.
            </p>
            <button onClick={() => navigate('/analysis/new')} className="glass-button mt-8 px-5 py-4 font-mono text-xs uppercase tracking-[0.16em] text-bone">
              Start a conversation analysis
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
      <ParticleBackground className="opacity-50" />
      <div id="relationship-report-export" data-export-bg="#15101f" className="relative mx-auto max-w-[1540px] rounded-[34px] bg-[#15101f]/60 p-2 sm:p-4">
        <header className="mb-8 overflow-hidden rounded-[28px] border border-purple-200/20 bg-gradient-to-br from-white/[0.09] via-purple-300/[0.055] to-pink-300/[0.04] p-5 shadow-[0_22px_90px_rgba(168,85,247,0.10)]">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="tech-label text-smoke">ThirdPerson AI</p>
              <h1 className="serif-title mt-3 text-5xl leading-none sm:text-7xl">Relationship Intelligence Summary</h1>
            </div>
            <div className="flex items-start gap-4">
              <div className="grid gap-2 font-mono text-xs uppercase tracking-[0.13em] text-smoke sm:text-right">
                <span>{meta.platform || flow.platform}</span>
                <span>{meta.relationshipType || flow.relationshipType}</span>
                <span>{meta.personName || flow.personName}</span>
                <span>{prepared?.estimatedDateRange || 'Date range unavailable'}</span>
                <span>Private by design • Reflective insights</span>
              </div>
              <button
                data-export-ignore
                onClick={exportFullReport}
                disabled={isExportingReport}
                aria-label="Download full relationship report"
                title="Download full relationship report"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-purple-200/30 bg-purple-300/12 text-bone shadow-[0_0_35px_rgba(168,85,247,0.18)] transition hover:border-pink-200/60 hover:bg-pink-300/14 disabled:opacity-50"
              >
                <DownloadIcon />
              </button>
            </div>
          </div>
          {flow.analysisError && <p className="mt-5 border-t border-white/10 pt-4 text-sm leading-7 text-smoke">{flow.analysisError}</p>}
          {flow.cacheNotice && <p className="mt-5 border-t border-purple-300/15 pt-4 text-sm leading-7 text-purple-100">{flow.cacheNotice}</p>}
          {reportMessage && <p data-export-ignore className="mt-5 border-t border-pink-300/15 pt-4 text-sm leading-7 text-pink-100">{reportMessage}</p>}
        </header>

        <div className="grid gap-5">
          <section id="card-relationship-summary" className="thin-panel relative p-5 sm:p-8">
            <CardActions targetId="card-relationship-summary" name="relationship-summary" summary={analysis.simpleSummaryForYoungAudience || analysis.summary?.currentDynamic} />
            <p className="tech-label text-purple-200">Relationship Intelligence Summary ✨</p>
            {analysis.simpleSummaryForYoungAudience && <p className="mt-4 text-lg leading-8 text-bone">{analysis.simpleSummaryForYoungAudience}</p>}
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              {[
                [`Your energy with ${personName}`, analysis.energyMatchScore?.userEnergy || 'Emotionally present and clarity-seeking.'],
                ['Where the connection feels warm', analysis.mixedSignalsMap?.warmSignals?.join(', ') || 'Warmth appears in small repair signals.'],
                ['Where clarity drops', analysis.mixedSignalsMap?.confusingSignals?.join(', ') || analysis.summary?.mainEmotionalPattern],
                [`What ${personName}’s replies may suggest`, analysis.energyMatchScore?.otherPersonEnergy || 'Their replies may need to be read through consistency, timing, and effort.'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="tech-label text-ash">{label}</p>
                  <p className="mt-3 text-sm leading-7 text-smoke">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-4">
              {Object.entries(analysis.summary).map(([key, value]) => (
                <div key={key} className="border border-white/10 p-4">
                  <p className="tech-label mb-3 text-ash">{key.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="text-sm leading-7 text-smoke">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <ShareableInsights analysis={analysis} personName={personName} />

          <section id="card-score-cards" className="relative">
            <CardActions targetId="card-score-cards" name="score-cards" summary={`Compatibility ${analysis.scores.compatibility}/100. Communication health ${analysis.scores.communicationHealth}/100.`} />
            <p className="tech-label mb-4 text-emerald-200">Score Cards</p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Object.entries(analysis.scores).map(([key, score]) => <ScoreCard key={key} name={key} score={score} />)}
            </div>
          </section>

          <section className="thin-panel p-5">
            <p className="tech-label text-blue-200">People in this analysis</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Conversation names', analysis.participants?.detectedParticipants?.join(', ') || prepared?.participants?.join(', ') || 'Not enough data'],
                ['You', profileName || analysis.participants?.likelyMainUser || prepared?.metadata?.likelyMainUser || 'Not clear yet'],
                [`${personName}`, analysis.participants?.selectedOtherPerson || prepared?.metadata?.selectedOtherPerson || meta.personName],
                ['Your zodiac', prepared?.metadata?.userProfile?.zodiacSign ? `${getZodiacGlyph(prepared.metadata.userProfile.zodiacSign)} ${prepared.metadata.userProfile.zodiacSign} ${prepared.metadata.userProfile.zodiacElement || ''}` : 'Add date of birth to unlock zodiac reflection'],
                [`${personName}’s zodiac`, prepared?.metadata?.otherPersonZodiac?.sign ? `${prepared.metadata.otherPersonZodiac.glyph || ''} ${prepared.metadata.otherPersonZodiac.sign} ${prepared.metadata.otherPersonZodiac.element || ''}` : 'Add date of birth to unlock zodiac reflection'],
                ['Date range', prepared?.estimatedDateRange || 'Date range unavailable'],
              ].map(([label, value]) => (
                <div key={label} className="border border-blue-300/15 bg-blue-300/[0.035] p-4">
                  <p className="tech-label text-ash">{label}</p>
                  <p className="mt-3 text-sm leading-6 text-bone">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <ZodiacCompatibilityCard analysis={analysis} prepared={prepared} personName={personName} />

          <div id="card-emotional-timeline" className="relative">
            <CardActions targetId="card-emotional-timeline" name="emotional-timeline" summary="Emotional timeline from this relationship analysis." />
            <TimelineChart items={analysis.timeline} selectedIndex={selectedTimeline} onSelect={setSelectedTimeline} />
          </div>
          <div id="card-sentiment-storyboard" className="relative">
            <CardActions targetId="card-sentiment-storyboard" name="sentiment-storyboard" summary="Sentiment storyboard from this relationship analysis." />
            <SentimentStoryboard data={analysis.sentimentStoryboard} />
          </div>
          <div id="card-day-night-dynamics" className="relative">
            <CardActions targetId="card-day-night-dynamics" name="day-night-dynamics" summary={analysis.dayNightDynamics?.interpretation} />
            <DayNightDynamics dynamics={analysis.dayNightDynamics} />
          </div>

          <section className="grid gap-5 lg:grid-cols-2">
            <div id="card-engagement-psychology" className="thin-panel relative p-5">
              <CardActions targetId="card-engagement-psychology" name="engagement-psychology" summary={analysis.engagementAnalysis?.balance} />
              <p className="tech-label text-orange-200">Engagement Psychology 🔥</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  ['Your engagement', analysis.engagementAnalysis.userEngagement],
                  [`${personName}’s engagement`, analysis.engagementAnalysis.otherPersonEngagement],
                  ['Balance', analysis.engagementAnalysis.balance],
                ].map(([label, value]) => (
                  <div key={label} className="border border-white/10 p-4">
                    <p className="tech-label text-ash">{label}</p>
                    <p className="mt-3 text-2xl text-bone">{value}</p>
                  </div>
                ))}
              </div>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-smoke">
                {analysis.engagementAnalysis.notablePatterns.map((pattern) => <li key={pattern}>▪ {pattern}</li>)}
              </ul>
            </div>
            <div id="card-communication-pattern-map" className="thin-panel relative p-5">
              <CardActions targetId="card-communication-pattern-map" name="communication-pattern-map" summary={analysis.communicationPatterns?.conflictStyle} />
              <p className="tech-label text-blue-200">Communication Pattern Map 💬</p>
              <div className="mt-5 space-y-4">
                {Object.entries(analysis.communicationPatterns).map(([label, value]) => (
                  <div key={label} className="border-b border-white/10 pb-3 last:border-b-0">
                    <p className="tech-label text-ash">{label.replace(/([A-Z])/g, ' $1')}</p>
                    <p className="mt-2 text-sm leading-7 text-smoke">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="card-personality-analysis" className="relative thin-panel p-5">
            <CardActions targetId="card-personality-analysis" name="personality-analysis" summary={analysis.personality?.user?.profile} />
            <p className="tech-label mb-4 text-purple-200">Personality Analysis</p>
            <div className="grid gap-5 lg:grid-cols-2">
              <PersonalityCard title="Your Personality Signal" profile={analysis.personality.user} />
              <PersonalityCard title={`${personName}’s Personality Signal`} profile={analysis.personality.otherPerson} />
            </div>
          </section>

          <section id="card-word-cloud" className="relative thin-panel p-5">
            <CardActions targetId="card-word-cloud" name="word-cloud" summary="Top words and recurring language from this conversation." />
            <p className="tech-label mb-4 text-pink-200">Word Cloud / Top Words</p>
            <div className="grid gap-5 lg:grid-cols-2">
              <WordCloudChips title="Your top words" words={analysis.wordCloud.userTopWords} />
              <WordCloudChips title={`${personName}’s top words`} words={analysis.wordCloud.otherTopWords} />
            </div>
          </section>

          <RedGreenFlags redFlags={analysis.improvedRedFlags || analysis.redFlags} greenFlags={analysis.improvedGreenFlags || analysis.greenFlags} />
          <CommunicationStyleSignals signals={analysis.communicationStyleSignals} personName={personName} />

          <section id="card-clarity-recommendations" className="thin-panel relative p-5">
            <CardActions targetId="card-clarity-recommendations" name="clarity-recommendations" summary={analysis.advice?.nextBestStep} />
            <p className="tech-label text-blue-200">Clarity Notes 💬</p>
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              {Object.entries(analysis.advice).map(([label, value]) => (
                <div key={label} className="border border-white/10 p-4">
                  <p className="tech-label text-ash">{label.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="mt-3 text-sm leading-7 text-smoke">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <div id="card-personality-snapshot" className="relative">
            <CardActions targetId="card-personality-snapshot" name="personality-snapshot" summary={analysis.personalitySnapshot?.communicationStyle} />
            <PersonalitySnapshot snapshot={analysis.personalitySnapshot} />
          </div>
          <div id="card-conversation-recap" className="relative">
            <CardActions targetId="card-conversation-recap" name="conversation-recap" summary={analysis.conversationRecap?.keyTakeaway} />
            <ConversationRecap recap={analysis.conversationRecap} />
          </div>

          <section className="border border-white/16 bg-white/[0.025] p-5">
            <p className="text-sm leading-7 text-smoke">
              ThirdPerson AI provides interpretive relationship insights based on the conversation you upload. It cannot know the full reality of any person or relationship. Use this as a reflection tool, not as proof or final judgment.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
