import { useAuth } from '../state/AuthContext.jsx';
import { useRouter } from '../state/RouterContext.jsx';

export default function ProtectedRoute({ children }) {
  const { isConfigured, loading, user } = useAuth();
  const { path, navigate } = useRouter();

  if (!isConfigured) {
    return (
      <section className="min-h-screen px-4 pt-32 text-center">
        <div className="accent-panel mx-auto max-w-2xl p-8">
          <p className="tech-label text-smoke">Supabase setup needed</p>
          <h1 className="serif-title mt-4 text-5xl">Connect your app keys.</h1>
          <p className="mt-5 text-sm leading-8 text-smoke">
            Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your environment, then restart the dev server.
          </p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="min-h-screen px-4 pt-32 text-center">
        <div className="accent-panel mx-auto max-w-xl p-8">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-purple-200 border-t-transparent" />
          <p className="mt-5 font-mono text-xs uppercase tracking-[0.15em] text-smoke">Checking your secure session…</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="min-h-screen px-4 pt-32 text-center">
        <div className="accent-panel mx-auto max-w-2xl p-8">
          <p className="tech-label text-purple-200">Private account required</p>
          <h1 className="serif-title mt-4 text-5xl">Sign in to continue.</h1>
          <p className="mt-5 text-sm leading-8 text-smoke">
            Your reports, Bestie chats, and profile stay connected to your private account.
          </p>
          <button
            onClick={() => navigate(`/auth?next=${encodeURIComponent(path)}`)}
            className="glass-button mt-7 px-5 py-4 font-mono text-xs uppercase tracking-[0.16em] text-bone"
          >
            Sign in securely
          </button>
        </div>
      </section>
    );
  }

  return children;
}
