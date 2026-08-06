import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js';

const AuthContext = createContext(null);

// Local-only UI preview for the signed-in screens.
//
// Most of this product sits behind auth — the analysis wizard, reports, the
// coach, Know Yourself — which makes those screens the hardest to check for
// layout regressions, because looking at them normally requires real
// credentials. This flag stubs a signed-in user so the gated routes RENDER,
// purely so their layout can be inspected on a real viewport.
//
// It cannot reach production. `import.meta.env.DEV` is statically replaced
// with `false` when Vite builds, so this whole branch is dead code that gets
// eliminated from the bundle — setting the env var on a deployed site does
// nothing. It is also deliberately NOT a real session: there is no Supabase
// token, so every authenticated data fetch still fails and the pages show
// their empty/error states. It proves layout, never behaviour.
//
// Turn on with: VITE_PREVIEW_UNLOCK=1 npm run dev
const PREVIEW_UNLOCK = import.meta.env.DEV && import.meta.env.VITE_PREVIEW_UNLOCK === '1';

const PREVIEW_USER = {
  id: '00000000-0000-4000-8000-preview000000',
  email: 'preview@localhost',
  user_metadata: { full_name: 'Layout Preview' },
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(PREVIEW_UNLOCK ? PREVIEW_USER : null);
  const [loading, setLoading] = useState(PREVIEW_UNLOCK ? false : isSupabaseConfigured);

  useEffect(() => {
    if (PREVIEW_UNLOCK) {
      console.warn('[preview-unlock] Auth gate bypassed for local layout inspection. No real session — data calls will fail.');
      return undefined;
    }
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session || null);
      setUser(data.session?.user || null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      setUser(nextSession?.user || null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    // Under preview-unlock, report as configured so ProtectedRoute renders the
    // real page instead of its "connect your app keys" setup screen.
    isConfigured: PREVIEW_UNLOCK || isSupabaseConfigured,
    session,
    user,
    loading,
    signOut: () => (PREVIEW_UNLOCK ? setUser(null) : supabase?.auth.signOut()),
  }), [session, user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
