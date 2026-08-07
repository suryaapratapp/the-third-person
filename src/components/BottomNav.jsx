import { PiChartLineUp, PiFilePlus, PiHouse, PiTag, PiUserCircle, PiSparkle } from 'react-icons/pi';
import { useAuth } from '../state/AuthContext.jsx';
import { useRouter } from '../state/RouterContext.jsx';

// Mobile tab bar.
//
// This product is used almost entirely on phones — exporting a chat from
// WhatsApp and uploading it is a phone job — but navigation used to live in a
// desktop dropdown and an unlabelled 9-dot icon. On a phone the four things
// people actually do (start an analysis, re-read a report, check their own
// profile, see what it costs) were three or four taps deep.
//
// The centre action is raised and always reads "Analyse" because that is the
// one action the whole product exists for. Tabs change with auth state: a
// signed-out visitor has no reports to browse, so they get pricing instead.

function tabsFor(signedIn) {
  if (!signedIn) {
    return [
      { label: 'Home', path: '/', Icon: PiHouse },
      { label: 'Pricing', path: '/pricing', Icon: PiTag },
      { label: 'Analyse', path: '/analysis/new', Icon: PiFilePlus, primary: true },
      { label: 'Vision', path: '/vision', Icon: PiSparkle },
      { label: 'Sign in', path: '/auth', Icon: PiUserCircle },
    ];
  }
  return [
    { label: 'Home', path: '/', Icon: PiHouse },
    { label: 'Reports', path: '/reports', Icon: PiChartLineUp },
    { label: 'Analyse', path: '/analysis/new', Icon: PiFilePlus, primary: true },
    { label: 'You', path: '/personality-card', Icon: PiSparkle },
    { label: 'Profile', path: '/profile', Icon: PiUserCircle },
  ];
}

function isActive(currentPath, tabPath) {
  if (tabPath === '/') return currentPath === '/';
  return currentPath === tabPath || currentPath.startsWith(`${tabPath}/`);
}

// Routes that own the bottom of the screen themselves. The analysis wizard has
// its own Back/Continue bar and the coach is a chat with a composer pinned
// there; stacking a tab bar under either wastes ~70px of a phone screen and
// invites a mis-tap out of a task the user is halfway through.
//
// Only when signed in, though. Both routes are gated, so to a signed-out
// visitor they render a "sign in to continue" card — hiding the tab bar there
// would strand someone who just tapped Analyse on a page with no way back.
function hidesTabBar(path, signedIn) {
  if (!signedIn) return false;
  return path === '/analysis/new' || /\/(coach|bestie|broski)$/.test(path);
}

export default function BottomNav() {
  const { path, navigate } = useRouter();
  const { user } = useAuth();
  const signedIn = Boolean(user);
  const tabs = tabsFor(signedIn);

  if (hidesTabBar(path, signedIn)) return null;

  return (
    <>
      {/* Occupies real flow space so the footer clears the fixed bar. Rendered
          here rather than as padding in AppShell so it disappears together with
          the bar on the routes above. */}
      <div className="h-[74px] md:hidden" aria-hidden="true" />
      <nav
        aria-label="Primary"
        className="bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-purple-200/15 bg-[#171523]/92  md:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1">
          {tabs.map(({ label, path: tabPath, Icon, primary }) => {
            const active = isActive(path, tabPath);
            if (primary) {
              return (
                <li key={label} className="flex flex-1 justify-center">
                  <button
                    type="button"
                    onClick={() => navigate(tabPath)}
                    aria-current={active ? 'page' : undefined}
                    className="-mt-5 flex min-h-[56px] w-[68px] flex-col items-center justify-center gap-1 rounded-sm border border-white/14 bg-gradient-to-br from-[#cbb8ff] via-[#e3b0c8] to-[#fbc89a] px-2 py-2 text-[#17122a] shadow-[0_12px_30px_rgba(167,139,250,0.34)] transition active:translate-y-px"
                  >
                    <Icon className="text-xl" aria-hidden="true" />
                    <span className="font-mono text-[0.58rem] uppercase tracking-[0.08em]">{label}</span>
                  </button>
                </li>
              );
            }
            return (
              <li key={label} className="flex flex-1">
                <button
                  type="button"
                  onClick={() => navigate(tabPath)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-[52px] w-full flex-col items-center justify-center gap-1 px-1 py-2 transition ${
                    active ? 'text-bone' : 'text-ash'
                  }`}
                >
                  <Icon className={`text-xl ${active ? 'text-violet-100' : ''}`} aria-hidden="true" />
                  <span className="font-mono text-[0.56rem] uppercase tracking-[0.08em]">{label}</span>
                  <span
                    className={`h-0.5 w-5 rounded-full transition ${active ? 'bg-violet-200' : 'bg-transparent'}`}
                    aria-hidden="true"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
