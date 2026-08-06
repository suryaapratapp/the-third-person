// Build-time prerenderer.
//
// WHY THIS EXISTS
// ---------------
// This is a Vite SPA: the server ships one empty `<div id="root"></div>` for
// every URL and React fills it in on the client. That produced three compounding
// SEO failures, verified against production before this was written:
//
//  1. CANONICAL POISONING (the severe one). index.html hardcoded
//     `<link rel="canonical" href="https://thethirdperson.ai/">`, and that shell
//     was served for EVERY route. So every blog post, every content page, told
//     search engines "the canonical version of me is the homepage" — which is a
//     direct instruction to drop them from the index and fold them into `/`.
//     No amount of content or link building survives that.
//
//  2. IDENTICAL TITLES. All ~20 routes served the homepage `<title>`, so the
//     pre-render crawl saw a site of duplicate pages.
//
//  3. NO BODY CONTENT. Social crawlers (WhatsApp, Facebook, LinkedIn, X) and
//     most AI crawlers execute no JavaScript at all, so they saw a blank page.
//     Google does render JS, but on a delayed second pass — so the claim that
//     content was "invisible" is true for social and AI crawlers, and true
//     *initially* for Google.
//
// WHAT THIS DOES
// --------------
// After `vite build`, writes a real HTML file per public route with correct,
// self-referencing per-route metadata, and — for blog posts — the actual
// article text baked into the HTML.
//
// The blog bodies are serialised from the SAME data blogContent.js feeds to
// BlogPostPage, so this is prerendering, not cloaking: crawlers and users get
// identical content. React replaces the markup on hydration.
//
// Pages whose content lives in JSX rather than data (pricing, faqs, vision…)
// get correct metadata but no prerendered body. Hand-writing bodies for those
// would risk drifting out of sync with what users actually see, which IS
// cloaking. Google renders their JS; the fix that matters for them was the
// canonical tag.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SITE_ORIGIN, seoMetaFor } from '../src/lib/seo.js';
import { BLOG_POSTS_META, getRelatedPosts } from '../src/lib/blogPostsMeta.js';
import { BLOG_CONTENT } from '../src/lib/blogContent.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = join(ROOT, 'dist');

// Public, indexable routes. Deliberately excludes everything robots.txt
// disallows (/analysis, /reports, /profile, /personality-card, /auth) — those
// are private app surfaces and fall through to the SPA rewrite.
const STATIC_ROUTES = [
  '/', '/pricing', '/faqs', '/company', '/vision',
  '/privacy', '/terms', '/refund-policy', '/blog',
];

const BLOG_ROUTES = BLOG_POSTS_META.map((post) => `/blog/${post.slug}`);
const ALL_ROUTES = [...STATIC_ROUTES, ...BLOG_ROUTES];

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// ---------------------------------------------------------------- head tags

function headFor(path, meta) {
  const url = `${SITE_ORIGIN}${path === '/' ? '/' : path}`;
  const post = path.startsWith('/blog/')
    ? BLOG_POSTS_META.find((entry) => `/blog/${entry.slug}` === path)
    : null;
  const ogType = post ? 'article' : 'website';

  return [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    '',
    `<meta property="og:type" content="${ogType}" />`,
    '<meta property="og:site_name" content="ThirdPerson AI" />',
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${SITE_ORIGIN}/og-default.png" />`,
    '',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${SITE_ORIGIN}/og-default.png" />`,
  ].join('\n    ');
}

// Article + breadcrumb structured data. Blog posts are the pages we actually
// want ranking, and Article markup is what earns them rich results.
function jsonLdFor(path) {
  const post = BLOG_POSTS_META.find((entry) => `/blog/${entry.slug}` === path);
  if (!post) return '';
  const url = `${SITE_ORIGIN}${path}`;
  const blocks = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.seoDescription || post.excerpt,
      articleSection: post.category,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      url,
      image: `${SITE_ORIGIN}/og-default.png`,
      publisher: {
        '@type': 'Organization',
        name: 'ThirdPerson AI',
        logo: { '@type': 'ImageObject', url: `${SITE_ORIGIN}/favicon.svg` },
      },
      author: { '@type': 'Organization', name: 'ThirdPerson AI' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_ORIGIN}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ],
    },
  ];
  return blocks
    .map((block) => `<script type="application/ld+json">${JSON.stringify(block)}</script>`)
    .join('\n    ');
}

// ------------------------------------------------------------- body content

