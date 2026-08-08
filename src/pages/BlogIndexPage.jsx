import RouteLink from '../components/RouteLink.jsx';
import { BLOG_POSTS_META } from '../lib/blogPostsMeta.js';

const CATEGORY_ACCENTS = {
  'Export Guides': 'border-signal/35 text-signal',
  'Relationship Science': 'border-you/35 text-you',
};

export default function BlogIndexPage() {
  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
      <div className="relative mx-auto max-w-[1320px]">
        <div className="corner-frame accent-panel p-6 text-center sm:p-12">
          <p className="tech-label text-smoke">Blog</p>
          <h1 className="serif-title mt-4 text-5xl leading-tight sm:text-7xl">Guides &amp; relationship insight.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-smoke">
            Export walkthroughs for every supported app, and a closer look at the psychology behind how we communicate.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {BLOG_POSTS_META.map((post) => (
            <RouteLink
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="thin-panel group flex flex-col p-6 text-left no-underline transition hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-sm border px-3 py-1 text-xs ${CATEGORY_ACCENTS[post.category] || 'border-line text-smoke'}`}>
                  {post.category}
                </span>
                <span className=" text-xs text-ash">{post.readTime}</span>
              </div>
              <h2 className="serif-title mt-5 text-2xl leading-tight text-bone group-hover:text-bone">{post.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-7 text-smoke">{post.excerpt}</p>
              <span className="mt-5 text-xs text-signal">Read more →</span>
            </RouteLink>
          ))}
        </div>
      </div>
    </section>
  );
}
