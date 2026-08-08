import TopNav from './TopNav.jsx';
import BottomNav from './BottomNav.jsx';
import SiteFooter from './SiteFooter.jsx';
import CookieConsentBanner from './CookieConsentBanner.jsx';

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
  return (
    <div className="relative min-h-screen [overflow-x:clip] pb-[76px] text-bone md:pb-0">
      <TopNav />
      <main>{children}</main>
      <SiteFooter />
      <BottomNav />
      <CookieConsentBanner />
    </div>
  );
}
