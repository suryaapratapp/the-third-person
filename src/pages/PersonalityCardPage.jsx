import { useEffect, useMemo, useState } from 'react';
import CardActions from '../components/CardActions.jsx';
import MatchmakingPitch from '../components/MatchmakingPitch.jsx';
import ParticleBackground from '../components/ParticleBackground.jsx';
import CorePersonality from '../components/CorePersonality.jsx';
import { generatePersonalityCardViaSupabase } from '../lib/backendAiService.js';
import { fetchCreditBalances } from '../lib/creditsService.js';
import { exportElementAsImage } from '../lib/exportElementAsImage.js';
import { getInitials, getUserProfile } from '../lib/profileStore.js';
import {
  fetchPersonalityHistory,
  fetchRelationshipPersonalityCards,
  fetchUnderstandYourselfProfile,
  saveLocalUnderstandYourselfProfile,
} from '../lib/supabaseDataService.js';
import { getZodiacGlyph, getZodiacSign } from '../lib/zodiac.js';
import { useRouter } from '../state/RouterContext.jsx';
import PersonalityInsightDialog from '../components/PersonalityInsightDialog.jsx';

const emptyText = 'Not enough evidence yet.';

const worldSlots = [
  {
    key: 'friends',
    tileClass: 'border-yellow-200/45 bg-gradient-to-br from-yellow-300/25 to-orange-300/12',
    label: 'With Friends',
    match: /friend/i,
    icon: '♊',
    number: '01',
    accentClass: 'from-yellow-300/22 via-orange-300/12 to-purple-300/10',
    iconClass: 'text-yellow-100 bg-yellow-300/12 border-yellow-200/22',
    fallback: 'Upload a friends chat to see how you show up in your social world.',
    keywords: ['Supportive', 'Funny', 'Real'],
  },
  {
    key: 'family',
    tileClass: 'border-rose-200/45 bg-gradient-to-br from-rose-300/25 to-orange-300/12',
    label: 'With Family',
    match: /family|mom|dad|brother|sister|cousin/i,
    icon: '⌂',
    number: '02',
    accentClass: 'from-rose-300/22 via-orange-300/12 to-purple-300/10',
    iconClass: 'text-rose-100 bg-rose-300/12 border-rose-200/22',
    fallback: 'Upload a family chat to understand your care, boundaries, and emotional role.',
    keywords: ['Caring', 'Responsible', 'Warm'],
  },
  {
    key: 'partner',
    tileClass: 'border-pink-200/50 bg-gradient-to-br from-pink-300/28 to-purple-300/12',
    label: 'With Partner',
    match: /partner|dating|crush|love|boyfriend|girlfriend|wife|husband|spouse/i,
    icon: '♡',
    number: '03',
    accentClass: 'from-pink-300/24 via-rose-300/12 to-purple-300/10',
    iconClass: 'text-pink-100 bg-pink-300/12 border-pink-200/22',
    fallback: 'Upload a love or partner chat to reveal your romantic communication pattern.',
    keywords: ['Romantic', 'Loyal', 'Intense'],
  },
  {
    key: 'ex',
    tileClass: 'border-fuchsia-200/45 bg-gradient-to-br from-fuchsia-300/25 to-indigo-300/12',
    label: 'With Ex',
    match: /ex/i,
    icon: '↺',
    number: '04',
    accentClass: 'from-fuchsia-300/22 via-pink-300/12 to-purple-300/10',
    iconClass: 'text-fuchsia-100 bg-fuchsia-300/12 border-fuchsia-200/22',
    fallback: 'Upload an ex chat to understand old patterns, closure, and emotional residue.',
    keywords: ['Reflective', 'Careful', 'Healing'],
  },
];

