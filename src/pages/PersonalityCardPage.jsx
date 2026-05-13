import { useMemo, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ParticleBackground from '../components/ParticleBackground.jsx';
import { useAnalysis } from '../state/AnalysisContext.jsx';
import { useRouter } from '../state/RouterContext.jsx';
import { generateSampleAnalysis } from '../lib/relationshipAnalysisEngine.js';
import { exportElementAsImage, shareElementAsImage } from '../lib/exportElementAsImage.js';
import { getReports } from '../lib/reportsStore.js';
import { getInitials, getUserProfile } from '../lib/profileStore.js';
import { getZodiacGlyph, getZodiacSign } from '../lib/zodiac.js';

const themes = {
  'Noir Intelligence': ['#050505', '#c4b5fd', '#ffffff', 'radial'],
  'Purple Aura': ['#13091f', '#a78bfa', '#f5f3ff', 'dots'],
  'Soft Pink Signal': ['#1b0a14', '#f0abfc', '#fff1f7', 'wave'],
  'Blue Memory': ['#07111f', '#60a5fa', '#eff6ff', 'grid'],
  'Minimal White': ['#f7f4ef', '#7c3aed', '#161616', 'clean'],
  'Orange Pulse': ['#130b07', '#fb923c', '#fff7ed', 'dots'],
};

function buildCard(analysis) {
  const snapshot = analysis.personalitySnapshot || {};
  const user = analysis.personality?.user || {};
  const viral = analysis.personalityCardViral || {};
  const styleSignals = analysis.communicationStyleSignals?.user || {};
  const strengths = snapshot.strengths || user.strengths || [];
  const growthAreas = snapshot.growthAreas || user.weaknesses || [];
  const greenFlags = viral.greenFlags || [];
  const redFlags = viral.redFlags || [];

  return {
    title: user.name || 'The Reflective Communicator',
    type: user.type || 'INFJ-like',
    core: user.profile || 'Your communication appears reflective, meaning-seeking, and emotionally attentive.',
    oneLiner: viral.viralOneLiner || 'You notice the shift before anyone admits the mood changed.',
    radar: [
      ['Emotional Radar', 'High', 'You may pick up tiny tone changes quickly.'],
      ['Clarity Craving', 'Strong', 'Unclear replies can make your mind search for the real meaning.'],
      ['Soft Power', 'Noticeable', 'You can make people open up by making hard feelings feel safer to name.'],
      ['Reply Energy', 'Warm', 'Your best messages may feel personal, specific, and hard to ignore.'],
    ],
    recognition: [
      ['Texting aura', viral.socialEnergy || 'Emotionally aware, observant, and quietly intense.'],
      ['What people remember', viral.conversationMagnet || snapshot.whatHooksPeople],
      ['Your soft flex', strengths[0] ? `You bring ${strengths[0].toLowerCase()} into emotionally messy moments.` : 'You make confusing feelings easier to name.'],
      ['Your hidden tell', redFlags[0] || 'When something feels off, your questions may become more meaning-focused.'],
      ['Your care language', 'You appear to show care by noticing patterns, checking emotional consistency, and trying to repair what feels unresolved.'],
      ['Your conversation superpower', snapshot.engagementPsychology || 'You keep conversations alive by searching for what sits beneath the surface.'],
    ],
    creativeReads: [
      ['Main character edit', viral.mainCharacterPattern || 'You love deeply, but you notice every shift in energy.'],
      ['Plot twist pattern', 'You may look calm outside while your mind is quietly connecting every small detail.'],
      ['Green flag glow', greenFlags.join(', ') || 'You care about repair, honesty, and emotional effort.'],
      ['Growth quest', growthAreas.join(', ') || 'Ask directly before turning uncertainty into a full story.'],
      ['Attention style', (styleSignals.attentionStyleSignals || []).join(', ') || 'Detail-aware and tone-sensitive.'],
      ['What helps you feel safe', 'Clear words, steady effort, honest repair, and actions that match the emotional promise.'],
    ],
    sections: [
      ['Core personality summary', user.profile],
      ['Your Social Energy', viral.socialEnergy],
      ['Your Emotional Signature', viral.emotionalSignature],
      ['Your Conversation Magnet', viral.conversationMagnet],
      ['Your Share Trigger', viral.shareTrigger],
      ['Your Reaction Style', viral.reactionStyle],
      ['Your Humour Style', viral.humourStyle],
      ['Your Green Flags', greenFlags.join(', ')],
      ['Your Red Flags', redFlags.join(', ')],
      ['Your Main Character Pattern', viral.mainCharacterPattern],
      ['Your Relationship Pattern', viral.relationshipPattern],
      ['Communication style', snapshot.communicationStyle],
      ['Emotional pattern', snapshot.emotionalPattern],
      ['What hooks people', snapshot.whatHooksPeople],
      ['What makes you share', 'You may share more when a conversation feels emotionally safe, meaningful, and specific.'],
      ['What creates emotional reactions', snapshot.emotionalTriggers],
      ['User habits', 'You may revisit unresolved moments, look for patterns, and try to make sense of changes in tone.'],
      ['Emotional triggers', snapshot.emotionalTriggers],
      ['Curiosity loops', snapshot.curiosityLoops],
      ['Progress systems', 'You appear to feel progress when the conversation moves from ambiguity to a clear next step.'],
      ['Engagement psychology', snapshot.engagementPsychology],
      ['Strengths', strengths.join(', ')],
      ['Growth areas', growthAreas.join(', ')],
      ['Recurring words or phrases', snapshot.recurringWords?.join(', ')],
      ['Relationship communication pattern', analysis.summary?.mainEmotionalPattern],
    ],
  };
}

function ValueCard({ label, value, accent }) {
  return (
    <div className="border p-4" style={{ borderColor: `${accent}55`, background: 'rgba(255,255,255,0.025)' }}>
      <p className="font-mono text-[0.64rem] uppercase tracking-[0.14em]" style={{ color: accent }}>{label}</p>
      <p className="mt-3 text-sm leading-7 opacity-85">{value || 'Available after analysis.'}</p>
    </div>
  );
}

function RadarBar({ label, signal, note, accent }) {
  const widths = { Light: '34%', Medium: '56%', Noticeable: '68%', High: '82%', Strong: '88%', Warm: '74%' };
  return (
    <div className="border p-4" style={{ borderColor: `${accent}44`, background: 'rgba(255,255,255,0.02)' }}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[0.64rem] uppercase tracking-[0.14em]">{label}</p>
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em]" style={{ color: accent }}>{signal}</span>
      </div>
      <div className="mt-4 h-1.5 bg-white/10">
        <div className="h-1.5" style={{ width: widths[signal] || '60%', background: `linear-gradient(90deg, ${accent}, rgba(255,255,255,0.75))` }} />
      </div>
      <p className="mt-3 text-xs leading-6 opacity-75">{note}</p>
    </div>
  );
}

