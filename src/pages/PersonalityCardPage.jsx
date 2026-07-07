import { useEffect, useMemo, useState } from 'react';
import CardActions from '../components/CardActions.jsx';
import ParticleBackground from '../components/ParticleBackground.jsx';
import { generatePersonalityCardViaSupabase } from '../lib/backendAiService.js';
import { fetchCreditBalances } from '../lib/creditsService.js';
import { exportElementAsImage } from '../lib/exportElementAsImage.js';
import { getInitials, getUserProfile } from '../lib/profileStore.js';
import {
  fetchRelationshipPersonalityCards,
  fetchUnderstandYourselfProfile,
  saveLocalUnderstandYourselfProfile,
} from '../lib/supabaseDataService.js';
import { getZodiacGlyph, getZodiacSign } from '../lib/zodiac.js';
import { useRouter } from '../state/RouterContext.jsx';

const emptyText = 'Not enough evidence yet.';

const worldSlots = [
  {
    key: 'friends',
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
    label: 'With Ex',
    match: /ex/i,
    icon: '↺',
    number: '04',
    accentClass: 'from-fuchsia-300/22 via-pink-300/12 to-purple-300/10',
    iconClass: 'text-fuchsia-100 bg-fuchsia-300/12 border-fuchsia-200/22',
    fallback: 'Upload an ex chat to understand old patterns, closure, and emotional residue.',
    keywords: ['Reflective', 'Careful', 'Healing'],
  },
  {
    key: 'colleagues',
    label: 'With Colleagues',
    match: /colleague|coworker|work/i,
    icon: '▣',
    number: '05',
    accentClass: 'from-purple-300/22 via-violet-300/12 to-fuchsia-300/10',
    iconClass: 'text-purple-100 bg-purple-300/12 border-purple-200/22',
    fallback: 'Upload a colleague chat to see your work tone, clarity, and boundaries.',
    keywords: ['Professional', 'Focused', 'Reliable'],
  },
  {
    key: 'clients',
    label: 'With Clients',
    match: /client/i,
    icon: '◇',
    number: '06',
    accentClass: 'from-orange-300/22 via-amber-300/12 to-pink-300/10',
    iconClass: 'text-orange-100 bg-orange-300/12 border-orange-200/22',
    fallback: 'Upload a client chat to map trust, pressure, and communication polish.',
    keywords: ['Clear', 'Composed', 'Useful'],
  },
  {
    key: 'manager',
    label: 'With Manager',
    match: /manager|boss/i,
    icon: '☉',
    number: '07',
    accentClass: 'from-violet-300/24 via-purple-300/14 to-rose-300/8',
    iconClass: 'text-violet-100 bg-violet-300/12 border-violet-200/22',
    fallback: 'Upload a manager chat to understand respect, pressure, and assertiveness.',
    keywords: ['Measured', 'Respectful', 'Aware'],
  },
];

function asList(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function safe(value, fallback = emptyText) {
  if (Array.isArray(value)) return value.length ? value.join(' • ') : fallback;
  const text = String(value || '').trim();
  return text || fallback;
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
    const card = cards.find((item) => cardMatchesSlot(item, slot));
    return {
      ...slot,
      card,
      summary: card?.shortSummary || slot.fallback,
      confidence: card?.confidenceLevel || 'Not Enough Evidence',
      keywords: keywordsFrom(card).length ? keywordsFrom(card) : slot.keywords,
      title: card?.title || slot.label,
      personalityLabel: card?.personalityLabel || 'Waiting for evidence',
    };
  });
}

