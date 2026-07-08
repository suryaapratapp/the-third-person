import { useState } from 'react';
import HCaptcha from '../components/HCaptcha.jsx';
import ParticleBackground from '../components/ParticleBackground.jsx';
import { defaultAnalysisLanguages, supportedAnalysisLanguages } from '../lib/languages.js';
import { emptyProfile, saveUserProfile } from '../lib/profileStore.js';
import { supabase } from '../lib/supabaseClient.js';
import { upsertRemoteProfile } from '../lib/supabaseDataService.js';
import { useAuth } from '../state/AuthContext.jsx';
import { useRouter } from '../state/RouterContext.jsx';

const identityOptions = ['Female', 'Male', 'Transgender', 'Non-binary', 'Other', 'Prefer not to say'];

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
  const [signupProfile, setSignupProfile] = useState({
    firstName: '',
    lastName: '',
    genderIdentity: '',
    dateOfBirth: '',
    preferredAnalysisLanguages: defaultAnalysisLanguages,
  });
  const captchaRequired = !isLocalAuthTesting();

  function updateSignupProfile(field, value) {
    setSignupProfile((current) => ({ ...current, [field]: value }));
  }

  function toggleSignupLanguage(language) {
    setSignupProfile((current) => {
      const selected = new Set(current.preferredAnalysisLanguages || []);
      if (selected.has(language)) selected.delete(language);
      else selected.add(language);
      return { ...current, preferredAnalysisLanguages: [...selected] };
    });
  }

  async function handleEmail(event) {
    event.preventDefault();
    if (captchaRequired && !captchaToken) {
      setMessage('Please complete the security check before continuing.');
      return;
    }
    if (mode === 'sign-up') {
      const hasRequiredProfile =
        signupProfile.firstName.trim()
        && signupProfile.lastName.trim()
        && signupProfile.genderIdentity
        && signupProfile.dateOfBirth
        && signupProfile.preferredAnalysisLanguages.length > 0;
      if (!hasRequiredProfile) {
        setMessage('Please complete your profile details before creating your account.');
        return;
      }
    }
    setBusy(true);
    setMessage('');
    const profilePayload = {
      ...emptyProfile,
      firstName: signupProfile.firstName.trim(),
      lastName: signupProfile.lastName.trim(),
      email: email.trim(),
      genderIdentity: signupProfile.genderIdentity,
      dateOfBirth: signupProfile.dateOfBirth,
      preferredAnalysisLanguages: signupProfile.preferredAnalysisLanguages,
    };
    const action = mode === 'sign-up'
      ? supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            ...(captchaRequired ? { captchaToken } : {}),
            emailRedirectTo: `${window.location.origin}${nextPath()}`,
            data: {
              first_name: profilePayload.firstName,
              last_name: profilePayload.lastName,
              gender_identity: profilePayload.genderIdentity,
              date_of_birth: profilePayload.dateOfBirth,
              preferred_analysis_languages: profilePayload.preferredAnalysisLanguages,
            },
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
      <ParticleBackground className="opacity-45" />
      <div className="relative mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_420px]">
        <div className="accent-panel p-7 sm:p-10">
          <p className="tech-label text-purple-200">Private access</p>
          <h1 className="serif-title mt-4 text-5xl leading-tight sm:text-7xl">Welcome to ThirdPerson AI.</h1>
          <p className="mt-6 max-w-2xl text-sm leading-8 text-smoke">
            Sign in to keep your reports, relationship chains, coach chats, and personality insights connected to you.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {['Private reports', 'Coach chat', 'Personality card'].map((item) => (
              <div key={item} className="rounded-3xl border border-white/10 bg-white/[0.045] p-4 font-mono text-xs uppercase tracking-[0.13em] text-smoke">
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
                className="mt-6 w-full rounded-full border border-violet-200/25 bg-violet-300/10 px-5 py-4 text-sm text-bone transition hover:border-violet-100/60 disabled:opacity-50"
              >
                Continue with Google
              </button>
              <div className="my-6 h-px bg-white/10" />
              <label className="block">
                <span className="tech-label text-ash">Email</span>
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className="mt-2 w-full border border-white/12 bg-black/45 px-4 py-3 text-sm outline-none focus:border-purple-200/60" />
              </label>
              <label className="mt-4 block">
                <span className="tech-label text-ash">Password</span>
                <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={6} required className="mt-2 w-full border border-white/12 bg-black/45 px-4 py-3 text-sm outline-none focus:border-purple-200/60" />
              </label>
              {mode === 'sign-up' && (
                <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-4">
                  <p className="tech-label text-purple-100">Profile details</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="tech-label text-ash">First name</span>
                      <input
                        value={signupProfile.firstName}
                        onChange={(event) => updateSignupProfile('firstName', event.target.value)}
                        type="text"
                        required
                        className="mt-2 w-full border border-white/12 bg-black/45 px-4 py-3 text-sm outline-none focus:border-purple-200/60"
                      />
                    </label>
                    <label className="block">
                      <span className="tech-label text-ash">Last name</span>
                      <input
                        value={signupProfile.lastName}
                        onChange={(event) => updateSignupProfile('lastName', event.target.value)}
                        type="text"
                        required
                        className="mt-2 w-full border border-white/12 bg-black/45 px-4 py-3 text-sm outline-none focus:border-purple-200/60"
                      />
                    </label>
                    <label className="block">
                      <span className="tech-label text-ash">Gender / identity</span>
                      <select
                        value={signupProfile.genderIdentity}
                        onChange={(event) => updateSignupProfile('genderIdentity', event.target.value)}
                        required
                        className="mt-2 w-full border border-white/12 bg-black/45 px-4 py-3 text-sm outline-none focus:border-purple-200/60"
                      >
                        <option value="">Select one</option>
                        {identityOptions.map((option) => <option key={option}>{option}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="tech-label text-ash">Date of birth</span>
                      <input
                        value={signupProfile.dateOfBirth}
                        onChange={(event) => updateSignupProfile('dateOfBirth', event.target.value)}
                        type="date"
                        required
                        className="mt-2 w-full border border-white/12 bg-black/45 px-4 py-3 text-sm outline-none focus:border-purple-200/60"
                      />
                    </label>
                  </div>
                  <div className="mt-5">
                    <p className="tech-label text-ash">Preferred analysis languages</p>
                    <p className="mt-2 text-xs leading-6 text-smoke">
                      Choose at least one language that commonly appears in your conversations.
                    </p>
                    <div className="mt-3 flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-1">
                      {supportedAnalysisLanguages.map((language) => {
                        const active = signupProfile.preferredAnalysisLanguages.includes(language);
                        return (
                          <button
                            key={language}
                            type="button"
                            onClick={() => toggleSignupLanguage(language)}
                            className={`rounded-full border px-3 py-2 font-mono text-[0.62rem] uppercase tracking-[0.1em] transition ${active ? 'border-purple-200/60 bg-purple-300/15 text-bone' : 'border-white/10 bg-black/25 text-ash hover:border-purple-200/40 hover:text-bone'}`}
                          >
                            {language}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-xs leading-6 text-ash">
                      Selected: {signupProfile.preferredAnalysisLanguages.join(', ') || 'None yet'}
                    </p>
                  </div>
                </div>
              )}
              {captchaRequired ? (
                <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-4">
                  <p className="tech-label text-ash">Security check</p>
                  <div className="mt-3">
                    <HCaptcha
                      onVerify={setCaptchaToken}
                      onError={(errorMessage) => setMessage(errorMessage)}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-4">
                  <p className="tech-label text-ash">Security check</p>
                  <p className="mt-2 text-sm leading-6 text-smoke">Security verification is available in the production environment.</p>
                </div>
              )}
              <button disabled={busy} className="glass-button mt-6 w-full px-5 py-4 font-mono text-xs uppercase tracking-[0.16em] text-bone disabled:opacity-50">
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
