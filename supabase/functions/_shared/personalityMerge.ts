// Shared personality accumulation helpers.
//
// The user's stored profile must GROW across analyses, never be wiped by the
// latest generation: new non-empty values win, old values survive where the new
// run had nothing to say, and arrays union (newest first) instead of replacing.
// Used by both generate-relationship-report and generate-personality-card so
// the two write paths can never drift apart.

export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return !value.trim();
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
}

export function mergePersonality(oldValue: any, newValue: any, depth = 0): any {
  if (depth > 4) return isEmptyValue(newValue) ? oldValue : newValue;
  if (Array.isArray(newValue) || Array.isArray(oldValue)) {
    const newArr = Array.isArray(newValue) ? newValue : [];
    const oldArr = Array.isArray(oldValue) ? oldValue : [];
    const seen = new Set<string>();
    const merged: any[] = [];
    for (const item of [...newArr, ...oldArr]) {
      const key = typeof item === 'string' ? item.toLowerCase().trim() : JSON.stringify(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
    return merged.slice(0, 16);
  }
  if (newValue && typeof newValue === 'object' && oldValue && typeof oldValue === 'object') {
    const merged: Record<string, any> = { ...oldValue };
    for (const key of Object.keys(newValue)) {
      merged[key] = mergePersonality(oldValue[key], newValue[key], depth + 1);
    }
    return merged;
  }
  return isEmptyValue(newValue) ? (oldValue ?? newValue) : newValue;
}

export function asWordList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: any) => (typeof item === 'string' ? item : item?.word || item?.label || ''))
    .map((word) => String(word).trim())
    .filter(Boolean);
}

// Reads the existing profile and writes back a merged version. Returns the
// stored row's report-id list so callers can report/extend it.
export async function upsertMergedPersonality(
  admin: any,
  userId: string,
  {
    personality,
    emotionalLifeStory = {},
    words = [],
    reportIds = [],
  }: {
    personality: Record<string, unknown>;
    emotionalLifeStory?: Record<string, unknown>;
    words?: unknown;
    reportIds?: string[];
  },
) {
  const { data: existing } = await admin
    .from('user_personality')
    .select('personality_json, emotional_life_story, recurring_words, generated_from_report_ids')
    .eq('user_id', userId)
    .maybeSingle();

  const mergedWords = [...new Set([
    ...asWordList(words),
    ...asWordList(existing?.recurring_words),
  ])].slice(0, 24);

  const mergedReportIds = [...new Set([
    ...((existing?.generated_from_report_ids as string[]) || []),
    ...reportIds.filter(Boolean),
  ])].slice(-50);

  await admin.from('user_personality').upsert({
    user_id: userId,
    personality_json: mergePersonality(existing?.personality_json || {}, personality || {}),
    emotional_life_story: mergePersonality(existing?.emotional_life_story || {}, emotionalLifeStory || {}),
    recurring_words: mergedWords,
    generated_from_report_ids: mergedReportIds,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  return { mergedWords, mergedReportIds };
}
