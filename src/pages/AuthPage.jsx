import { useState } from 'react';
import HCaptcha from '../components/HCaptcha.jsx';
import { defaultAnalysisLanguages } from '../lib/languages.js';
import { emptyProfile, saveUserProfile } from '../lib/profileStore.js';
import { supabase } from '../lib/supabaseClient.js';
import { upsertRemoteProfile } from '../lib/supabaseDataService.js';
import { useAuth } from '../state/AuthContext.jsx';
import { useRouter } from '../state/RouterContext.jsx';

// Sign-up used to require first name, last name, gender identity, date of
// birth, AND at least one language before an account could be created —
// five mandatory fields at the exact moment someone is deciding whether to
// trust this product with a private conversation. Every one of them already
// lives on ProfilePage.jsx with nothing required there, so this duplicated
// that page's job as a checkout blocker instead of a checkout.
//
// Account creation is now just email + password (+ optional Google, +
// captcha). Zodiac, coach tone-matching, and everything else that reads these
// fields already tolerates them being unset — that's the same state a user is
// in today the moment before they first open Profile.

function nextPath() {
  const params = new URLSearchParams(window.location.search);
  return params.get('next') || '/reports';
}

function isLocalAuthTesting() {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1'].includes(window.location.hostname);
}

export default function AuthPage() {
  const { isConfigured, user } = useAuth();
  const { navigate } = useRouter();
  const [mode, setMode] = useState('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const captchaRequired = !isLocalAuthTesting();

  async function handleEmail(event) {
    event.preventDefault();
    if (captchaRequired && !captchaToken) {
      setMessage('Please complete the security check before continuing.');
      return;
    }
    setBusy(true);
    setMessage('');
    const profilePayload = { ...emptyProfile, email: email.trim(), preferredAnalysisLanguages: defaultAnalysisLanguages };
    const action = mode === 'sign-up'
      ? supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            ...(captchaRequired ? { captchaToken } : {}),
            emailRedirectTo: `${window.location.origin}${nextPath()}`,
          },
        })
      : supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
          options: captchaRequired ? { captchaToken } : undefined,
        });
    const { data, error } = await action;
    setBusy(false);
    window.hcaptcha?.reset?.();
    setCaptchaToken('');
    if (error) {
      setMessage(error.message || 'We could not complete sign in.');
      return;
    }
    if (mode === 'sign-up') {
      saveUserProfile(profilePayload);
      if (data?.session) {
        upsertRemoteProfile(profilePayload).catch(() => null);
      }
    }
    setMessage(mode === 'sign-up' ? 'Account created. Check your email if confirmation is enabled.' : 'Signed in successfully.');
    window.setTimeout(() => navigate(nextPath()), 500);
  }

  async function handleGoogle() {
    setBusy(true);
    setMessage('');
    const redirectTo = `${window.location.origin}${nextPath()}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      setBusy(false);
      setMessage(error.message || 'Google sign in could not start.');
    }
  }

  if (user) {
    window.setTimeout(() => navigate(nextPath()), 0);
  }

  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
      <div className="relative mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_420px]">
        <div className="accent-panel p-7 sm:p-10">
          <p className="tech-label text-signal">Private access</p>
          <h1 className="serif-title mt-4 text-5xl leading-tight sm:text-7xl">Welcome to ThirdPerson AI.</h1>
          <p className="mt-6 max-w-2xl text-sm leading-8 text-smoke">
            Sign in to keep your reports, relationship chains, coach chats, and personality insights connected to you.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {['Private reports', 'Coach chat', 'Personality card'].map((item) => (
              <div key={item} className="rounded-3xl border border-line bg-paper p-4 text-xs text-smoke">
                {item}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleEmail} className="thin-panel p-6">
          <p className="tech-label text-smoke">{mode === 'sign-up' ? 'Create account' : 'Sign in'}</p>
          {!isConfigured ? (
            <p className="mt-5 text-sm leading-7 text-smoke">
              Supabase environment variables are missing. Add them from `.env.example`, then restart the app.
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={busy}
                className="mt-6 w-full rounded-sm border border-signal/35 bg-signal/10 px-5 py-4 text-sm text-bone transition hover:border-signal/35 disabled:opacity-50"
              >
                Continue with Google
              </button>
              <div className="my-6 h-px bg-well" />
              <label className="block">
                <span className="tech-label text-ash">Email</span>
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className="mt-2 w-full border border-line bg-well px-4 py-3 text-sm outline-none focus:border-signal/35" />
              </label>
              <label className="mt-4 block">
                <span className="tech-label text-ash">Password</span>
                <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={6} required className="mt-2 w-full border border-line bg-well px-4 py-3 text-sm outline-none focus:border-signal/35" />
              </label>
              {mode === 'sign-up' && (
                <p className="mt-4 text-xs leading-6 text-ash">
                  You can add your name, date of birth, and language preferences from your Profile after signing up.
                </p>
              )}
              {captchaRequired ? (
                <div className="mt-5 rounded-3xl border border-line bg-paper p-4">
                  <p className="tech-label text-ash">Security check</p>
                  <div className="mt-3">
                    <HCaptcha
                      onVerify={setCaptchaToken}
                      onError={(errorMessage) => setMessage(errorMessage)}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-3xl border border-line bg-paper p-4">
                  <p className="tech-label text-ash">Security check</p>
                  <p className="mt-2 text-sm leading-6 text-smoke">Security verification is available in the production environment.</p>
                </div>
              )}
              <button disabled={busy} className="glass-button mt-6 w-full px-5 py-4 text-xs text-bone disabled:opacity-50">
                {busy ? 'Working…' : mode === 'sign-up' ? 'Create account' : 'Sign in'}
              </button>
              <button type="button" onClick={() => setMode(mode === 'sign-up' ? 'sign-in' : 'sign-up')} className="mt-4 text-sm text-smoke hover:text-bone">
                {mode === 'sign-up' ? 'Already have an account? Sign in' : 'New here? Create an account'}
              </button>
              {message && <p className="mt-4 text-sm leading-6 text-smoke">{message}</p>}
            </>
          )}
        </form>
      </div>
    </section>
  );
}
