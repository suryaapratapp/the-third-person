import ParticleBackground from '../components/ParticleBackground.jsx';
import { BLOG_POSTS_META } from '../lib/blogPostsMeta.js';
import { useRouter } from '../state/RouterContext.jsx';

const CATEGORY_ACCENTS = {
  'Export Guides': 'border-purple-200/20 text-purple-100',
  'Relationship Science': 'border-pink-200/20 text-pink-100',
};

export default function BlogIndexPage() {
  const { navigate } = useRouter();

  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
      <ParticleBackground className="opacity-45" />
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
            <button
              key={post.slug}
              onClick={() => navigate(`/blog/${post.slug}`)}
              className="thin-panel group flex flex-col p-6 text-left transition hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-full border px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.12em] ${CATEGORY_ACCENTS[post.category] || 'border-white/15 text-smoke'}`}>
                  {post.category}
                </span>
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-ash">{post.readTime}</span>
              </div>
              <h2 className="serif-title mt-5 text-2xl leading-tight text-bone group-hover:text-bone">{post.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-7 text-smoke">{post.excerpt}</p>
              <span className="mt-5 font-mono text-xs uppercase tracking-[0.12em] text-purple-200">Read more →</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
