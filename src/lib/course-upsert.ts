import "server-only";

import {
  createCourse,
  getCategories,
  getCourses,
  getPlatforms,
  updateCourse,
} from "@/lib/data";
import { checkDistinctness } from "@/lib/distinctness";
import { csvRowSchema, slugify } from "@/lib/validation";

// Shared upsert-by-slug core, used by both the admin CSV bulk import (a
// human reviews a preview before confirming) and the Google Sheets sync
// (fully automatic, no human review). Keeping one implementation means both
// paths get the exact same validation, affiliate-only gating, and
// distinctness check — the DB trigger is still the final backstop either
// way. A row whose slug matches an existing course updates it (only fields
// this schema carries — thumbnail_url/is_active are left untouched); a
// blank or non-matching slug creates a new course.

export interface CourseRowResult {
  row: number;
  title: string;
  status: "created" | "updated" | "failed";
  slug?: string;
  error?: string;
}

export async function upsertCourseRows(
  rows: Record<string, unknown>[],
): Promise<CourseRowResult[]> {
  const [platforms, categories, existing] = await Promise.all([
    getPlatforms(),
    getCategories(),
    getCourses({ includeInactive: true }),
  ]);
  const bySlug = new Map(existing.map((c) => [c.slug, c]));
  const usedSlugs = new Set(existing.map((c) => c.slug));
  const results: CourseRowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 1;
    const parsed = csvRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      results.push({
        row: rowNum,
        title: String(rows[i]?.title ?? "(untitled)"),
        status: "failed",
        error: parsed.error.issues.map((iss) => `${iss.path.join(".")}: ${iss.message}`).join("; "),
      });
      continue;
    }
    const row = parsed.data;
    const platform = platforms.find(
      (p) => p.name.toLowerCase() === row.platform.trim().toLowerCase(),
    );
    const category = categories.find(
      (c) => c.name.toLowerCase() === row.category.trim().toLowerCase(),
    );
    if (!platform) {
      results.push({ row: rowNum, title: row.title, status: "failed", error: `Unknown platform "${row.platform}"` });
      continue;
    }
    if (!platform.has_affiliate_program) {
      results.push({
        row: rowNum,
        title: row.title,
        status: "failed",
        error: `Platform "${platform.name}" has no affiliate partnership; its courses cannot be listed`,
      });
      continue;
    }
    if (!category) {
      results.push({ row: rowNum, title: row.title, status: "failed", error: `Unknown category "${row.category}"` });
      continue;
    }

    if (row.ai_summary) {
      const problem = checkDistinctness(row.ai_summary, row.description);
      if (problem) {
        results.push({ row: rowNum, title: row.title, status: "failed", error: problem });
        continue;
      }
    }

    const matched = row.slug ? bySlug.get(row.slug) : undefined;

    const sharedFields = {
      title: row.title,
      platform_id: platform.id,
      category_id: category.id,
      subcategory: row.subcategory || null,
      offered_by: row.offered_by || null,
      description: row.description,
      ai_summary: row.ai_summary || null,
      price_range: row.price_range,
      price_amount: row.price_range === "free" ? null : (row.price_amount ?? null),
      currency: row.currency || "USD",
      external_rating: row.external_rating ?? null,
      review_count: row.review_count ?? null,
      duration: row.duration || null,
      language: row.language || "English",
      enrollment_link: row.enrollment_link,
    };

    try {
      if (matched) {
        // Update: leave thumbnail_url/is_active untouched (no column for
        // either here), and keep the existing slug rather than recomputing
        // one from a possibly-changed title.
        await updateCourse(matched.id, sharedFields);
        results.push({ row: rowNum, title: row.title, status: "updated", slug: matched.slug });
      } else {
        let slug = row.slug || slugify(row.title);
        let n = 2;
        while (usedSlugs.has(slug)) slug = `${row.slug || slugify(row.title)}-${n++}`;
        await createCourse({ ...sharedFields, slug, thumbnail_url: null, is_active: true });
        usedSlugs.add(slug);
        results.push({ row: rowNum, title: row.title, status: "created", slug });
      }
    } catch (e) {
      results.push({
        row: rowNum,
        title: row.title,
        status: "failed",
        error: e instanceof Error ? e.message : "Something went wrong.",
      });
    }
  }

  return results;
}