function buildLifeStoryData(reports, currentAnalysis) {
  const source = reports.length ? [...reports].reverse() : [{ analysisJson: currentAnalysis, dateAnalysed: new Date().toISOString(), emotionalTrend: currentAnalysis.conversationRecap?.emotionalTrend }];
  return source.slice(-8).map((report, index) => {
    const scores = report.analysisJson?.scores || currentAnalysis.scores || {};
    const energy = report.analysisJson?.energyMatchScore?.score || scores.effortBalance || 55;
    const conflict = scores.conflictIntensity || 35;
    return {
      period: report.dateAnalysed?.slice(0, 7) || `Phase ${index + 1}`,
      emotionalIntensity: Math.min(96, Math.max(18, 42 + conflict * 0.35 + index * 3)),
      confidence: Math.min(96, Math.max(18, (scores.emotionalSafety || 55) + index * 2)),
      clarity: Math.min(96, Math.max(18, scores.clarity || 52)),
      connectionEnergy: Math.min(96, Math.max(18, energy)),
      overthinking: Math.min(96, Math.max(18, 72 - (scores.clarity || 45) * 0.45 + conflict * 0.22)),
      growth: Math.min(96, Math.max(18, 38 + index * 8 + (scores.communicationHealth || 55) * 0.22)),
    };
  });
}

function ProfileBadge({ profile, zodiac, accent, text }) {
  return (
    <div className="flex flex-col items-end gap-3">
      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border text-2xl" style={{ borderColor: `${accent}88`, background: `${accent}18`, color: text }}>
        {profile.profileImage ? <img src={profile.profileImage} alt="Profile" className="h-full w-full object-cover" /> : getInitials(profile)}
      </div>
      {zodiac && (
        <div className="rounded-full border px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.13em]" style={{ borderColor: `${accent}66`, color: accent }}>
          {getZodiacGlyph(zodiac)} {zodiac}
        </div>
      )}
    </div>
  );
}

