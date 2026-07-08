// Lightweight metadata only — no article bodies here.
// This file is imported eagerly (by seo.js), so keep it small.
// Full article content lives in blogContent.js, which is only loaded
// by the lazy-loaded BlogPostPage.

export const BLOG_POSTS_META = [
  {
    slug: 'how-to-export-whatsapp-chats',
    title: 'How to Export WhatsApp Chats (Android & iPhone) — Step-by-Step Guide',
    excerpt: 'The exact taps to export any WhatsApp conversation as a clean text file, on both Android and iPhone, in about a minute.',
    category: 'Export Guides',
    readTime: '4 min read',
    seoTitle: 'How to Export WhatsApp Chats on Android & iPhone — ThirdPerson AI',
    seoDescription: 'A simple, step-by-step guide to exporting a WhatsApp chat as a .txt file on Android and iPhone, so you can upload it for a private relationship analysis.',
  },
  {
    slug: 'how-to-export-instagram-messages',
    title: 'How to Download Your Instagram Messages — Complete Guide',
    excerpt: 'Instagram doesn\'t have a one-tap export button, but the official data download takes about five minutes to request.',
    category: 'Export Guides',
    readTime: '5 min read',
    seoTitle: 'How to Download Your Instagram Messages — ThirdPerson AI',
    seoDescription: 'Step-by-step instructions for requesting and downloading your Instagram DMs using Instagram\'s official data download tool.',
  },
  {
    slug: 'how-to-export-telegram-chat-history',
    title: 'How to Export Telegram Chat History',
    excerpt: 'Telegram\'s export tool is fast and clean — but it only exists in the desktop app, not on your phone.',
    category: 'Export Guides',
    readTime: '3 min read',
    seoTitle: 'How to Export Telegram Chat History — ThirdPerson AI',
    seoDescription: 'How to export a Telegram conversation using Telegram Desktop, including which format to choose for the smoothest upload.',
  },
  {
    slug: 'how-to-export-imessage-chats',
    title: 'How to Export iMessage Chats',
    excerpt: 'Apple doesn\'t offer a built-in export button for iMessage — here\'s the most reliable workaround.',
    category: 'Export Guides',
    readTime: '3 min read',
    seoTitle: 'How to Export iMessage Chats — ThirdPerson AI',
    seoDescription: 'iMessage has no official bulk export tool. Here\'s the copy-paste method that works reliably for analysing an iMessage conversation.',
  },
  {
    slug: 'how-to-export-messenger-chats',
    title: 'How to Export Messenger Chats',
    excerpt: 'Messenger uses the same data-download tool as Instagram, so the steps will look familiar if you\'ve exported from either before.',
    category: 'Export Guides',
    readTime: '4 min read',
    seoTitle: 'How to Export Messenger Chats — ThirdPerson AI',
    seoDescription: 'How to request and download your Facebook Messenger conversation using the official Accounts Centre data export tool.',
  },
  {
    slug: 'how-to-export-snapchat-chats',
    title: 'How to Export Snapchat Chats',
    excerpt: 'Snapchat can hand over your saved chat data, though anything that already disappeared is gone for good.',
    category: 'Export Guides',
    readTime: '3 min read',
    seoTitle: 'How to Export Snapchat Chats — ThirdPerson AI',
    seoDescription: 'How to request your Snapchat data download and find your saved chat history for analysis.',
  },
  {
    slug: 'the-science-of-marriage-success',
    title: 'The Science of Marriage Success: What Research Says About Lasting Relationships',
    excerpt: 'Decades of research from psychologist John Gottman can predict divorce with startling accuracy — and it all comes down to how couples talk to each other.',
    category: 'Relationship Science',
    readTime: '8 min read',
    seoTitle: 'The Science of Marriage Success — What Research Says | ThirdPerson AI',
    seoDescription: 'What John Gottman\'s decades of relationship research reveal about lasting marriages — the 5:1 ratio, the Four Horsemen, and how chat analysis can reveal these same patterns.',
  },
  {
    slug: 'texting-habits-relationship-health',
    title: '10 Texting Habits That Reveal How Healthy Your Relationship Is',
    excerpt: 'The content of a text matters less than you\'d think. The pattern behind it matters more.',
    category: 'Relationship Science',
    readTime: '6 min read',
    seoTitle: '10 Texting Habits That Reveal Relationship Health — ThirdPerson AI',
    seoDescription: 'Ten texting patterns — from response time to how repair happens after a fight — that quietly reveal the health of a relationship.',
  },
  {
    slug: 'why-we-fight-over-text',
    title: 'Why We Fight Over Text: The Psychology of Misunderstood Messages',
    excerpt: 'Text strips out tone, timing, and facial expression — and your brain fills the gap with whatever it\'s already anxious about.',
    category: 'Relationship Science',
    readTime: '6 min read',
    seoTitle: 'Why We Fight Over Text — The Psychology of Misunderstood Messages | ThirdPerson AI',
    seoDescription: 'Why text conversations turn into arguments so easily, and what the psychology of misread messages says about protecting your relationships.',
  },
];

export function getBlogPostMetaBySlug(slug) {
  return BLOG_POSTS_META.find((post) => post.slug === slug);
}
