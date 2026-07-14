// Content-uniqueness guard: AI summaries must not be thin rewrites of the
// platform's own marketing copy (a real duplicate-content SEO risk even when
// the source data is licensed). Checked in the admin course form on save.

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function trigrams(words: string[]): Set<string> {
  const grams = new Set<string>();
  for (let i = 0; i + 2 < words.length; i++) {
    grams.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  return grams;
}

/**
 * Jaccard similarity over word trigrams: 0 = fully distinct, 1 = identical.
 * Near-verbatim copies score high even with small word swaps.
 */
export function trigramSimilarity(a: string, b: string): number {
  const gramsA = trigrams(normalize(a));
  const gramsB = trigrams(normalize(b));
  if (gramsA.size === 0 || gramsB.size === 0) return 0;
  let intersection = 0;
  for (const gram of gramsA) if (gramsB.has(gram)) intersection++;
  return intersection / (gramsA.size + gramsB.size - intersection);
}

export const DISTINCTNESS_THRESHOLD = 0.35;

/** Returns an error message when the summary is too close to the source copy. */
export function checkDistinctness(summary: string, sourceCopy: string): string | null {
  if (!summary.trim() || !sourceCopy.trim()) return null;
  const similarity = trigramSimilarity(summary, sourceCopy);
  if (similarity >= DISTINCTNESS_THRESHOLD) {
    return `The summary is too close to the course description (${Math.round(similarity * 100)}% trigram overlap). Rewrite it in original wording to avoid duplicate-content SEO penalties.`;
  }
  return null;
}