export default function PersonalityCardPage() {
  const { flow } = useAnalysis();
  const { navigate } = useRouter();
  const [themeName, setThemeName] = useState('Noir Intelligence');
  const [message, setMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const hasAnalysis = Boolean(flow.analysisResult);
  const analysis = useMemo(() => flow.analysisResult || generateSampleAnalysis(), [flow.analysisResult]);
  const profile = useMemo(() => getUserProfile(), []);
  const userZodiac = getZodiacSign(profile.dateOfBirth);
  const lifeStoryData = useMemo(() => buildLifeStoryData(getReports(), analysis), [analysis]);
  const card = buildCard(analysis);
  const [bg, accent, text, pattern] = themes[themeName];
  const summary = `${card.title} (${card.type})\n${card.core}\n\n${card.oneLiner}\n\n${[...card.recognition, ...card.creativeReads, ...card.sections].map(([label, value]) => `${label}: ${value || 'Available after analysis.'}`).join('\n')}`;

  function copySummary() {
    navigator.clipboard?.writeText(summary);
    setMessage('Personality summary copied.');
  }

  async function shareCard() {
    try {
      const date = new Date().toISOString().slice(0, 10);
      const theme = themeName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const result = await shareElementAsImage('personality-card-export', 'ThirdPerson AI Personality Card', summary, `thirdperson-personality-card-${theme}-${date}.png`);
      setMessage(result === 'shared' ? 'Personality card shared.' : 'Sharing is not available here, so the summary was copied.');
    } catch {
      setMessage('Sharing is not available here, so the summary was copied.');
    }
  }

  async function exportImage() {
    try {
      setIsExporting(true);
      const date = new Date().toISOString().slice(0, 10);
      const theme = themeName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await exportElementAsImage('personality-card-export', `thirdperson-personality-card-${theme}-${date}.png`);
      setMessage('Personality card image exported.');
    } catch {
      setMessage('We could not export the card on this device. Please try again or use a desktop browser.');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
      <ParticleBackground className="opacity-45" />
      <div className="relative mx-auto max-w-[1320px]">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="tech-label text-smoke">Personality Card</p>
            <h1 className="serif-title mt-4 text-5xl leading-none sm:text-7xl">Your relationship communication signature.</h1>
          </div>
          {!hasAnalysis && (
            <button onClick={() => navigate('/analysis/new')} className="glass-button px-5 py-4 font-mono text-xs uppercase tracking-[0.16em] text-bone">
              Run your first analysis
            </button>
          )}
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          {Object.keys(themes).map((name) => (
            <button
              key={name}
              onClick={() => setThemeName(name)}
              className={`border px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] ${themeName === name ? 'border-purple-200 bg-purple-300/10 text-bone' : 'border-white/12 text-ash'}`}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <article id="personality-card-export" data-export-bg={bg} className="relative overflow-hidden p-7 sm:p-10" style={{ background: bg, color: text, border: `1px solid ${accent}` }}>
            <div className={`absolute inset-0 opacity-20 ${pattern === 'dots' ? 'dot-field' : pattern === 'grid' ? 'grid-bg' : ''}`} />
            <div className="relative">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="tech-label" style={{ color: accent }}>ThirdPerson AI</p>
                  <h2 className="serif-title mt-5 text-5xl sm:text-7xl">{card.title}</h2>
                </div>
                <ProfileBadge profile={profile} zodiac={userZodiac} accent={accent} text={text} />
              </div>
              <p className="mt-5 inline-flex border px-4 py-3 font-mono text-base uppercase tracking-[0.14em] sm:text-lg" style={{ borderColor: `${accent}66`, color: accent }}>
                {card.type} Personality Signal
              </p>
              <p className="mt-7 max-w-3xl text-sm leading-8 opacity-85">{card.core}</p>

              <div className="mt-7 border p-5 text-center" style={{ borderColor: `${accent}66`, background: `linear-gradient(135deg, ${accent}16, rgba(255,255,255,0.025))` }}>
                <p className="font-mono text-[0.64rem] uppercase tracking-[0.14em]" style={{ color: accent }}>Viral one-liner</p>
                <p className="serif-title mt-3 text-4xl">“{card.oneLiner}”</p>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-4">
                {card.radar.map(([label, signal, note]) => (
                  <RadarBar key={label} label={label} signal={signal} note={note} accent={accent} />
                ))}
              </div>

              <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="border p-5" style={{ borderColor: `${accent}55`, background: `radial-gradient(circle at 0% 0%, ${accent}18, transparent 16rem)` }}>
                  <p className="font-mono text-[0.64rem] uppercase tracking-[0.14em]" style={{ color: accent }}>Recognition Engine</p>
                  <h3 className="serif-title mt-3 text-4xl">How people may read your energy</h3>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {card.recognition.map(([label, value]) => (
                      <ValueCard key={label} label={label} value={value} accent={accent} />
                    ))}
                  </div>
                </div>
                <div className="border p-5" style={{ borderColor: `${accent}55`, background: 'rgba(255,255,255,0.025)' }}>
                  <p className="font-mono text-[0.64rem] uppercase tracking-[0.14em]" style={{ color: accent }}>Tiny Truths</p>
                  <div className="mt-5 space-y-4 text-sm leading-7 opacity-85">
                    <p>You may be the kind of person who needs the emotional math to make sense before your heart can relax.</p>
                    <p>You may not need constant attention, but you likely notice when effort suddenly changes.</p>
                    <p>Your best conversations appear to happen when honesty, humour, and emotional safety meet in the same place.</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 border p-5" style={{ borderColor: `${accent}55`, background: `linear-gradient(135deg, ${accent}12, rgba(255,255,255,0.018))` }}>
                <p className="font-mono text-[0.64rem] uppercase tracking-[0.14em]" style={{ color: accent }}>Your Emotional Life Story</p>
                <h3 className="serif-title mt-3 text-4xl">How your emotional energy appears to evolve</h3>
                <p className="mt-3 max-w-3xl text-sm leading-7 opacity-80">
                  A timeline of how your emotional energy, communication style, confidence, curiosity, attachment, and clarity appear to evolve across analysed conversations.
                </p>
                <div className="mt-6 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lifeStoryData} margin={{ left: -25, right: 10, top: 10, bottom: 0 }}>
                      <XAxis dataKey="period" stroke="rgba(255,255,255,0.45)" tick={{ fontSize: 11 }} />
                      <YAxis stroke="rgba(255,255,255,0.28)" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: bg, border: `1px solid ${accent}`, color: text }} />
                      <Line type="monotone" dataKey="emotionalIntensity" stroke="#f472b6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="confidence" stroke="#a78bfa" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="clarity" stroke="#60a5fa" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="connectionEnergy" stroke="#fb923c" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="overthinking" stroke="#facc15" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="growth" stroke="#34d399" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-5">
                  {[
                    'When you started noticing patterns',
                    'When your emotional energy peaked',
                    'When clarity improved',
                    'When you pulled back',
                    'When you became more self-aware',
                  ].map((moment) => (
                    <div key={moment} className="border p-3 text-xs leading-6 opacity-80" style={{ borderColor: `${accent}33` }}>{moment}</div>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-6 opacity-60">Based on analysed conversations. This is a reflective graph, not a final judgment.</p>
              </div>

              <div className="mt-8">
                <p className="font-mono text-[0.64rem] uppercase tracking-[0.14em]" style={{ color: accent }}>Creative Reads</p>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {card.creativeReads.map(([label, value]) => (
                    <ValueCard key={label} label={label} value={value} accent={accent} />
                  ))}
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {card.sections.map(([label, value]) => (
                  <ValueCard key={label} label={label} value={value} accent={accent} />
                ))}
              </div>
            </div>
          </article>

          <aside className="thin-panel h-fit p-5">
            <p className="tech-label text-smoke">Card actions</p>
            <div className="mt-5 grid gap-3">
              <button onClick={exportImage} disabled={isExporting} className="glass-button px-5 py-4 text-left text-bone disabled:opacity-60">{isExporting ? 'Exporting...' : 'Export as Image'}</button>
              <button onClick={copySummary} className="glass-button px-5 py-4 text-left text-bone">Copy Summary</button>
              <button onClick={shareCard} className="glass-button px-5 py-4 text-left text-bone">Share Card</button>
            </div>
            {message && <p className="mt-5 text-sm leading-7 text-smoke">{message}</p>}
            <p className="mt-6 text-sm leading-7 text-ash">
              Personality cards are interpretive and based on the conversation provided. They are designed for reflection, not fixed identity labels.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
