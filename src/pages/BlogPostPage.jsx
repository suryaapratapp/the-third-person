import ParticleBackground from '../components/ParticleBackground.jsx';
import ScreenshotPlaceholder from '../components/ScreenshotPlaceholder.jsx';
import { getBlogContentBySlug } from '../lib/blogContent.js';
import { getBlogPostMetaBySlug } from '../lib/blogPostsMeta.js';
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
        <div className="mt-5 border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <div className="flex gap-3">
            <span className="font-mono text-purple-200">{String(block.number).padStart(2, '0')}</span>
            <p className="text-sm leading-7 text-smoke sm:text-base">{block.instruction}</p>
          </div>
          {block.screenshot && <ScreenshotPlaceholder id={block.screenshot.id} alt={block.screenshot.alt} />}
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
        <button onClick={() => navigate('/blog')} className="font-mono text-xs uppercase tracking-[0.14em] text-purple-200 hover:text-bone">
          ← Back to Blog
        </button>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-white/15 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-smoke">{post.category}</span>
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-ash">{post.readTime}</span>
        </div>
        <h1 className="serif-title mt-4 text-4xl leading-tight sm:text-6xl">{post.title}</h1>
        <p className="mt-5 text-base leading-8 text-smoke">{post.excerpt}</p>
        <div className="thin-panel mt-8 p-6 sm:p-8">
          {content.map((block, index) => <Block key={index} block={block} />)}
        </div>
      </article>
    </section>
  );
}
