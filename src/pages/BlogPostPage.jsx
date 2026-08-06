import { PiArrowRight } from 'react-icons/pi';
import ParticleBackground from '../components/ParticleBackground.jsx';
import ExportStepVisual from '../components/ExportStepVisual.jsx';
import RouteLink from '../components/RouteLink.jsx';
import { getBlogContentBySlug } from '../lib/blogContent.js';
import { getBlogPostMetaBySlug, getRelatedPosts } from '../lib/blogPostsMeta.js';
import { useRouter } from '../state/RouterContext.jsx';

function Block({ block }) {
  switch (block.type) {
    case 'heading':
      return block.level === 3 ? (
        <h3 className="serif-title mt-8 text-2xl">{block.text}</h3>
      ) : (
        <h2 className="serif-title mt-10 text-3xl sm:text-4xl">{block.text}</h2>
      );
    case 'paragraph':
      return <p className="mt-4 text-sm leading-8 text-smoke sm:text-base">{block.text}</p>;
    case 'list':
      return block.ordered ? (
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-7 text-smoke sm:text-base">
          {block.items.map((item) => <li key={item}>{item}</li>)}
        </ol>
      ) : (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-smoke sm:text-base">
          {block.items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      );
    case 'step':
      return (
        <div className="mt-5 rounded-[20px] border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <div className="flex gap-3">
            <span className="font-mono text-purple-200">{String(block.number).padStart(2, '0')}</span>
            <p className="text-sm leading-7 text-smoke sm:text-base">{block.instruction}</p>
          </div>
          {block.visual && <ExportStepVisual spec={block.visual} alt={block.visual.alt} />}
          {block.tip && (
            <p className="mt-2 rounded-xl border border-purple-300/15 bg-purple-300/[0.05] p-3 text-xs leading-6 text-ash">
              Tip: {block.tip}
            </p>
          )}
        </div>
      );
    case 'callout': {
      const toneClass = block.tone === 'privacy'
        ? 'border-emerald-300/20 bg-emerald-300/[0.05]'
        : block.tone === 'tip'
          ? 'border-purple-300/20 bg-purple-300/[0.05]'
          : 'border-orange-300/20 bg-orange-300/[0.05]';
      return (
        <div className={`mt-5 rounded-2xl border p-4 text-sm leading-6 text-smoke ${toneClass}`}>
          {block.text}
        </div>
      );
    }
    default:
      return null;
  }
}

export default function BlogPostPage({ slug }) {
  const { navigate } = useRouter();
  const post = getBlogPostMetaBySlug(slug);
  const content = getBlogContentBySlug(slug);
  const related = getRelatedPosts(slug);

  if (!post || !content) {
    return (
      <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 text-center sm:px-8">
        <ParticleBackground className="opacity-45" />
        <div className="relative mx-auto max-w-2xl">
          <div className="accent-panel p-10">
            <p className="tech-label text-smoke">Blog</p>
            <h1 className="serif-title mt-4 text-5xl leading-tight">We couldn’t find that post.</h1>
            <button onClick={() => navigate('/blog')} className="glass-button mt-8 px-5 py-4 font-mono text-xs uppercase tracking-[0.16em] text-bone">
              Back to Blog
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
      <ParticleBackground className="opacity-45" />
      <article className="relative mx-auto max-w-[860px]">
        <RouteLink to="/blog" className="font-mono text-xs uppercase tracking-[0.14em] text-purple-200 hover:text-bone">
          ← Back to Blog
        </RouteLink>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-white/15 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-smoke">{post.category}</span>
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-ash">{post.readTime}</span>
        </div>
        <h1 className="serif-title mt-4 text-4xl leading-tight sm:text-6xl">{post.title}</h1>
        <p className="mt-5 text-base leading-8 text-smoke">{post.excerpt}</p>
        <div className="thin-panel mt-8 p-6 sm:p-8">
          {content.map((block, index) => <Block key={index} block={block} />)}
        </div>

        {/* Conversion path. An export guide's reader is one step away from the
            thing the guide is for, so say so rather than ending on nothing. */}
        <div className="accent-panel mt-8 p-6 text-center sm:p-8">
          <h2 className="serif-title text-3xl leading-tight sm:text-4xl">Got your chat exported?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-smoke">
            Upload it and get an honest read on effort, mixed signals, and how the relationship
            actually changed over time — backed by quotes from the conversation itself.
          </p>
          <RouteLink to="/analysis/new" className="btn btn-primary mt-6 text-sm">
            Analyse a chat
            <PiArrowRight className="text-base" aria-hidden="true" />
          </RouteLink>
        </div>

        {related.length > 0 && (
          <nav className="mt-10" aria-label="Related articles">
            <p className="tech-label text-smoke">Keep reading</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {related.map((item) => (
                <RouteLink
                  key={item.slug}
                  to={`/blog/${item.slug}`}
                  className="thin-panel block p-4 no-underline transition hover:-translate-y-0.5"
                >
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ash">{item.category}</span>
                  <span className="mt-2 block text-base leading-6 text-bone">{item.title}</span>
                </RouteLink>
              ))}
            </div>
          </nav>
        )}
      </article>
    </section>
  );
}