function listText(value, fallback = emptyText) {
  const items = asList(value).map((item) => (typeof item === 'string' ? item : item.label || item.title || item.text)).filter(Boolean);
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

function PeopleMapCard({ item }) {
  return (
    <article className="glass-card glow-border group relative min-h-[248px] overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.accentClass} opacity-95 transition duration-300 group-hover:opacity-100`} />
      <div className="relative flex items-start justify-between">
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl border px-2 py-2 text-2xl leading-none ${item.iconClass}`}>{item.icon}</span>
        <span className="rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-1 font-mono text-[0.65rem] font-semibold tracking-[0.12em] text-smoke">{item.number}</span>
      </div>
      <h3 className="relative mt-6 text-2xl font-semibold tracking-tight text-bone">{item.label}</h3>
      <div className="relative mt-3 h-px w-16 bg-gradient-to-r from-white/70 to-white/0" />
      <p className="relative mt-4 max-w-[17rem] font-mono text-xs leading-5 text-smoke">{compact(item.summary, item.fallback, 155)}</p>
      <div className="relative mt-5 border-t border-white/12 pt-3">
        <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-bone">Keywords</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {item.keywords.slice(0, 4).map((keyword) => (
            <span key={keyword} className="rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-1 font-mono text-[0.63rem] uppercase tracking-[0.09em] text-smoke">
              {keyword}
            </span>
          ))}
        </div>
      </div>
      <div className="absolute right-5 top-24 rounded-full border border-white/12 bg-white/[0.07] px-4 py-3 text-xl text-bone">•••</div>
      <span className="absolute bottom-4 right-5 rounded-full border border-white/12 bg-black/20 px-2.5 py-1 font-mono text-[0.58rem] uppercase tracking-[0.10em] text-smoke">{item.confidence}</span>
    </article>
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
    <article id="understand-yourself-export" data-export-bg="#05050a" className="relative overflow-hidden rounded-[36px] border border-white/18 bg-[#05050a] p-6 shadow-[0_36px_120px_rgba(0,0,0,0.42)] sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-purple-300/18 blur-3xl" />
      <div className="pointer-events-none absolute bottom-12 left-1/2 h-60 w-60 rounded-full bg-pink-300/12 blur-3xl" />
      <div className="relative grid gap-8 xl:grid-cols-[1.25fr_.75fr]">
        <div className="grid gap-8 lg:grid-cols-[1fr_220px]">
          <div>
            <p className="tech-label text-purple-100">Understand Yourself</p>
            <h2 className="serif-title mt-6 text-6xl leading-none text-bone sm:text-8xl">{name}</h2>
            <p className="mt-2 font-serif text-3xl italic text-pink-100">{overall.overallPersonalityLabel || overall.shareableLabel || 'Your personality map is forming'}</p>
            <p className="mt-5 max-w-3xl text-base leading-8 text-smoke">{safe(overall.summaryParagraph, 'Generate Understand Yourself after a few relationship personality cards to see a deeper profile.')}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/15 px-4 py-2 font-mono text-xs uppercase tracking-[0.13em] text-bone">{overall.personalityTypeSignal || 'Personality signal forming'}</span>
              {zodiac && <span className="rounded-full border border-pink-200/20 px-4 py-2 font-mono text-xs uppercase tracking-[0.13em] text-pink-100">{getZodiacGlyph(zodiac)} {zodiac}</span>}
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
            <div className="rounded-[26px] border border-emerald-200/18 bg-emerald-300/[0.045] p-5">
              <p className="tech-label text-emerald-100">Green flags</p>
              <ul className="mt-4 space-y-2 text-sm leading-7 text-smoke">
                {greenFlags.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
            <div className="rounded-[26px] border border-pink-200/18 bg-pink-300/[0.045] p-5">
              <p className="tech-label text-pink-100">Red flags, lovingly</p>
              <ul className="mt-4 space-y-2 text-sm leading-7 text-smoke">
                {redFlags.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
          </div>
        </div>

        <aside className="grid gap-5">
          <div className="rounded-[30px] border border-white/16 bg-white/[0.045] p-6">
            <p className="tech-label text-orange-100">Best matches</p>
            <div className="mt-5 space-y-4">
              {bestMatches.map((match, index) => (
                <div key={`${match}-${index}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-bone">{match}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[30px] border border-white/16 bg-white/[0.045] p-6">
            <p className="tech-label text-purple-100">You are...</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {keywords.map((keyword) => (
                <span key={keyword} className="rounded-full border border-white/15 px-3 py-2 text-sm text-bone">{keyword}</span>
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
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');

  const peopleMap = useMemo(() => buildPeopleMap(relationshipCards), [relationshipCards]);
  // Understand Yourself spends one Relationship Report credit per
  // generation (there is no separate credit type for it), so gate on actual
  // remaining balance rather than "has ever bought any pack" — otherwise the
  // button reads as unlocked for someone who is fully out of credits.
  const hasPaidAccess = Boolean(credits?.paidRelationshipReportsLeft > 0);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const [cards, profileRow, balance] = await Promise.all([
        fetchRelationshipPersonalityCards(),
        fetchUnderstandYourselfProfile(),
        fetchCreditBalances(),
      ]);
      if (!mounted) return;
      setRelationshipCards(cards || []);
      setUnderstandYourself(profileRow?.overallProfileJson || null);
      setCredits(balance);
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
      setMessage('Understand Yourself card downloaded.');
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
      if (!nextProfile) throw new Error('Understand Yourself could not be generated right now.');
      setUnderstandYourself(nextProfile);
      saveLocalUnderstandYourselfProfile({
        sourcePersonalityCardIds: payloadCards.map((card) => card.id),
        overallProfileJson: nextProfile,
      });
      setMessage('Understand Yourself is ready.');
    } catch (error) {
      if (error.code === 'OUT_OF_CREDITS' || error.status === 402) {
        navigate('/pricing?reason=understand-yourself');
        return;
      }
      setMessage(error.message || 'Understand Yourself could not be generated right now.');
    } finally {
      setGenerating(false);
    }
  }

  const profileName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Your';
  const fallbackOverall = understandYourself || {
    summaryParagraph: relationshipCards.length
      ? 'Your deeper personality profile is ready to be generated from your saved relationship personality cards. It will combine concise summaries only, not old raw chats.'
      : 'Run your first relationship analysis to start building your people personality map.',
    overallPersonalityLabel: relationshipCards.length ? 'Deeper profile locked' : 'Personality map waiting',
    personalityTypeSignal: 'Understand Yourself Signal',
    strongestGreenFlags: relationshipCards.flatMap((card) => card.greenFlagsSummary?.split(' • ') || []).slice(0, 5),
    lovingRedFlags: relationshipCards.flatMap((card) => card.redFlagsSummary?.split(' • ') || []).slice(0, 5),
    bestMatches: ['People who communicate clearly', 'People who respect emotional pace', 'People who show consistent effort'],
    keywords: [...new Set(relationshipCards.flatMap((card) => card.keywords || []))].slice(0, 8),
    viralOneLiner: 'Different people, different sides. All authentic, all you.',
  };

  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
      <ParticleBackground className="opacity-52" />
      <div id="personality-page-export" data-export-bg="#090817" className="relative mx-auto max-w-[1440px]">
        <header className="accent-panel relative mb-7 overflow-hidden p-6 sm:p-9">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-pink-300/12 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-4xl">
              <p className="tech-label text-pink-100">Understand Yourself</p>
              <h1 className="serif-title mt-4 text-5xl leading-tight text-bone sm:text-7xl">{profileName} People Personality Map</h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-smoke">
                Understand Yourself combines how you show up with friends, family, love, exes, colleagues, and more — creating a deeper personality map from your relationship patterns.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full border border-purple-200/20 px-4 py-2 font-mono text-xs uppercase tracking-[0.13em] text-purple-100">{relationshipCards.length} relationship cards saved</span>
                <span className="rounded-full border border-orange-200/20 px-4 py-2 font-mono text-xs uppercase tracking-[0.13em] text-orange-100">{hasPaidAccess ? 'Paid access active' : 'Paid profile locked'}</span>
              </div>
            </div>
            <div data-export-ignore className="grid gap-3 sm:min-w-[260px]">
              <button
                onClick={generateUnderstandYourself}
                disabled={loading || generating || (!relationshipCards.length)}
                className="glass-button rounded-full px-6 py-4 font-mono text-xs uppercase tracking-[0.16em] text-bone disabled:cursor-not-allowed disabled:opacity-50"
              >
                {hasPaidAccess ? (generating ? 'Generating...' : 'Generate Understand Yourself') : 'Unlock Understand Yourself'}
              </button>
              <button onClick={exportWholeProfile} className="glass-button rounded-full px-6 py-4 font-mono text-xs uppercase tracking-[0.16em] text-bone">
                Download Full Card
              </button>
              {message && <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs leading-6 text-smoke">{message}</p>}
            </div>
          </div>
        </header>

        <section className="accent-panel glow-border relative mb-7 overflow-hidden p-5 sm:p-8">
          <div className="pointer-events-none absolute -left-16 top-24 h-52 w-52 rounded-full bg-purple-300/12 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 bottom-10 h-52 w-52 rounded-full bg-pink-300/10 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="tech-label text-purple-100">Relationship Worlds</p>
              <h2 className="serif-title mt-4 max-w-3xl text-5xl leading-tight text-bone sm:text-7xl">Your People Personality Map</h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-smoke">Different people, different sides. This is how you show up in their world.</p>
            </div>
            <p className="mt-5 rounded-full border border-white/12 bg-white/[0.05] px-5 py-3 font-mono text-xs uppercase tracking-[0.16em] text-pink-100 backdrop-blur">You, in relationships ✧</p>
          </div>
          <div className="relative mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {peopleMap.map((item) => <PeopleMapCard key={item.key} item={item} />)}
          </div>
          <div className="relative mt-8 flex flex-wrap items-center justify-between gap-4 font-mono text-sm text-smoke">
            <p>✧ One person, many personalities. All authentic, all you.</p>
            <p className="rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-bone">Keep growing, keep glowing</p>
          </div>
        </section>

        <OverallReport profile={profile} overall={fallbackOverall} />

        <div className="mt-7 grid gap-5 lg:grid-cols-3">
          <SectionCard id="how-you-show-up" title="How you show up" value={fallbackOverall.socialEnergy || fallbackOverall.summaryParagraph} accent="purple" />
          <SectionCard id="communication-style" title="Communication style" value={fallbackOverall.communicationStyle || fallbackOverall.howYouAreWithLove || fallbackOverall.howYouAreAtWork} accent="blue" />
          <SectionCard id="growth-areas" title="Growth areas" value={fallbackOverall.growthAreas || fallbackOverall.lovingRedFlags} accent="orange" />
        </div>

        <section className="glass-card mt-7 p-5">
          <p className="text-sm leading-7 text-smoke">
            Relationship-specific cards are generated from each analysis. Understand Yourself uses those concise summaries only, which keeps the deeper profile faster, cheaper, and more private than re-reading old raw chats.
          </p>
        </section>
      </div>
    </section>
  );
}
