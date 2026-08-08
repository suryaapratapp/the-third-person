import TopNav from './TopNav.jsx';
import BottomNav from './BottomNav.jsx';
import SiteFooter from './SiteFooter.jsx';
import CookieConsentBanner from './CookieConsentBanner.jsx';
import { useRouter } from '../state/RouterContext.jsx';

// Routes that wear the deep theme: the ones that are about the person rather
// than about the product. Applied at the shell rather than inside each page so
// the header, tab bar and footer come with it — a dark page inside white chrome
// reads as a rendering fault, not as a design.
function usesDeepTheme(path) {
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
  const deep = usesDeepTheme(path);

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
