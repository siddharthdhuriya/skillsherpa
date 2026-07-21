import { z } from "zod";
import { CURRENCIES } from "@/lib/currencies";

// Shared zod schemas for admin forms (react-hook-form) and CSV bulk import.

export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// SEO-friendly slug: max ~60 chars (Google typically truncates SERP display
// around there), diacritics stripped (not percent-encoded garbage), single
// hyphens only, and truncation lands on a word boundary rather than
// mid-word.
const SLUG_MAX_LENGTH = 60;

export function slugify(value: string): string {
  const base = value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics (é -> e)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (base.length <= SLUG_MAX_LENGTH) return base;
  const truncated = base.slice(0, SLUG_MAX_LENGTH);
  const lastHyphen = truncated.lastIndexOf("-");
  return (lastHyphen > 0 ? truncated.slice(0, lastHyphen) : truncated).replace(/-+$/, "");
}

export const priceRangeValues = ["free", "paid"] as const;
export const currencyCodes = CURRENCIES.map((c) => c.code) as [string, ...string[]];

export const courseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  slug: z
    .string()
    .min(3)
    .max(200)
    .regex(slugPattern, "Use lowercase letters, numbers, and hyphens only"),
  // min(1), not .uuid(): these are only ever set by picking a dropdown
  // option (never freehand-typed), so the real check is "was something
  // selected". zod's .uuid() strictly validates the RFC 4122 variant
  // nibble, which rejects the app's own demo-mode seed IDs (e.g.
  // "11111111-1111-1111-1111-111111111101") even though they're perfectly
  // valid identifiers here.
  platform_id: z.string().min(1, "Choose a platform"),
  category_id: z.string().min(1, "Choose a category"),
  subcategory: z.string().max(100).optional().or(z.literal("")),
  offered_by: z.string().max(200).optional().or(z.literal("")),
  description: z.string().min(20, "Description must be at least 20 characters").max(2000),
  ai_summary: z.string().max(2000).optional().or(z.literal("")),
  price_range: z.enum(priceRangeValues),
  price_amount: z.coerce.number().min(0).optional().nullable(),
  currency: z.enum(currencyCodes).default("USD"),
  external_rating: z.coerce.number().min(0).max(5).optional().nullable(),
  review_count: z.coerce.number().int().min(0).optional().nullable(),
  duration: z.string().max(60).optional().or(z.literal("")),
  language: z.string().min(2).max(40).default("English"),
  enrollment_link: z
    .string()
    .url("Must be a full URL including https://")
    .max(1000),
  thumbnail_url: z.string().url().max(1000).optional().or(z.literal("")),
  is_active: z.boolean().default(true),
});

export type CourseFormValues = z.infer<typeof courseSchema>;

export const platformSchema = z.object({
  name: z.string().min(2).max(100),
  website_url: z.string().url("Must be a full URL including https://"),
  logo_url: z.string().url().optional().or(z.literal("")),
  has_affiliate_program: z.boolean(),
  commission_rate: z.coerce.number().min(0).max(100).optional().nullable(),
  affiliate_network: z.string().max(100).optional().or(z.literal("")),
});

export type PlatformFormValues = z.infer<typeof platformSchema>;

export const categorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(slugPattern, "Use lowercase letters, numbers, and hyphens only"),
  description: z.string().max(1000).optional().or(z.literal("")),
  parent_category_id: z.string().min(1).optional().nullable(),
  seo_title: z.string().max(70, "Keep under 70 characters for search snippets").optional().or(z.literal("")),
  seo_description: z.string().max(170, "Keep under 170 characters for search snippets").optional().or(z.literal("")),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

// CSV bulk import row. Platform and category are matched by name (friendlier
// for a non-technical admin than UUIDs); resolution + affiliate gating happen
// in the preview step before anything is committed.
//
// slug is the update key: a row whose slug matches an existing course
// updates that course; a blank slug (or one that matches nothing) creates a
// new course instead. Renaming a course's slug via CSV isn't supported —
// that would look identical to "create a new course", so slug is treated as
// a stable identity, not an editable field, in this flow.
export const csvRowSchema = z.object({
  slug: z
    .string()
    .optional()
    .default("")
    .refine((v) => v === "" || slugPattern.test(v), {
      message: "Slug must be lowercase letters, numbers, and hyphens only",
    }),
  title: z.string().min(3),
  platform: z.string().min(1, "Platform name is required"),
  category: z.string().min(1, "Category name is required"),
  subcategory: z.string().optional().default(""),
  offered_by: z.string().optional().default(""),
  description: z.string().min(20),
  ai_summary: z.string().optional().default(""),
  // preprocess must resolve blank cells straight to "paid" itself, not to
  // undefined: Apps Script sends blank cells as "" (not a missing key), and
  // zod's outer .default() only substitutes when the raw field is undefined
  // — an "" that preprocess turns into undefined internally still fails the
  // enum check instead of falling through to a default.
  price_range: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim().toLowerCase() : "paid"),
    z.enum(priceRangeValues),
  ),
  price_amount: z.coerce.number().min(0).optional().nullable(),
  currency: z
    .string()
    .optional()
    .default("USD")
    .transform((v) => (v ? v.toUpperCase() : "USD")),
  external_rating: z.coerce.number().min(0).max(5).optional().nullable(),
  review_count: z.coerce.number().int().min(0).optional().nullable(),
  duration: z.string().optional().default(""),
  language: z.string().optional().default("English"),
  enrollment_link: z.string().url(),
});

export type CsvRow = z.infer<typeof csvRowSchema>;
