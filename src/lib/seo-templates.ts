// Deterministic SEO copy generation for categories, so a non-technical admin
// only has to type a Name and get compliant Description/SEO Title/SEO
// Description for free. No AI call: these are formulaic, well-understood
// SEO patterns (primary keyword near the front, brand suffix, strict length
// budgets), and a template that self-truncates to fit is more reliable than
// an LLM call that might drift over the limit on an unusual category name.

const SITE_SUFFIX = " | SkillSherpa";

// Google typically renders ~50-60 characters of a title tag in the SERP;
// the DB column allows up to 70 (categorySchema), so this stays safely
// inside both.
const SEO_TITLE_MAX = 70;

// Google typically renders ~150-160 characters of a meta description; the
// DB column allows up to 170 (categorySchema).
const SEO_DESC_MAX = 170;

/** Plain on-page description shown as the category's intro copy. */
export function generateCategoryDescription(name: string): string {
  return `${name} courses from trusted, vetted affiliate partner platforms, compared side by side so you can find the right fit.`;
}

/**
 * SEO title: primary keyword ("Best <Name> Courses") near the front, brand
 * suffix at the end. Falls back through progressively shorter templates so
 * it always fits SEO_TITLE_MAX regardless of how long the category name is.
 */
export function generateCategorySeoTitle(name: string): string {
  const candidates = [
    `Best ${name} Courses Online${SITE_SUFFIX}`,
    `Best ${name} Courses${SITE_SUFFIX}`,
    `${name} Courses${SITE_SUFFIX}`,
  ];
  const fit = candidates.find((c) => c.length <= SEO_TITLE_MAX);
  if (fit) return fit;
  // Category name itself is unusually long: truncate the name, keep the
  // brand suffix intact rather than cutting it off.
  const budget = Math.max(SEO_TITLE_MAX - SITE_SUFFIX.length - 1, 10);
  return `${name.slice(0, budget).trimEnd()}${SITE_SUFFIX}`;
}

/**
 * SEO meta description: keyword + concrete value proposition (ratings,
 * pricing, comparison), ending just short of Google's typical truncation
 * point. Same progressive-fallback approach as the title.
 */
export function generateCategorySeoDescription(name: string): string {
  const candidates = [
    `Compare the best ${name} courses from trusted partner platforms. Real ratings, pricing, and duration side by side to help you choose with confidence.`,
    `Compare the best ${name} courses from trusted partner platforms, with real ratings and pricing side by side.`,
    `Compare top ${name} courses from trusted partner platforms.`,
  ];
  const fit = candidates.find((c) => c.length <= SEO_DESC_MAX);
  return fit ?? candidates[candidates.length - 1].slice(0, SEO_DESC_MAX);
}
