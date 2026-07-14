export const SITE_NAME = "SkillSherpa";

// Production domain. Overridable per-environment (preview deploys, local dev).
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://skillsherpa.in";

export const SITE_TAGLINE = "Your guide to the right online course";

export const SITE_DESCRIPTION =
  "SkillSherpa helps you find, compare, and choose the best online courses from trusted partner platforms. Honest summaries, real ratings, side-by-side comparisons.";

// Shown sitewide in the footer and inline near enroll CTAs (FTC-style disclosure).
export const AFFILIATE_DISCLOSURE =
  "SkillSherpa is reader-supported. When you enroll in a course through links on our site, we may earn an affiliate commission from the course platform at no extra cost to you. We only list courses from platforms we have an active partnership with.";
