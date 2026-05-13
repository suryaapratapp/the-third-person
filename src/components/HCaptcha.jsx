import { useEffect, useRef } from 'react';

const HCAPTCHA_SCRIPT_ID = 'thirdperson-hcaptcha-script';
const DEFAULT_SITE_KEY = '19aaa9b8-8b48-4e2e-9be2-4db64b40e892';

function loadHCaptchaScript() {
  if (window.hcaptcha) return Promise.resolve(window.hcaptcha);
  const existing = document.getElementById(HCAPTCHA_SCRIPT_ID);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(window.hcaptcha), { once: true });
      existing.addEventListener('error', reject, { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = HCAPTCHA_SCRIPT_ID;
    script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.hcaptcha);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function HCaptcha({ onVerify, onError }) {
  const containerRef = useRef(null);
  const callbackRef = useRef(onVerify);
  const errorRef = useRef(onError);
  const widgetRef = useRef(null);
  const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY || DEFAULT_SITE_KEY;

  useEffect(() => {
    callbackRef.current = onVerify;
    errorRef.current = onError;
  }, [onVerify, onError]);

  useEffect(() => {
    let cancelled = false;
    loadHCaptchaScript()
      .then((hcaptcha) => {
        if (cancelled || !containerRef.current || widgetRef.current !== null) return;
        widgetRef.current = hcaptcha.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'dark',
          callback: (token) => callbackRef.current?.(token),
          'expired-callback': () => callbackRef.current?.(''),
          'error-callback': () => {
            callbackRef.current?.('');
            errorRef.current?.('Captcha could not load. Please try again.');
          },
        });
      })
      .catch(() => errorRef.current?.('Captcha could not load. Please refresh and try again.'));

    return () => {
      cancelled = true;
      if (window.hcaptcha && widgetRef.current !== null) {
        try {
          window.hcaptcha.remove(widgetRef.current);
        } catch {
          // hCaptcha may already have removed the widget during navigation.
        }
      }
      widgetRef.current = null;
    };
  }, [siteKey]);

  return <div ref={containerRef} className="min-h-[78px]" />;
}
