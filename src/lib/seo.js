import { getBlogPostMetaBySlug } from './blogPostsMeta.js';

const SITE_NAME = 'ThirdPerson AI';
const DEFAULT_DESCRIPTION = 'ThirdPerson AI turns a real chat history with someone into a private relationship intelligence report — sentiment, red and green flags, communication style, and an ongoing AI Relationship Coach.';

const PAGE_SEO = {
  '/': {
    title: `${SITE_NAME} — Understand any relationship from the actual chat`,
    description: DEFAULT_DESCRIPTION,
  },
  '/analysis/new': {
    title: `Start a Relationship Analysis — ${SITE_NAME}`,
    description: 'Upload or paste a real conversation and get a private relationship intelligence report from ThirdPerson AI.',
  },
  '/analysis/result': {
    title: `Your Relationship Report — ${SITE_NAME}`,
    description: 'Your private relationship intelligence report: sentiment, communication style, red and green flags, and more.',
  },
  '/reports': {
    title: `Relationship Reports — ${SITE_NAME}`,
    description: 'Revisit your relationship intelligence reports and follow how each analysis chain changes over time.',
  },
  '/personality-card': {
    title: `Understand Yourself — ${SITE_NAME}`,
    description: 'A deeper personality map built from how you show up across your relationships.',
  },
  '/pricing': {
    title: `Pricing — ${SITE_NAME}`,
    description: 'Pay-as-you-go Relationship Reports and Coach Chats. Only pay for the clarity you need.',
  },
  '/faqs': {
    title: `FAQs — ${SITE_NAME}`,
    description: 'Clear, privacy-first answers about what ThirdPerson AI can and cannot do.',
  },
  '/company': {
    title: `About — ${SITE_NAME}`,
    description: 'A private relationship intelligence layer for modern conversations.',
  },
  '/vision': {
    title: `Vision — ${SITE_NAME}`,
    description: 'What ThirdPerson AI believes about relationships, privacy, and AI-assisted reflection.',
  },
  '/privacy': {
    title: `Privacy Policy — ${SITE_NAME}`,
    description: 'How ThirdPerson AI processes conversation data, what is stored, and what choices you have.',
  },
  '/terms': {
    title: `Terms of Service — ${SITE_NAME}`,
    description: 'The agreement governing your use of ThirdPerson AI.',
  },
  '/refund-policy': {
    title: `Refund & Cancellation Policy — ${SITE_NAME}`,
    description: 'How refunds work for ThirdPerson AI pay-as-you-go credit packs.',
  },
  '/auth': {
    title: `Sign In — ${SITE_NAME}`,
    description: 'Sign in to ThirdPerson AI to start a relationship analysis.',
  },
  '/profile': {
    title: `Profile — ${SITE_NAME}`,
    description: 'Manage your ThirdPerson AI profile and preferences.',
  },
  '/blog': {
    title: `Blog — ${SITE_NAME}`,
    description: 'Export guides for every supported messaging app, and a closer look at the psychology behind how we communicate.',
  },
};

function metaFor(path) {
  if (PAGE_SEO[path]) return PAGE_SEO[path];
  if (path.startsWith('/reports/')) {
    return {
      title: `AI Relationship Coach — ${SITE_NAME}`,
      description: 'Talk through a specific relationship with your AI Relationship Coach.',
    };
  }
  if (path.startsWith('/blog/')) {
    const post = getBlogPostMetaBySlug(path.replace('/blog/', ''));
    if (post) {
      return {
        title: post.seoTitle || `${post.title} — ${SITE_NAME}`,
        description: post.seoDescription || post.excerpt,
      };
    }
    return {
      title: `Blog — ${SITE_NAME}`,
      description: 'Export guides for every supported messaging app, and a closer look at the psychology behind how we communicate.',
    };
  }
  return PAGE_SEO['/'];
}

function ensureMetaTag(name, attr = 'name') {
  let tag = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  return tag;
}

function ensureLinkTag(rel) {
  let tag = document.head.querySelector(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }
  return tag;
}

export function applyRouteSeo(path, origin = typeof window !== 'undefined' ? window.location.origin : '') {
  if (typeof document === 'undefined') return;
  const { title, description } = metaFor(path);

  document.title = title;
  ensureMetaTag('description').setAttribute('content', description);
  ensureMetaTag('og:title', 'property').setAttribute('content', title);
  ensureMetaTag('og:description', 'property').setAttribute('content', description);
  ensureMetaTag('og:url', 'property').setAttribute('content', `${origin}${path}`);
  ensureMetaTag('twitter:title').setAttribute('content', title);
  ensureMetaTag('twitter:description').setAttribute('content', description);
  ensureLinkTag('canonical').setAttribute('href', `${origin}${path}`);
}