function asList(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function safe(value, fallback = emptyText) {
  if (Array.isArray(value)) {
    const parts = value.map(readable).filter((item) => item && !item.includes('[object Object]'));
    return parts.length ? parts.join(' • ') : fallback;
  }
  const text = readable(value);
  return text && !text.includes('[object Object]') ? text : fallback;
}

function compact(value, fallback = emptyText, limit = 190) {
  const text = safe(value, fallback);
  return text.length > limit ? `${text.slice(0, limit - 3).trim()}...` : text;
}

function keywordsFrom(card) {
  return asList(card?.keywords).slice(0, 5);
}

function cardMatchesSlot(card, slot) {
  return slot.match.test(card.relationshipType || '') || slot.match.test(card.title || '');
}

function buildPeopleMap(cards) {
  return worldSlots.map((slot) => {
    // Cards arrive newest-first, so the first match is the latest card for
    // this world; the count shows how many analyses have refined it.
    const matches = cards.filter((item) => cardMatchesSlot(item, slot));
    const card = matches[0];
    return {
      ...slot,
      card,
      analysedCount: matches.length,
      summary: card?.shortSummary || slot.fallback,
      confidence: card?.confidenceLevel || 'Not Enough Evidence',
      keywords: keywordsFrom(card).length ? keywordsFrom(card) : slot.keywords,
      title: card?.title || slot.label,
      personalityLabel: card?.personalityLabel || 'Waiting for evidence',
    };
  });
}

function readable(item) {
  if (typeof item === 'string') return item.trim();
  if (typeof item === 'number' || typeof item === 'boolean') return String(item);
  if (item && typeof item === 'object') {
    for (const key of ['label', 'title', 'text', 'name', 'summary', 'explanation', 'value', 'note', 'trait', 'flag']) {
      if (typeof item[key] === 'string' && item[key].trim()) return item[key].trim();
    }
    const firstString = Object.values(item).find((entry) => typeof entry === 'string' && entry.trim());
    return firstString ? firstString.trim() : '';
  }
  return '';
}

function listText(value, fallback = emptyText) {
  // Older cards stored "[object Object]" text before flags became typed;
  // filter those out rather than showing them to the user.
  const items = asList(value)
    .map(readable)
    .filter((item) => item && !item.includes('[object Object]'));
  return items.length ? items : [fallback];
}

function ProfileAvatar({ profile }) {
  return (
    <div className="relative h-28 w-28 overflow-hidden rounded-full border border-white/20 bg-white/[0.06] shadow-[0_0_60px_rgba(216,180,254,0.22)]">
      {profile.profileImage ? (
        <img src={profile.profileImage} alt="Profile" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-300/30 via-pink-300/20 to-orange-300/15 font-mono text-3xl text-bone">
          {getInitials(profile)}
        </div>
      )}
    </div>
  );
}

// Compact relationship tile.
//
// These were 248px-tall cards in a 3-column grid, which put four related
// worlds on two rows and buried the one thing they exist to answer — "have I
// analysed this world yet, and how did it read?" — under a keyword list that
// repeated words already in the summary.
//
// Now a small tile: strong colour per world so they read as a set at a glance,
// the state (analysed vs waiting) as the primary signal, and all four on one
// row from `sm` up.
function PeopleMapCard({ item, onSelect }) {
  const analysed = item.analysedCount > 0;
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`group relative overflow-hidden rounded-sm border p-4 text-left transition duration-200 hover:-translate-y-0.5 ${
        analysed ? item.tileClass : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl border text-lg leading-none ${item.iconClass}`}>
          {item.icon}
        </span>
        {analysed ? (
          <span className="whitespace-nowrap rounded-sm border border-white/15 bg-black/30 px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.06em] text-smoke">
            {item.analysedCount}×
          </span>
        ) : (
          <span className="whitespace-nowrap rounded-sm border border-white/10 px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.06em] text-ash">
            —
          </span>
        )}
      </div>

      <h3 className="mt-3 text-base leading-5 text-bone">{item.label}</h3>
      {/* Clamped rather than truncated by character count: in a narrow column
          72 characters still ran to four lines and put the tiles back at ~200px. */}
      <p className={`mt-1.5 line-clamp-2 text-xs leading-5 ${analysed ? 'text-smoke' : 'text-ash'}`}>
        {analysed ? compact(item.summary, item.fallback, 90) : 'Not analysed yet'}
      </p>
    </button>
  );
}

