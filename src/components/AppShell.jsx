import TopNav from './TopNav.jsx';
import BottomNav from './BottomNav.jsx';
import SiteFooter from './SiteFooter.jsx';
import CookieConsentBanner from './CookieConsentBanner.jsx';
import { useAuth } from '../state/AuthContext.jsx';
import { useRouter } from '../state/RouterContext.jsx';

// The deep theme covers every signed-in surface, not just the report.
//
// Signed out, this is a website selling something and white reads as
// trustworthy. Signed in, it is a tool someone opens to look at their own
// relationships — usually at night, usually about something that matters — and
// the violet-black ground suits that far better. It also lets the dashboard
// carry saturation and glow that would be garish on a marketing page.
//
// Applied at the shell so the header, tab bar and footer come with it: a dark
// page inside white chrome reads as a rendering fault, not as a design.
function usesDeepTheme(path, signedIn) {
  if (signedIn) return true;
  return path.startsWith('/reports') || path === '/personality-card';
}

// `pb-[76px]` keeps page content clear of the fixed mobile tab bar (and
// `md:pb-0` drops it once the bar is gone). Pages with their own sticky footer
// bar add to this rather than fighting it.
//
// `[overflow-x:clip]`, NOT `overflow-x-hidden`. Hidden forces overflow-y to
// `auto`, which makes this element a scroll container — and a scroll container
// silently disables `position: sticky` for every descendant. It cost the
// analysis wizard its pinned stepper, with no error anywhere. Clip clips
// identically without creating one.
export default function AppShell({ children }) {
  const { path } = useRouter();
  const { user } = useAuth();
  const deep = usesDeepTheme(path, Boolean(user));

  return (
    <div className={`relative min-h-screen [overflow-x:clip] bg-canvas pb-[76px] text-bone md:pb-0 ${deep ? 'theme-deep' : ''}`}>
      <TopNav />
      <main>{children}</main>
      <SiteFooter />
      <BottomNav />
      <CookieConsentBanner />
    </div>
  );
}