// Mirrors the block types BlogPostPage.jsx renders. The `visual` field on step
// blocks is skipped: those are decorative SVG illustrations of app UI and carry
// no indexable text, but their `alt` copy does, so it is emitted as a caption.
function renderBlocks(blocks = []) {
  return blocks.map((block) => {
    switch (block.type) {
      case 'heading':
        return block.level === 3
          ? `<h3>${escapeHtml(block.text)}</h3>`
          : `<h2>${escapeHtml(block.text)}</h2>`;
      case 'paragraph':
        return `<p>${escapeHtml(block.text)}</p>`;
      case 'list': {
        const tag = block.ordered ? 'ol' : 'ul';
        const items = (block.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
        return `<${tag}>${items}</${tag}>`;
      }
      case 'step': {
        const parts = [`<p><strong>Step ${block.number}.</strong> ${escapeHtml(block.instruction)}</p>`];
        if (block.visual?.alt) parts.push(`<p><em>${escapeHtml(block.visual.alt)}</em></p>`);
        if (block.tip) parts.push(`<p>Tip: ${escapeHtml(block.tip)}</p>`);
        return parts.join('');
      }
      case 'callout':
        return `<p>${escapeHtml(block.text)}</p>`;
      default:
        return '';
    }
  }).filter(Boolean).join('\n');
}

function bodyFor(path) {
  if (path === '/blog') {
    const items = BLOG_POSTS_META.map((post) => [
      '<li>',
      `<h2><a href="/blog/${post.slug}">${escapeHtml(post.title)}</a></h2>`,
      `<p>${escapeHtml(post.excerpt)}</p>`,
      `<p>${escapeHtml(post.category)} · ${escapeHtml(post.readTime)}</p>`,
      '</li>',
    ].join('')).join('\n');
    return `<main><h1>Blog — ThirdPerson AI</h1><ul>${items}</ul></main>`;
  }

  const post = BLOG_POSTS_META.find((entry) => `/blog/${entry.slug}` === path);
  if (!post) return '';

  // Onward links must exist in the static HTML too, and must match what the
  // hydrated page shows. A post with no outbound links is a crawl dead end.
  const related = getRelatedPosts(post.slug)
    .map((item) => `<li><a href="/blog/${item.slug}">${escapeHtml(item.title)}</a></li>`)
    .join('');

  return [
    '<main>',
    '<article>',
    `<h1>${escapeHtml(post.title)}</h1>`,
    `<p>${escapeHtml(post.category)} · ${escapeHtml(post.readTime)}</p>`,
    `<p>${escapeHtml(post.excerpt)}</p>`,
    renderBlocks(BLOG_CONTENT[post.slug]),
    '</article>',
    '<section><h2>Got your chat exported?</h2>',
    '<p><a href="/analysis/new">Analyse a chat with ThirdPerson AI</a></p></section>',
    related ? `<nav aria-label="Related articles"><h2>Keep reading</h2><ul>${related}</ul></nav>` : '',
    '<nav><a href="/blog">All articles</a> · <a href="/">ThirdPerson AI home</a></nav>',
    '</main>',
  ].filter(Boolean).join('\n');
}

// ------------------------------------------------------------------- sitemap

function buildSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const priorityFor = (path) => {
    if (path === '/') return '1.0';
    if (path === '/blog' || path.startsWith('/blog/')) return '0.8';
    if (['/privacy', '/terms', '/refund-policy'].includes(path)) return '0.4';
    return '0.7';
  };
  const urls = ALL_ROUTES.map((path) => [
    '  <url>',
    `    <loc>${SITE_ORIGIN}${path === '/' ? '/' : path}</loc>`,
    `    <lastmod>${today}</lastmod>`,
    `    <changefreq>${path.startsWith('/blog/') ? 'monthly' : 'weekly'}</changefreq>`,
    `    <priority>${priorityFor(path)}</priority>`,
    '  </url>',
  ].join('\n')).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function buildRobots() {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /analysis/',
    'Disallow: /reports',
    'Disallow: /reports/',
    'Disallow: /profile',
    'Disallow: /personality-card',
    'Disallow: /auth',
    '',
    `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------- run

const shellPath = join(DIST, 'index.html');
if (!existsSync(shellPath)) {
  console.error('prerender: dist/index.html not found — run `vite build` first.');
  process.exit(1);
}
const shell = readFileSync(shellPath, 'utf8');

for (const marker of ['<!--seo:start-->', '<!--seo:end-->', '<!--app-html-->', '<!--seo:jsonld-->']) {
  if (!shell.includes(marker)) {
    console.error(`prerender: marker ${marker} missing from index.html — cannot inject safely.`);
    process.exit(1);
  }
}

let written = 0;
for (const path of ALL_ROUTES) {
  const meta = seoMetaFor(path);
  const html = shell
    .replace(
      /<!--seo:start-->[\s\S]*?<!--seo:end-->/,
      `<!--seo:start-->\n    ${headFor(path, meta)}\n    <!--seo:end-->`,
    )
    .replace('<!--seo:jsonld-->', jsonLdFor(path))
    .replace('<!--app-html-->', bodyFor(path));

  const outPath = path === '/'
    ? join(DIST, 'index.html')
    : join(DIST, path.slice(1), 'index.html');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html, 'utf8');
  written += 1;
}

// SPA fallback shell.
//
// Vercel serves this for anything not matched by a real file: the private app
// routes (/analysis/new, /reports/:id, /profile…) and any unknown URL.
//
// It is a dedicated file rather than reusing index.html for two reasons.
// First, `cleanUrls: true` turns /index.html into a 308 redirect, so a rewrite
// pointing at it resolves to nothing and Vercel returns 404 — which took every
// private route offline. Second, falling back to the homepage would serve the
// homepage's prerendered body and `canonical: /` for every mistyped URL,
// which is the "broken links silently render the front page" problem in the
// HTML itself, where a client-side 404 page cannot reach a non-JS crawler.
//
// So: no prerendered body, no canonical, and an explicit noindex.
const fallbackShell = shell
  .replace(
    /<!--seo:start-->[\s\S]*?<!--seo:end-->/,
    [
      '<!--seo:start-->',
      '    <title>ThirdPerson AI</title>',
      '    <meta name="robots" content="noindex, follow" />',
      '    <!--seo:end-->',
    ].join('\n'),
  )
  .replace('<!--seo:jsonld-->', '')
  .replace('<!--app-html-->', '');
writeFileSync(join(DIST, 'app-shell.html'), fallbackShell, 'utf8');

writeFileSync(join(DIST, 'sitemap.xml'), buildSitemap(), 'utf8');
writeFileSync(join(DIST, 'robots.txt'), buildRobots(), 'utf8');

console.log(`prerender: wrote ${written} routes (${BLOG_ROUTES.length} with full article HTML)`);
console.log(`prerender: sitemap.xml with ${ALL_ROUTES.length} URLs, robots.txt — origin ${SITE_ORIGIN}`);
