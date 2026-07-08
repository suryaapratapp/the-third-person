import { useEffect, useRef, useState } from 'react';
import { PiArrowRight, PiCaretDown, PiHeartFill } from 'react-icons/pi';
import { useAuth } from '../state/AuthContext.jsx';
import { useRouter } from '../state/RouterContext.jsx';

export default function TopNav() {
  const { navigate } = useRouter();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [twinFlameOpen, setTwinFlameOpen] = useState(false);
  const productRef = useRef(null);
  const companyRef = useRef(null);
  const accountRef = useRef(null);

  useEffect(() => {
    function onPointerDown(event) {
      if (productRef.current && !productRef.current.contains(event.target)) setProductOpen(false);
      if (companyRef.current && !companyRef.current.contains(event.target)) setCompanyOpen(false);
      if (accountRef.current && !accountRef.current.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setProductOpen(false);
        setCompanyOpen(false);
        setOpen(false);
        setTwinFlameOpen(false);
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
    setCompanyOpen(false);
    setTwinFlameOpen(false);
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
      <div className="mx-auto flex max-w-[1540px] items-center justify-between rounded-[28px] border border-purple-200/15 bg-[#171523]/82 px-4 py-3 shadow-[0_18px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:px-7">
        <button
          onClick={() => navigate('/')}
          className="font-mono text-[0.72rem] uppercase tracking-[0.28em] text-bone sm:text-sm"
        >
          ThirdPerson AI
        </button>
        <nav className="hidden items-center gap-5 lg:gap-8 md:flex">
          <div className="relative" ref={productRef}>
            <button
              onClick={() => setProductOpen((current) => !current)}
              className="flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-smoke transition hover:text-bone"
            >
              Product
              <PiCaretDown className={`text-xs transition-transform duration-200 ${productOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {productOpen && (
              <div className="absolute left-0 top-8 w-64 rounded-3xl border border-purple-300/18 bg-[#171523]/95 p-2 shadow-glow backdrop-blur-xl">
                {[
                  ['Start Analysis', '/analysis/new'],
                  ['Relationship Reports', '/reports'],
                  ['Understand Yourself', '/personality-card'],
                ].map(([label, href]) => (
                  <button
                    key={label}
                    onClick={() => menuNavigate(href)}
                    className="flex w-full items-center justify-between border-b border-white/10 px-4 py-3 text-left text-sm text-smoke transition last:border-b-0 hover:bg-purple-300/10 hover:text-bone"
                  >
                    <span>{label}</span>
                    <PiArrowRight className="text-purple-200/60" aria-hidden="true" />
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
          <button
            onClick={() => menuNavigate('/blog')}
            className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-smoke transition hover:text-bone"
          >
            Blog
          </button>
          <button
            type="button"
            onClick={() => setTwinFlameOpen(true)}
            className="relative flex items-center rounded-full border border-pink-200/25 bg-gradient-to-r from-pink-300/12 via-purple-300/14 to-orange-300/10 px-4 py-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-pink-100 shadow-[0_16px_42px_rgba(0,0,0,0.20)] transition hover:-translate-y-0.5 hover:border-pink-300/50 hover:text-bone"
          >
            <PiHeartFill className="mr-2 text-pink-100" aria-hidden="true" />
            Compatibility Match
          </button>
          <button
            onClick={() => menuNavigate('/privacy')}
            className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-smoke transition hover:text-bone"
          >
            Privacy
          </button>
          <div className="relative" ref={companyRef}>
            <button
              onClick={() => setCompanyOpen((current) => !current)}
              className="flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-smoke transition hover:text-bone"
            >
              Company
              <PiCaretDown className={`text-xs transition-transform duration-200 ${companyOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {companyOpen && (
              <div className="absolute right-0 top-8 w-56 rounded-3xl border border-purple-300/18 bg-[#171523]/95 p-2 shadow-glow backdrop-blur-xl">
                {[
                  ['About Company', '/company'],
                  ['Vision', '/vision'],
                  ['FAQs', '/faqs'],
                  ['Terms of Service', '/terms'],
                  ['Refund Policy', '/refund-policy'],
                ].map(([label, href]) => (
                  <button
                    key={label}
                    onClick={() => menuNavigate(href)}
                    className="flex w-full items-center justify-between border-b border-white/10 px-4 py-3 text-left text-sm text-smoke transition last:border-b-0 hover:bg-purple-300/10 hover:text-bone"
                  >
                    <span>{label}</span>
                    <PiArrowRight className="text-purple-200/60" aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </div>
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
                <span key={index} className="h-1 w-1 rounded-full bg-gradient-to-br from-purple-100 via-pink-100 to-orange-100" />
            ))}
          </button>
          {open && (
            <div className="absolute right-0 top-12 w-64 rounded-3xl border border-purple-300/18 bg-[#171523]/95 p-2 shadow-glow backdrop-blur-xl">
              {[
                ['Profile', '/profile'],
                ['Understand Yourself', '/personality-card'],
                ['Relationship Reports', '/reports'],
                ['Vision', '/vision'],
                ['FAQs', '/faqs'],
                ['Pricing', '/pricing'],
                ['Blog', '/blog'],
                ['Compatibility Match', 'coming-soon'],
                ['Privacy', '/privacy'],
                ['Contact', '/company#contact'],
              ].map(([label, href]) => (
                <button
                  key={label}
                  onClick={() => {
                    if (href === 'coming-soon') {
                      setOpen(false);
                      setTwinFlameOpen(true);
                      return;
                    }
                    menuNavigate(href);
                  }}
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
      {twinFlameOpen && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 px-4 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-labelledby="compatibility-match-heading"
        >
          <div className="relative max-w-lg overflow-hidden rounded-[34px] border border-pink-200/20 bg-[#171523]/95 p-7 text-center shadow-[0_28px_120px_rgba(0,0,0,0.30)]">
            <div className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full bg-pink-300/20 blur-3xl" />
            <div className="pointer-events-none absolute -right-16 -bottom-16 h-44 w-44 rounded-full bg-orange-300/16 blur-3xl" />
            <p className="tech-label relative text-pink-100">Coming soon</p>
            <h3 id="compatibility-match-heading" className="serif-title relative mt-4 text-5xl leading-tight text-bone">Compatibility Match</h3>
            <p className="relative mt-5 text-sm leading-7 text-smoke">
              A refined compatibility experience is being prepared around emotional rhythm, communication style, and relationship fit.
            </p>
            <button
              type="button"
              onClick={() => setTwinFlameOpen(false)}
              className="glass-button relative mt-7 rounded-full px-6 py-4 font-mono text-xs uppercase tracking-[0.16em] text-bone"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
