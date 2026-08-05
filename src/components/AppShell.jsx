import TopNav from './TopNav.jsx';
import BottomNav from './BottomNav.jsx';
import SiteFooter from './SiteFooter.jsx';
import CookieConsentBanner from './CookieConsentBanner.jsx';

// `pb-[76px]` keeps page content clear of the fixed mobile tab bar (and
// `md:pb-0` drops it once the bar is gone). Pages with their own sticky footer
// bar add to this rather than fighting it.
export default function AppShell({ children }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden pb-[76px] text-bone md:pb-0">
      <TopNav />
      <main>{children}</main>
      <SiteFooter />
      <BottomNav />
      <CookieConsentBanner />
    </div>
  );
}
