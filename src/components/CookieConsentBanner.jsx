import { useEffect, useState } from 'react';
import { useRouter } from '../state/RouterContext.jsx';

const CONSENT_KEY = 'thirdperson_cookie_consent_v1';

export default function CookieConsentBanner() {
  const { navigate } = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(CONSENT_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function acknowledge() {
    try {
      window.localStorage.setItem(CONSENT_KEY, new Date().toISOString());
    } catch {
      // If storage is unavailable, just dismiss for this session.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie and storage notice"
      className="fixed inset-x-0 bottom-0 z-[110] px-3 pb-3 sm:px-6 sm:pb-6"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-[26px] border border-purple-200/20 bg-[#171523]/95 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-smoke">
          ThirdPerson AI uses essential local storage to keep you signed in and remember your preferences. We do not use third-party advertising trackers.{' '}
          <button type="button" onClick={() => navigate('/privacy')} className="text-purple-200 underline hover:text-bone">Read our Privacy Policy</button>.
        </p>
        <button
          type="button"
          onClick={acknowledge}
          className="glass-button shrink-0 rounded-full px-5 py-3 font-mono text-xs uppercase tracking-[0.14em] text-bone"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
