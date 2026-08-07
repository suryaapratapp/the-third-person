import { useEffect } from 'react';
import { PiArrowRight } from 'react-icons/pi';
import RouteLink from '../components/RouteLink.jsx';
import { BLOG_POSTS_META } from '../lib/blogPostsMeta.js';

// Unknown URLs used to fall through to the homepage. That is worse than it
// looks: someone following a broken or mistyped link silently landed on the
// front page with no indication anything had gone wrong, and search engines
// saw the homepage duplicated across every bad URL anyone ever linked to.
//
// Because the SPA fallback serves this with a 200, this is technically a soft
// 404. The `noindex` below is what actually keeps these URLs out of the index —
// Google treats a noindexed soft-404 as non-indexable regardless of status.
export default function NotFoundPage({ path }) {
  useEffect(() => {
    const tag = document.createElement('meta');
    tag.name = 'robots';
    tag.content = 'noindex, follow';
    document.head.appendChild(tag);
    return () => tag.remove();
  }, []);

  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
      <div className="relative mx-auto max-w-2xl text-center">
        <div className="accent-panel p-6 sm:p-10">
          <p className="tech-label text-smoke">404</p>
          <h1 className="serif-title mt-4 text-4xl leading-tight sm:text-6xl">
            That page doesn’t exist.
          </h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-smoke">
            {path
              ? <>Nothing lives at <span className="break-all text-bone">{path}</span>. It may have moved, or the link may be wrong.</>
              : <>The link may be wrong, or the page may have moved.</>}
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <RouteLink to="/" className="btn btn-primary w-full text-sm sm:w-auto">
              Go to the homepage
              <PiArrowRight className="text-base" aria-hidden="true" />
            </RouteLink>
            <RouteLink to="/analysis/new" className="btn btn-ghost w-full text-xs sm:w-auto">
              Analyse a chat
            </RouteLink>
          </div>
        </div>

        {/* Real links out, so a dead end still passes crawl equity onward and
            gives a lost reader somewhere useful to go. */}
        <nav className="mt-8 text-left" aria-label="Popular guides">
          <p className="tech-label text-smoke">Popular guides</p>
          <ul className="mt-4 grid gap-2">
            {BLOG_POSTS_META.slice(0, 4).map((post) => (
              <li key={post.slug}>
                <RouteLink
                  to={`/blog/${post.slug}`}
                  className="thin-panel block p-4 text-sm leading-6 text-bone no-underline transition hover:-translate-y-0.5"
                >
                  {post.title}
                </RouteLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
