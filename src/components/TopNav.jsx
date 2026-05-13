import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../state/AuthContext.jsx';
import { useRouter } from '../state/RouterContext.jsx';

export default function TopNav() {
  const { navigate } = useRouter();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const productRef = useRef(null);
  const accountRef = useRef(null);

  useEffect(() => {
    function onPointerDown(event) {
      if (productRef.current && !productRef.current.contains(event.target)) setProductOpen(false);
      if (accountRef.current && !accountRef.current.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setProductOpen(false);
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  function menuNavigate(path) {
    setOpen(false);
    setProductOpen(false);
    navigate(path);
  }

  async function handleAuthClick() {
    if (user) {
      await signOut();
      navigate('/');
      return;
    }
    navigate('/auth');
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-50 px-3 py-3 sm:px-6">
      <div className="mx-auto flex max-w-[1540px] items-center justify-between border border-purple-200/18 bg-gradient-to-r from-[#20172d]/86 via-[#171523]/82 to-[#221322]/86 px-4 py-3 shadow-[0_18px_70px_rgba(168,85,247,0.12)] backdrop-blur-xl sm:px-7">
        <button
          onClick={() => navigate('/')}
          className="font-mono text-[0.72rem] uppercase tracking-[0.28em] text-bone sm:text-sm"
        >
          ThirdPerson AI
        </button>
        <nav className="hidden items-center gap-10 md:flex">
          <div className="relative" ref={productRef}>
            <button
              onClick={() => setProductOpen((current) => !current)}
              className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-smoke transition hover:text-bone"
            >
              Product
            </button>
            {productOpen && (
              <div className="absolute left-0 top-8 w-64 border border-purple-300/24 bg-[#17111f]/95 p-2 shadow-glow backdrop-blur-xl">
                {[
                  ['Start Analysis', '/analysis/new'],
                  ['Relationship Reports', '/reports'],
                  ['Personality Card', '/personality-card'],
                ].map(([label, href]) => (
                  <button
                    key={label}
                    onClick={() => menuNavigate(href)}
                    className="flex w-full items-center justify-between border-b border-white/10 px-4 py-3 text-left text-sm text-smoke transition last:border-b-0 hover:bg-purple-300/10 hover:text-bone"
                  >
                    <span>{label}</span>
                    <span className="text-purple-200/60">→</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => menuNavigate('/pricing')}
            className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-smoke transition hover:text-bone"
          >
            Pricing
          </button>
          {[
            ['Vision', '/vision'],
            ['Privacy', '/privacy'],
            ['Company', '/company'],
          ].map(([label, href]) => (
            <button
              key={label}
              onClick={() => menuNavigate(href)}
              className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-smoke transition hover:text-bone"
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="relative flex items-center gap-3" ref={accountRef}>
          <button
            onClick={handleAuthClick}
            className="hidden font-mono text-[0.65rem] uppercase tracking-[0.18em] text-smoke transition hover:text-bone sm:block"
          >
            {user ? 'Sign Out' : 'Sign In'}
          </button>
          <button
            onClick={() => setOpen((current) => !current)}
            aria-label="Open account menu"
            className="grid h-9 w-9 grid-cols-3 gap-1 border border-purple-300/20 p-2 transition hover:border-purple-300/60"
          >
            {Array.from({ length: 9 }).map((_, index) => (
                <span key={index} className="h-1 w-1 rounded-full bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100" />
            ))}
          </button>
          {open && (
            <div className="absolute right-0 top-12 w-64 border border-purple-300/24 bg-[#17111f]/95 p-2 shadow-glow backdrop-blur-xl">
              {[
                ['Profile', '/profile'],
                ['Personality Card', '/personality-card'],
                ['Relationship Reports', '/reports'],
                ['Vision', '/vision'],
                ['FAQs', '/faqs'],
                ['Pricing', '/pricing'],
                ['Privacy', '/privacy'],
                ['Contact', '/company#contact'],
              ].map(([label, href]) => (
                <button
                  key={label}
                  onClick={() => menuNavigate(href)}
                  className="flex w-full items-center justify-between border-b border-white/10 px-4 py-3 text-left text-sm text-smoke transition last:border-b-0 hover:bg-purple-300/10 hover:text-bone"
                >
                  <span>{label}</span>
                  <span className="text-purple-200/60">→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
