import { useEffect, useMemo, useRef, useState } from 'react';
import ParticleBackground from '../components/ParticleBackground.jsx';
import UsageWarningModal from '../components/UsageWarningModal.jsx';
import { askBestieViaSupabase } from '../lib/backendAiService.js';
import { askPuterBestieBot } from '../lib/puterBestieBotService.js';
import { buildAnalysisChainContext, getChainById, groupReports } from '../lib/reportsStore.js';
import { getUserProfile } from '../lib/profileStore.js';
import { fetchRelationshipReports } from '../lib/supabaseDataService.js';
import { getPuterMonthlyUsage } from '../lib/puterUsageService.js';
import { getZodiacSign } from '../lib/zodiac.js';
import { useRouter } from '../state/RouterContext.jsx';

const starters = [
  'Is this person into me?',
  'What went wrong here?',
  'Am I overthinking this?',
  'What should I reply?',
  'Is this one-sided?',
  'What are the mixed signals?',
  'What should I stop ignoring?',
  'How can I improve this relationship?',
];

function userProfileWithZodiac() {
  const profile = getUserProfile();
  return { ...profile, zodiacSign: getZodiacSign(profile.dateOfBirth) };
}

export default function BestieBotPage({ chainId }) {
  const { navigate } = useRouter();
  const [chain, setChain] = useState(() => getChainById(chainId));
  const context = useMemo(() => buildAnalysisChainContext(chain), [chain]);
  const userProfile = useMemo(() => userProfileWithZodiac(), []);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [toast, setToast] = useState('');
  const [usageWarning, setUsageWarning] = useState(null);
  const [pendingQuestion, setPendingQuestion] = useState('');
  const bottomRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: context
        ? `Hi bestie. I’ve got the full chain for ${context.personName}. Ask me what you need clarity on, and I’ll keep it honest, kind, and grounded.`
        : 'Run an analysis first so your Bestie Bot can understand the relationship properly.',
    },
  ]);

  useEffect(() => {
    let mounted = true;
    fetchRelationshipReports().then((reports) => {
      if (!mounted) return;
      setChain(groupReports(reports).get(chainId) || getChainById(chainId));
    });
    return () => {
      mounted = false;
    };
  }, [chainId]);

  useEffect(() => {
    if (!context) return;
    setMessages((current) => {
      if (current.length > 1) return current;
      return [{
        role: 'bot',
        text: `Hi bestie. I’ve got the full chain for ${context.personName}. Ask me what you need clarity on, and I’ll keep it honest, kind, and grounded.`,
      }];
    });
  }, [context]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isThinking]);

  function saveInsight(text) {
    const key = 'thirdperson_saved_bestie_insights_v1';
    const saved = JSON.parse(window.localStorage.getItem(key) || '[]');
    window.localStorage.setItem(key, JSON.stringify([{ chainId, text, savedAt: new Date().toISOString() }, ...saved].slice(0, 60)));
    setToast('Bestie insight saved.');
  }

  async function shareReply(text) {
    try {
      if (navigator.share) await navigator.share({ title: 'ThirdPerson Bestie', text });
      else {
        await navigator.clipboard?.writeText(text);
        setToast('Bestie reply copied.');
      }
    } catch {
      await navigator.clipboard?.writeText(text);
      setToast('Bestie reply copied.');
    }
  }

  async function copyReply(text) {
    await navigator.clipboard?.writeText(text);
    setToast('Bestie reply copied.');
  }

  async function send(text = input, { skipUsageCheck = false } = {}) {
    const trimmed = text.trim();
    if (!trimmed || !context || isThinking) return;
    if (!skipUsageCheck) {
      setStatusText('Checking usage…');
      const usage = await getPuterMonthlyUsage();
      setStatusText('');
      if (usage.status === 'exhausted') {
        setPendingQuestion(trimmed);
        setUsageWarning(usage);
        return;
      }
      if (usage.status === 'warning' || usage.status === 'critical') {
        setPendingQuestion(trimmed);
        setUsageWarning(usage);
        return;
      }
    }
    setInput('');
    setMessages((current) => [...current, { role: 'user', text: trimmed }]);
    setIsThinking(true);
    setStatusText('Preparing Bestie reply…');
    const backendResponse = await askBestieViaSupabase({
      chainId,
      userMessage: trimmed,
      analysisChainContext: context,
      userProfile,
      detectedLanguageStyle: context.languageStyle,
      relationshipType: context.relationshipType,
      otherPersonName: context.personName,
    }).catch((error) => ({ error: error.message }));
    if (backendResponse?.error) {
      setStatusText('');
      setMessages((current) => [...current, { role: 'bot', text: backendResponse.error }]);
      setIsThinking(false);
      return;
    }
    const response = backendResponse?.text
      ? backendResponse
      : await askPuterBestieBot({
          chainId,
          userMessage: trimmed,
          analysisChainContext: context,
          userProfile,
          detectedLanguageStyle: context.languageStyle,
          relationshipType: context.relationshipType,
          otherPersonName: context.personName,
        });
    setStatusText('');
    setMessages((current) => [...current, { role: 'bot', text: response.text }]);
    setIsThinking(false);
  }

  if (!context) {
    return (
      <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
        <ParticleBackground className="opacity-45" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="accent-panel p-8 sm:p-12">
            <p className="tech-label text-smoke">ThirdPerson Bestie</p>
            <h1 className="serif-title mt-4 text-5xl leading-tight sm:text-7xl">Run an analysis first.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-smoke">
              Run an analysis first so your Bestie Bot can understand the relationship properly.
            </p>
            <button onClick={() => navigate('/analysis/new')} className="glass-button mt-8 px-5 py-4 font-mono text-xs uppercase tracking-[0.16em] text-bone">Start an analysis</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
      {usageWarning && (
        <UsageWarningModal
          status={usageWarning.status}
          onPlans={() => navigate('/pricing?reason=usage-limit')}
          onBack={() => navigate('/reports')}
          onContinue={() => {
            const next = pendingQuestion;
            setUsageWarning(null);
            setPendingQuestion('');
            send(next, { skipUsageCheck: true });
          }}
        />
      )}
      <ParticleBackground className="opacity-45" />
      <div className="relative mx-auto max-w-[1280px]">
        <div className="accent-panel overflow-hidden rounded-[34px] p-4 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5 border-b border-white/10 pb-5">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-pink-200/30 bg-gradient-to-br from-pink-300/20 via-purple-300/16 to-orange-300/14 text-2xl shadow-glow">✨</div>
              <div>
                <p className="tech-label text-pink-200">ThirdPerson Bestie</p>
                <h1 className="serif-title mt-3 text-5xl leading-none sm:text-7xl">Talk through {context.personName}.</h1>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-smoke">
                Bestie is here. Ask me anything about this relationship — what changed, what feels confusing, what to reply, or what you may need to stop ignoring.
              </p>
            </div>
            <button onClick={() => navigate('/reports')} className="glass-button px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-bone">Back to reports</button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {[
              ['Person', context.personName],
              ['Relation', context.relationshipType],
              ['App', context.platform],
              ['Reports', `${context.reportCount}`],
              ['Trend', context.emotionalTrendAcrossReports || 'Mixed'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
                <p className="tech-label text-ash">{label}</p>
                <p className="mt-2 text-sm text-bone">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[330px_1fr]">
            <aside className="thin-panel rounded-[28px] p-4">
              <p className="tech-label text-purple-200">Ask me</p>
              <div className="mt-4 grid gap-2">
                {starters.map((starter) => (
                  <button key={starter} onClick={() => send(starter)} className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-left text-sm text-smoke transition hover:border-pink-200/50 hover:text-bone">
                    {starter}
                  </button>
                ))}
              </div>
              <div className="mt-5 rounded-3xl border border-orange-300/15 bg-orange-300/[0.04] p-4 text-sm leading-7 text-smoke">
                Zodiac, if available, is treated as a fun reflection layer. The real chat patterns matter more.
              </div>
            </aside>

            <div className="flex min-h-[620px] flex-col rounded-[32px] border border-white/12 bg-gradient-to-br from-white/[0.06] via-purple-300/[0.035] to-blue-300/[0.025] p-4">
              <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[82%] rounded-[26px] px-5 py-4 text-sm leading-7 shadow-[0_14px_40px_rgba(0,0,0,0.16)] ${message.role === 'user' ? 'bg-purple-300/18 text-bone' : 'border border-pink-200/10 bg-white/[0.07] text-smoke'}`}>
                      {message.role === 'bot' && <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.13em] text-pink-200">Bestie</p>}
                      <p>{message.text}</p>
                      {message.role === 'bot' && index > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2" data-export-ignore>
                          <button onClick={() => copyReply(message.text)} className="rounded-full border border-white/10 px-3 py-1 text-[0.68rem] text-ash hover:text-bone">Copy</button>
                          <button onClick={() => saveInsight(message.text)} className="rounded-full border border-white/10 px-3 py-1 text-[0.68rem] text-ash hover:text-bone">Save insight</button>
                          <button onClick={() => shareReply(message.text)} className="rounded-full border border-white/10 px-3 py-1 text-[0.68rem] text-ash hover:text-bone">Share</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isThinking && (
                  <div className="max-w-[82%] rounded-[24px] border border-pink-200/10 bg-white/[0.06] px-5 py-4 text-sm text-smoke">
                    {statusText || 'Bestie is reading the relationship chain…'}
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
              {(statusText && !isThinking) || toast ? <p className="mt-3 text-xs text-ash">{statusText || toast}</p> : null}
              <div className="sticky bottom-0 mt-4 flex gap-3 rounded-[28px] border border-white/10 bg-black/35 p-2 backdrop-blur">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Ask your Bestie what you need to understand..."
                  className="min-h-14 flex-1 resize-none rounded-3xl border border-white/12 bg-black/50 px-5 py-4 text-sm text-bone outline-none placeholder:text-ash focus:border-purple-200/60"
                />
                <button onClick={() => send()} disabled={!input.trim() || isThinking} className="rounded-3xl border border-purple-200/30 bg-gradient-to-r from-purple-300/20 via-pink-300/16 to-orange-300/14 px-5 py-3 font-mono text-xs uppercase tracking-[0.14em] text-bone disabled:opacity-40">
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