function SectionCard({ id, title, value, accent = 'purple' }) {
  const accentClass = {
    purple: 'from-purple-300/16 to-violet-300/8',
    pink: 'from-pink-300/16 to-purple-300/8',
    orange: 'from-orange-300/14 to-pink-300/8',
    blue: 'from-violet-300/16 to-purple-300/8',
    green: 'from-emerald-300/12 to-purple-300/8',
  }[accent];
  return (
    <section id={id} data-export-bg="#0b1020" className="glass-card relative overflow-hidden p-5">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accentClass}`} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="tech-label text-smoke">{title}</p>
          <p className="mt-4 text-sm leading-7 text-bone">{safe(value)}</p>
        </div>
        <CardActions targetId={id} name={title} summary={safe(value)} />
      </div>
    </section>
  );
}

function OverallReport({ profile, overall }) {
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'You';
  const zodiac = getZodiacSign(profile.dateOfBirth);
  const greenFlags = listText(overall.strongestGreenFlags || overall.greenFlags).slice(0, 5);
  const redFlags = listText(overall.lovingRedFlags || overall.redFlags).slice(0, 5);
  const bestMatches = listText(overall.bestMatches).slice(0, 3);
  const keywords = listText(overall.keywords, 'More chats needed').slice(0, 10);

  return (
    <article id="understand-yourself-export" data-export-bg="#05050a" className="relative overflow-hidden rounded-sm border border-white/18 bg-[#05050a] p-6 shadow-[0_36px_120px_rgba(0,0,0,0.42)] sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-purple-300/18 blur-2xl" />
      <div className="pointer-events-none absolute bottom-12 left-1/2 h-60 w-60 rounded-full bg-pink-300/12 blur-2xl" />
      <div className="relative grid gap-8 xl:grid-cols-[1.25fr_.75fr]">
        <div className="grid gap-8 lg:grid-cols-[1fr_220px]">
          <div>
            <p className="tech-label text-purple-100">Know Yourself</p>
            <h2 className="serif-title mt-6 text-6xl leading-none text-bone sm:text-8xl">{name}</h2>
            <p className="mt-2 font-serif text-3xl italic text-pink-100">{overall.overallPersonalityLabel || overall.shareableLabel || 'Your personality map is forming'}</p>
            <p className="mt-5 max-w-3xl text-base leading-8 text-smoke">{safe(overall.summaryParagraph, 'Generate Know Yourself after a few relationship personality cards to see a deeper profile.')}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-sm border border-white/15 px-4 py-2 font-mono text-xs uppercase tracking-[0.13em] text-bone">{overall.personalityTypeSignal || 'Personality signal forming'}</span>
              {zodiac && <span className="rounded-sm border border-pink-200/20 px-4 py-2 font-mono text-xs uppercase tracking-[0.13em] text-pink-100">{getZodiacGlyph(zodiac)} {zodiac}</span>}
            </div>
          </div>
          <div className="flex items-start justify-center lg:justify-end">
            <ProfileAvatar profile={profile} />
          </div>

          <div className="border-t border-white/12 pt-6 lg:col-span-2">
            <p className="tech-label text-smoke">Core personality</p>
            <p className="mt-4 max-w-4xl text-lg leading-8 text-bone">{safe(overall.emotionalSignature || overall.communicationStyle)}</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:col-span-2">
            <div className="rounded-sm border border-emerald-200/18 bg-emerald-300/[0.045] p-5">
              <p className="tech-label text-emerald-100">Green flags</p>
              <ul className="mt-4 space-y-2 text-sm leading-7 text-smoke">
                {greenFlags.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
            <div className="rounded-sm border border-pink-200/18 bg-pink-300/[0.045] p-5">
              <p className="tech-label text-pink-100">Red flags, lovingly</p>
              <ul className="mt-4 space-y-2 text-sm leading-7 text-smoke">
                {redFlags.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
          </div>
        </div>

        <aside className="grid gap-5">
          <div className="rounded-sm border border-white/16 bg-white/[0.045] p-6">
            <p className="tech-label text-orange-100">Best matches</p>
            <div className="mt-5 space-y-4">
              {bestMatches.map((match, index) => (
                <div key={`${match}-${index}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-bone">{match}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-sm border border-white/16 bg-white/[0.045] p-6">
            <p className="tech-label text-purple-100">You are...</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {keywords.map((keyword) => (
                <span key={keyword} className="rounded-sm border border-white/15 px-3 py-2 text-sm text-bone">{keyword}</span>
              ))}
            </div>
            <blockquote className="mt-7 border-t border-white/10 pt-6 font-serif text-2xl italic leading-9 text-pink-100">
              “{overall.viralOneLiner || 'You are still becoming easier to understand, one conversation at a time.'}”
            </blockquote>
          </div>
        </aside>
      </div>
    </article>
  );
}

