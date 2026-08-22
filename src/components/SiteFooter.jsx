import Logo from './Logo.jsx';
import RouteLink from './RouteLink.jsx';

// The site had no footer at all — Terms, Refund Policy and Contact lived only
// inside a desktop nav dropdown, which is both a discoverability problem and a
// gap for a product that takes payments (Cashfree expects these reachable from
// every page). It also gives the long marketing pages a real ending instead of
// stopping dead.

const COLUMNS = [
  {
    title: 'Product',
    links: [
      ['Start an analysis', '/analysis/new'],
      ['Your reports', '/reports'],
      ['Know Yourself', '/personality-card'],
      ['Pricing', '/pricing'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['Vision', '/vision'],
      ['About', '/company'],
      ['Blog', '/blog'],
      ['FAQs', '/faqs'],
    ],
  },
  {
    title: 'Legal',
    links: [
      ['Privacy Policy', '/privacy'],
      ['Terms of Service', '/terms'],
      ['Refund Policy', '/refund-policy'],
      ['Contact', '/company#contact'],
    ],
  },
];

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line px-4 pb-10 pt-12 sm:px-8">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.3fr_repeat(3,1fr)]">
          <div>
            <Logo size={30} withWordmark />
            <p className="mt-4 max-w-xs text-sm leading-7 text-smoke">
              Understand any relationship from the conversation you already had — and, over time, the person
              you are across all of them.
            </p>
          </div>
          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="tech-label text-ash">{column.title}</p>
              <ul className="mt-4 grid gap-1">
                {column.links.map(([label, href]) => (
                  <li key={label}>
                    <RouteLink
                      to={href}
                      className="-mx-2 flex min-h-[44px] w-full items-center rounded-lg px-2 text-left text-sm text-smoke no-underline transition hover:text-bone"
                    >
                      {label}
                    </RouteLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-6 text-ash">© {year} ThirdPerson AI. All rights reserved.</p>
          <p className="text-xs leading-6 text-ash">
            Reflective insight, not professional advice. Not a substitute for therapy or counselling.
          </p>
        </div>
      </div>
    </footer>
  );
}
