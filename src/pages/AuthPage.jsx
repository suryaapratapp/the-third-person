import { useState } from 'react';
import ParticleBackground from '../components/ParticleBackground.jsx';
import { supabase } from '../lib/supabaseClient.js';
import { useAuth } from '../state/AuthContext.jsx';
import { useRouter } from '../state/RouterContext.jsx';

function nextPath() {
  const params = new URLSearchParams(window.location.search);
  return params.get('next') || '/reports';
}

export default function AuthPage() {
  const { isConfigured, user } = useAuth();
  const { navigate } = useRouter();
  const [mode, setMode] = useState('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleEmail(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const action = mode === 'sign-up'
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password });
    const { error } = await action;
    setBusy(false);
    if (error) {
      setMessage(error.message || 'We could not complete sign in.');
      return;
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
            Sign in to keep your reports, relationship chains, Bestie chats, and personality insights connected to you.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {['Private reports', 'Bestie chat', 'Personality card'].map((item) => (
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
                className="mt-6 w-full rounded-full border border-blue-200/25 bg-blue-300/10 px-5 py-4 text-sm text-bone transition hover:border-blue-100/60 disabled:opacity-50"
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