export default function PersonalityCardPage() {
  const { navigate } = useRouter();
  const profile = useMemo(() => getUserProfile(), []);
  const [relationshipCards, setRelationshipCards] = useState([]);
  const [understandYourself, setUnderstandYourself] = useState(null);
  const [personalityHistory, setPersonalityHistory] = useState([]);
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  const peopleMap = useMemo(() => buildPeopleMap(relationshipCards), [relationshipCards]);
  // Know Yourself spends one Relationship Report credit per
  // generation (there is no separate credit type for it), so gate on actual
  // remaining balance rather than "has ever bought any pack" — otherwise the
  // button reads as unlocked for someone who is fully out of credits.
  const hasPaidAccess = Boolean(credits?.paidRelationshipReportsLeft > 0);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const [cards, profileRow, balance, history] = await Promise.all([
        fetchRelationshipPersonalityCards(),
        fetchUnderstandYourselfProfile(),
        fetchCreditBalances(),
        fetchPersonalityHistory(),
      ]);
      if (!mounted) return;
      // Dev-only: with no real analyses there is nothing to render, which makes
      // this page impossible to check for layout regressions. Stripped from
      // production builds — import.meta.env.DEV is statically false there.
      const previewCards = import.meta.env.DEV && import.meta.env.VITE_PREVIEW_UNLOCK === '1' && !(cards || []).length
        ? (await import('../lib/previewFixtures.js')).PREVIEW_PERSONALITY_CARDS
        : null;
      setRelationshipCards(previewCards || cards || []);
      setUnderstandYourself(profileRow?.overallProfileJson || null);
      setCredits(balance);
      setPersonalityHistory(history || []);
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  async function exportWholeProfile() {
    try {
      await exportElementAsImage('personality-page-export', `thirdperson-understand-yourself-${new Date().toISOString().slice(0, 10)}.png`);
      setMessage('Know Yourself card downloaded.');
    } catch {
      setMessage('We could not export this card on this device. Please try again on desktop.');
    }
  }

  async function generateUnderstandYourself() {
    if (!relationshipCards.length) {
      setMessage('Run a relationship analysis first so ThirdPerson AI can build your relationship personality map.');
      return;
    }
    if (!hasPaidAccess) {
      navigate('/pricing?reason=understand-yourself');
      return;
    }
    setGenerating(true);
    setMessage('Combining your relationship personality summaries...');
    try {
      const payloadCards = relationshipCards.map((card) => ({
        id: card.id,
        relationshipType: card.relationshipType,
        otherPersonName: card.otherPersonName,
        title: card.title,
        shortSummary: card.shortSummary,
        personalityLabel: card.personalityLabel,
        personalityTypeSignal: card.personalityTypeSignal,
        greenFlagsSummary: card.greenFlagsSummary,
        redFlagsSummary: card.redFlagsSummary,
        communicationStyleSummary: card.communicationStyleSummary,
        emotionalSignatureSummary: card.emotionalSignatureSummary,
        attractionEnergySummary: card.attractionEnergySummary,
        growthAreasSummary: card.growthAreasSummary,
        keywords: card.keywords,
        confidenceLevel: card.confidenceLevel,
      }));
      const result = await generatePersonalityCardViaSupabase({
        relationshipPersonalityCards: payloadCards,
        userProfile: profile,
        languageProfile: {
          languagesUsed: profile.preferredAnalysisLanguages || [],
          recommendedOutputStyle: profile.preferredLanguageTone || '',
        },
        currentUnderstandYourself: understandYourself,
      });
      const nextProfile = result?.understandYourself || result?.personality;
      if (!nextProfile) throw new Error('Know Yourself could not be generated right now.');
      setUnderstandYourself(nextProfile);
      saveLocalUnderstandYourselfProfile({
        sourcePersonalityCardIds: payloadCards.map((card) => card.id),
        overallProfileJson: nextProfile,
      });
      setMessage('Know Yourself is ready.');
    } catch (error) {
      if (error.code === 'OUT_OF_CREDITS' || error.status === 402) {
        navigate('/pricing?reason=understand-yourself');
        return;
      }
      setMessage(error.message || 'Know Yourself could not be generated right now.');
    } finally {
      setGenerating(false);
    }
  }

  const fallbackOverall = understandYourself || {
    summaryParagraph: relationshipCards.length
      ? 'Your deeper personality profile is ready to be generated from your saved relationship personality cards. It will combine concise summaries only, not old raw chats.'
      : 'Run your first relationship analysis to start building your people personality map.',
    overallPersonalityLabel: relationshipCards.length ? 'Deeper profile locked' : 'Personality map waiting',
    personalityTypeSignal: 'Know Yourself Signal',
    strongestGreenFlags: relationshipCards.flatMap((card) => card.greenFlagsSummary?.split(' • ') || []).slice(0, 5),
    lovingRedFlags: relationshipCards.flatMap((card) => card.redFlagsSummary?.split(' • ') || []).slice(0, 5),
    bestMatches: ['People who communicate clearly', 'People who respect emotional pace', 'People who show consistent effort'],
    keywords: [...new Set(relationshipCards.flatMap((card) => card.keywords || []))].slice(0, 8),
    viralOneLiner: 'Different people, different sides. All authentic, all you.',
  };

  return (
    <section className="page-self relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
      <ParticleBackground className="opacity-52" />
      <div id="personality-page-export" data-export-bg="#090817" className="relative mx-auto max-w-[1440px]">
        <header className="accent-panel relative mb-6 overflow-hidden p-5 sm:p-9">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-pink-300/12 blur-2xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-4xl">
              <p className="tech-label text-pink-100">Know Yourself</p>
              <h1 className="serif-title mt-3 text-4xl leading-[1.05] text-bone sm:text-6xl">Who You Actually Are</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-smoke sm:text-base sm:leading-8">
                Fifteen traits, read from how you really talk — and how they shift from person to person.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-sm border border-purple-200/20 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-purple-100">{relationshipCards.length} cards</span>
                <span className="rounded-sm border border-orange-200/20 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-orange-100">{hasPaidAccess ? 'Paid access' : 'Locked'}</span>
              </div>
            </div>
            <div data-export-ignore className="flex w-full flex-wrap gap-2 sm:w-auto sm:min-w-[240px] sm:flex-col">
              <button
                onClick={generateUnderstandYourself}
                disabled={loading || generating || (!relationshipCards.length)}
                className="glass-button min-h-[44px] flex-1 rounded-sm px-4 py-3 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-bone disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-6 sm:text-xs"
              >
                {hasPaidAccess ? (generating ? 'Generating…' : 'Generate') : 'Unlock'}
              </button>
              <button onClick={exportWholeProfile} className="glass-button min-h-[44px] flex-1 rounded-sm px-4 py-3 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-bone sm:flex-none sm:px-6 sm:text-xs">
                Download Card
              </button>
              {message && <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs leading-6 text-smoke">{message}</p>}
            </div>
          </div>
        </header>

        <section className="accent-panel glow-border relative mb-7 overflow-hidden p-5 sm:p-8">
          <div className="pointer-events-none absolute -left-16 top-24 h-52 w-52 rounded-full bg-purple-300/12 blur-2xl" />
          <div className="pointer-events-none absolute -right-20 bottom-10 h-52 w-52 rounded-full bg-pink-300/10 blur-2xl" />
          {/* The accumulating core self sits above the per-relationship map:
              the constant first, then how it varies by who you are with. */}
          <div className="relative mb-10">
            <CorePersonality cards={relationshipCards} />
          </div>

          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="tech-label text-purple-100">Relationship Worlds</p>
              <h2 className="serif-title mt-3 max-w-3xl text-3xl leading-tight text-bone sm:text-5xl">Who you are with each of them</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-smoke">Tap a world to see how you show up there.</p>
            </div>
            
          </div>
          <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {peopleMap.map((item) => <PeopleMapCard key={item.key} item={item} onSelect={setSelectedItem} />)}
          </div>
          <div className="relative mt-8 flex flex-wrap items-center justify-between gap-4 font-mono text-sm text-smoke">
            <p>One person, many sides. All of them you.</p>
            <p className="rounded-sm border border-white/12 bg-white/[0.04] px-5 py-3 text-bone">Keep growing, keep glowing</p>
          </div>
        </section>

        {personalityHistory.length > 0 && (
          <section className="accent-panel relative mb-7 overflow-hidden p-5 sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-300/10 blur-2xl" />
            <div className="relative">
              <p className="tech-label text-emerald-100">Profile evolution</p>
              <h2 className="serif-title mt-3 text-4xl leading-tight text-bone sm:text-5xl">How your profile is evolving</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-smoke">
                Every new analysis refines your personality map instead of replacing it. These are the latest updates from your conversations.
              </p>
              <div className="mt-6 grid gap-3">
                {personalityHistory.slice(0, 6).map((entry) => (
                  <div key={entry.id} className="rounded-sm border border-white/10 bg-white/[0.045] p-4">
                    <div className="flex flex-wrap items-center gap-2 font-mono text-[0.63rem] uppercase tracking-[0.12em] text-ash">
                      <span className="rounded-sm border border-purple-200/25 bg-purple-300/10 px-2.5 py-1 text-purple-100">{entry.relationshipWorld}</span>
                      <span>{new Date(entry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span className="rounded-sm border border-white/12 bg-white/[0.05] px-2.5 py-1">{entry.confidenceLevel}</span>
                    </div>
                    {entry.personalityDelta.length ? (
                      <ul className="mt-3 space-y-1.5 text-sm leading-6 text-smoke">
                        {entry.personalityDelta.slice(0, 4).map((delta, index) => (
                          <li key={index}>• {typeof delta === 'string' ? delta : delta?.note || delta?.label || ''}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-smoke">{entry.cardSummary || 'Profile signals recorded from this analysis.'}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <OverallReport profile={profile} overall={fallbackOverall} />

        <div className="mt-7 grid gap-5 lg:grid-cols-3">
          <SectionCard id="how-you-show-up" title="How you show up" value={fallbackOverall.socialEnergy || fallbackOverall.summaryParagraph} accent="purple" />
          <SectionCard id="communication-style" title="Communication style" value={fallbackOverall.communicationStyle || fallbackOverall.howYouAreWithLove || fallbackOverall.howYouAreAtWork} accent="blue" />
          <SectionCard id="growth-areas" title="Growth areas" value={fallbackOverall.growthAreas || fallbackOverall.lovingRedFlags} accent="orange" />
        </div>

        {/* The whole point of scoring traits: eventually, matching on them. */}
        <MatchmakingPitch className="mt-7" />

        <section className="glass-card mt-7 p-5">
          <p className="text-sm leading-7 text-smoke">
            Relationship-specific cards are generated from each analysis. Know Yourself uses those concise summaries only, which keeps the deeper profile faster, cheaper, and more private than re-reading old raw chats.
          </p>
        </section>
      </div>
      <PersonalityInsightDialog item={selectedItem} onClose={() => setSelectedItem(null)} />
    </section>
  );
}
