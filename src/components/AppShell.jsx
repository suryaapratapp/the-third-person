import TopNav from './TopNav.jsx';
import CookieConsentBanner from './CookieConsentBanner.jsx';

export default function AppShell({ children }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden text-bone">
      <TopNav />
      <main>{children}</main>
      <CookieConsentBanner />
    </div>
  );
}
