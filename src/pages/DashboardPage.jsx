import { useEffect, useState } from 'react';
import {
  PiArrowRight, PiChartLineUp, PiFilePlus, PiSparkle, PiUserCircle,
} from 'react-icons/pi';
import { fetchCreditBalances } from '../lib/creditsService.js';
import { getReports } from '../lib/reportsStore.js';
import { getUserProfile } from '../lib/profileStore.js';
import { useRouter } from '../state/RouterContext.jsx';

// The signed-in home.
//
// A signed-in user landing on the marketing page is being sold something they
// already bought. This replaces it with the four things they can actually do,
// and one number that tells them whether they can do the main one.
//
// Tiles are sized by how often they are wanted, not evenly: starting an
// analysis is the product, so it gets the full width and the loudest treatment.
// An even four-up grid would imply Profile matters as much as Analyse, which
// is false and would cost a tap on the thing everyone came for.

const TILES = [
  {
    key: 'reports',
    label: 'Your reports',
    hint: 'Everything you have analysed',
    icon: PiChartLineUp,
    href: '/reports',
    tone: 'var(--them)',
  },
  {
    key: 'yourself',
    label: 'Know Yourself',
    hint: 'Fifteen traits, built from your chats',
    icon: PiSparkle,
    href: '/personality-card',
    tone: 'var(--you)',
  },
  {
    key: 'profile',
    label: 'Profile',
    hint: 'Languages, credits, privacy',
    icon: PiUserCircle,
    href: '/profile',
    tone: 'var(--accent)',
  },
];

export default function DashboardPage() {
  const { navigate } = useRouter();
  const [balance, setBalance] = useState(null);
  const [reportCount, setReportCount] = useState(0);
  const profile = getUserProfile();

  useEffect(() => {
    let active = true;
    fetchCreditBalances().then((result) => { if (active) setBalance(result); }).catch(() => {});
    try {
      setReportCount((getReports() || []).length);
    } catch {
      /* local cache unavailable; the tile simply shows no count */
    }
    return () => { active = false; };
  }, []);

  const reportsLeft = balance?.relationshipReportsLeft ?? null;
  const hasFree = (balance?.freeReportsLeft || 0) > 0;
  const firstName = String(profile.firstName || '').trim();

  return (
    <section className="relative min-h-screen px-4 pb-16 pt-24 sm:px-6">
      <div className="mx-auto max-w-[1100px]">
        <p className="tech-label">{firstName ? `Welcome back, ${firstName}` : 'Welcome back'}</p>
        <h1 className="serif-title mt-2 text-3xl leading-tight sm:text-5xl">
          What are we reading today?
        </h1>

        {/* The hero action. Full width, loud, and carrying the balance so the
            answer to "can I even do this" is on the button itself. */}
        <button
          type="button"
          onClick={() => navigate('/analysis/new')}
          className="tile-hero group mt-6 flex w-full items-center gap-4 rounded-xl p-5 text-left sm:gap-5 sm:p-7"
        >
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[color:var(--on-solid)]/15 sm:h-16 sm:w-16">
            <PiFilePlus className="text-2xl text-[color:var(--on-solid)] sm:text-3xl" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-bold leading-tight text-[color:var(--on-solid)] sm:text-2xl">
              Start an analysis
            </span>
            <span className="mt-1 block text-sm leading-5 text-[color:var(--on-solid)] opacity-85">
              {hasFree
                ? 'Your free report is waiting'
                : reportsLeft === 0
                  ? 'No reports left — top up to run another'
                  : reportsLeft === null
                    ? 'Upload a chat and get the full read'
                    : `${reportsLeft} report${reportsLeft === 1 ? '' : 's'} ready to use`}
            </span>
          </span>
          <PiArrowRight
            className="shrink-0 text-2xl text-[color:var(--on-solid)] transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </button>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {TILES.map(({ key, label, hint, icon: Icon, href, tone }) => (
            <button
              key={key}
              type="button"
              onClick={() => navigate(href)}
              className="tile group rounded-xl p-5 text-left"
              style={{ '--tile-tone': tone }}
            >
              <span className="grid h-11 w-11 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${tone} 18%, transparent)` }}>
                <Icon className="text-xl" style={{ color: tone }} aria-hidden="true" />
              </span>
              <span className="mt-3 flex items-baseline gap-2">
                <span className="text-base font-bold text-ink">{label}</span>
                {key === 'reports' && reportCount > 0 && (
                  <span className="rounded-full px-1.5 py-0.5 text-xs font-bold" style={{ background: `color-mix(in srgb, ${tone} 20%, transparent)`, color: tone }}>
                    {reportCount}
                  </span>
                )}
              </span>
              <span className="mt-1 block text-sm leading-5 text-smoke">{hint}</span>
            </button>
          ))}
        </div>

        {/* Kindred. The one thing the whole product is building towards, so it
            gets a full panel rather than a nav link — and the tag makes it
            unmissable that it does not exist yet. */}
        <button
          type="button"
          onClick={() => navigate('/#kindred')}
          className="kindred-panel group mt-3 flex w-full flex-col gap-4 rounded-xl p-6 text-left sm:flex-row sm:items-center sm:p-8"
        >
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Kindred</span>
              <span className="rounded-full border border-you/50 bg-you/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-you">
                Coming
              </span>
            </span>
            <span className="mt-2 block max-w-xl text-sm leading-6 text-smoke sm:text-base sm:leading-7">
              Your communication style is one in 7.8 billion. Every report you run
              sharpens the profile we will match you on — friendship and dating
              built from how two people actually talk, not from a bio.
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-you/40 px-4 py-2.5 text-sm font-semibold text-you transition group-hover:border-you">
            See where this goes
            <PiArrowRight className="text-base transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </button>
      </div>
    </section>
  );
}
