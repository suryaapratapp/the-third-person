// What we keep from an uploaded conversation once the report exists.
//
// The transcript is used to generate the report and then discarded. Only these
// derived, aggregate fields survive — nothing that reconstructs what was said.
//
// It is an allowlist rather than a denylist on purpose. A denylist quietly
// starts persisting raw text again the first time the preprocessor gains a new
// field, and nothing about that failure is visible. Anything not named here is
// dropped by default.
//
// MIRRORED in supabase/functions/generate-relationship-report/index.ts
// (RETAINED_CONVERSATION_KEYS). The two runtimes cannot share a module — Vite
// and Deno resolve differently and the edge function deploys separately — so if
// you change one list, change the other.
export const RETAINED_CONVERSATION_KEYS = [
  'metadata',            // person name, relationship type, platform, zodiac
  'messageCount',
  'estimatedDateRange',
  'participants',
  'participantNames',
  'senderStats',         // per-person counts only
  'monthlyBreakdown',    // per-month counts only
  'parseConfidence',
  'warningFlags',
  'languageStyle',
  'languageProfile',
  'topWords',
  'topWordsBySender',   // per-person vocabularies for the word cloud            // word + frequency
  'localMetrics',        // effort, activity buckets, emoji counts
  'sensitiveDataProtectionSummary',
];

// Drops the transcript-bearing keys — cleanedText, parsedMessages,
// compressedConversation, firstMessages, lastMessages, importantMoments and
// analysisPipeline.chunks — none of which had a single reader once the report
// was generated.
export function retainableConversation(prepared = {}) {
  const kept = {};
  for (const key of RETAINED_CONVERSATION_KEYS) {
    if (prepared?.[key] !== undefined) kept[key] = prepared[key];
  }
  kept.rawConversationDiscarded = true;
  return kept;
}
