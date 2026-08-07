import { useEffect, useRef, useState } from 'react';
import { PiArrowRight, PiCaretDown, PiList, PiX } from 'react-icons/pi';
import Logo from './Logo.jsx';
import { useAuth } from '../state/AuthContext.jsx';
import { useRouter } from '../state/RouterContext.jsx';

// Top navigation.
//
// Two things changed here. The nav used to carry a "Compatibility Match"
// button whose only behaviour was to open a modal saying it does not exist yet
// — prime navigation space spent on a dead-end tap. That story is now told
// properly by the mission section on the homepage and the vision page, so the
// nav links to the real page instead of a dialog.
//
// And on mobile the only control was an unlabelled 9-dot grid holding ten
// links, with no route to "start an analysis" at all. Primary navigation now
// lives in the bottom tab bar; this menu holds the secondary links and is a
// labelled sheet with full-width tap targets.
//
// Profile had no route on desktop at all: it lived only in the mobile bottom
// tab bar, so a signed-in user on a laptop had no way to reach it short of
// typing /profile into the address bar. It now appears in the Product
// dropdown and the mobile sheet whenever someone is signed in.

function productLinks(signedIn) {
  const links = [
    ['Start an analysis', '/analysis/new'],
    ['Your reports', '/reports'],
    ['Know Yourself', '/personality-card'],
  ];
  return signedIn ? [...links, ['Profile', '/profile']] : links;
}

const COMPANY_LINKS = [
  ['About', '/company'],
  ['FAQs', '/faqs'],
  ['Privacy', '/privacy'],
  ['Terms of Service', '/terms'],
  ['Refund Policy', '/refund-policy'],
];

function mobileLinks(signedIn) {
  const links = [
    ['Vision', '/vision'],
    ['Pricing', '/pricing'],
    ['Blog', '/blog'],
    ['FAQs', '/faqs'],
    ['About', '/company'],
    ['Privacy', '/privacy'],
    ['Terms of Service', '/terms'],
    ['Refund Policy', '/refund-policy'],
  ];
  return signedIn ? [['Profile', '/profile'], ...links] : links;
}

function DropdownItem({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between border-b border-line px-4 py-3 text-left text-sm text-smoke transition last:border-b-0 hover:bg-purple-50 hover:text-bone"
    >
      <span>{label}</span>
      <PiArrowRight className="text-purple-700" aria-hidden="true" />
    </button>
  );
}

export default function TopNav() {
  const { navigate } = useRouter();
  const { user, signOut } = useAuth();
  const signedIn = Boolean(user);
  const PRODUCT_LINKS = productLinks(signedIn);
  const MOBILE_LINKS = mobileLinks(signedIn);
  const [menuOpen, setMenuOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const productRef = useRef(null);
  const companyRef = useRef(null);

  useEffect(() => {
    function onPointerDown(event) {
      if (productRef.current && !productRef.current.contains(event.target)) setProductOpen(false);
      if (companyRef.current && !companyRef.current.contains(event.target)) setCompanyOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setProductOpen(false);
        setCompanyOpen(false);
        setMenuOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  // The mobile sheet covers the viewport, so the page behind it must not scroll.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [menuOpen]);

  function menuNavigate(path) {
    setMenuOpen(false);
    setProductOpen(false);
    setCompanyOpen(false);
    navigate(path);
  }

  async function handleAuthClick() {
    setMenuOpen(false);
    if (user) {
      await signOut();
      navigate('/');
      return;
    }
    navigate('/auth');
  }

  // A full-bleed opaque rail, not a floating translucent pill. Two reasons:
  // the theme has no backdrop-filter left, so a translucent bar showed page
  // content sliding through it, and a rounded card hovering over the content
  // was the last piece of chrome still reading as the old look.
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <button onClick={() => navigate('/')} aria-label="ThirdPerson AI — home">
          <Logo size={26} withWordmark />
        </button>

        {/* `whitespace-nowrap` on the items: at exactly 768px — the md
            breakpoint where this nav first appears — a wrapping label pushed
            the header to two lines and 88px tall. */}
        <nav className="hidden items-center gap-5 lg:gap-8 md:flex [&_button]:whitespace-nowrap" aria-label="Main">
          <div className="relative" ref={productRef}>
            <button
              onClick={() => { setProductOpen((current) => !current); setCompanyOpen(false); }}
              aria-expanded={productOpen}
              className="flex items-center gap-1.5 text-xs text-smoke transition hover:text-bone"
            >
              Product
              <PiCaretDown className={`text-xs transition-transform duration-200 ${productOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {productOpen && (
              <div className="absolute left-0 top-8 w-64 rounded-sm border border-purple-200 bg-surface p-2 shadow-glow ">
                {PRODUCT_LINKS.map(([label, href]) => (
                  <DropdownItem key={label} label={label} onClick={() => menuNavigate(href)} />
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => menuNavigate('/pricing')}
            className=" text-xs text-smoke transition hover:text-bone"
          >
            Pricing
          </button>

          <button
            onClick={() => menuNavigate('/vision')}
            className=" text-xs text-smoke transition hover:text-bone"
          >
            Vision
          </button>

          <button
            onClick={() => menuNavigate('/blog')}
            className=" text-xs text-smoke transition hover:text-bone"
          >
            Blog
          </button>

          <div className="relative" ref={companyRef}>
            <button
              onClick={() => { setCompanyOpen((current) => !current); setProductOpen(false); }}
              aria-expanded={companyOpen}
              className="flex items-center gap-1.5 text-xs text-smoke transition hover:text-bone"
            >
              Company
              <PiCaretDown className={`text-xs transition-transform duration-200 ${companyOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {companyOpen && (
              <div className="absolute right-0 top-8 w-56 rounded-sm border border-purple-200 bg-surface p-2 shadow-glow ">
                {COMPANY_LINKS.map(([label, href]) => (
                  <DropdownItem key={label} label={label} onClick={() => menuNavigate(href)} />
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleAuthClick}
            className="hidden whitespace-nowrap text-xs text-smoke transition hover:text-bone md:block"
          >
            {user ? 'Sign out' : 'Sign in'}
          </button>
          <button
            onClick={() => navigate('/analysis/new')}
            className="btn btn-primary hidden whitespace-nowrap !px-4 !py-2 !text-sm md:inline-flex"
          >
            Analyse a chat
          </button>

          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="flex min-h-[44px] items-center gap-2 rounded-sm border border-lineStrong px-3 py-2 text-sm font-medium text-ink transition hover:bg-well md:hidden"
          >
            <PiList className="text-base" aria-hidden="true" />
            Menu
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-[60] bg-paper md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <p className="text-sm font-semibold text-ink">Menu</p>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="grid h-11 w-11 place-items-center rounded-full border border-lineStrong text-ink"
              >
                <PiX className="text-lg" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <button
                onClick={() => menuNavigate('/analysis/new')}
                className="btn btn-primary w-full text-sm"
              >
                Analyse a chat
                <PiArrowRight className="text-base" aria-hidden="true" />
              </button>

              <ul className="mt-5">
                {MOBILE_LINKS.map(([label, href]) => (
                  <li key={label}>
                    <button
                      onClick={() => menuNavigate(href)}
                      className="flex min-h-[52px] w-full items-center justify-between border-b border-line text-left text-base text-smoke transition active:text-bone"
                    >
                      <span>{label}</span>
                      <PiArrowRight className="text-purple-700" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-line px-5 py-4">
              <button onClick={handleAuthClick} className="btn btn-ghost w-full text-xs">
                {user ? 'Sign out' : 'Sign in'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
