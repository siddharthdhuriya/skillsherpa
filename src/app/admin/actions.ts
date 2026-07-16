"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createCategory,
  createCourse,
  createPlatform,
  deleteCategory,
  deleteCourse,
  deletePlatform,
  getCategories,
  getCourses,
  getPlatforms,
  updateCategory,
  updateCourse,
  updatePlatform,
  type CourseInput,
} from "@/lib/data";
import { DEMO_ADMIN_COOKIE, isAdminAuthenticated } from "@/lib/admin-auth";
import { checkDistinctness } from "@/lib/distinctness";
import { fetchCourseMetadata, type FetchedCourseMetadata } from "@/lib/course-metadata";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  categorySchema,
  courseSchema,
  csvRowSchema,
  platformSchema,
  slugify,
  type CategoryFormValues,
  type CourseFormValues,
  type PlatformFormValues,
} from "@/lib/validation";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    throw new Error("Not authenticated.");
  }
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong. Please try again.";
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export async function loginWithPassword(
  email: string,
  password: string,
): Promise<ActionResult> {
  // Email/password to start. Seam for later: Supabase also supports magic
  // links (signInWithOtp) and SSO (signInWithSSO); swap here when needed.
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured. Use the demo admin button below." };
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  redirect("/admin");
}

export async function demoLogin(): Promise<void> {
  if (isSupabaseConfigured()) return; // demo bypass only exists without credentials
  const cookieStore = await cookies();
  cookieStore.set(DEMO_ADMIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  redirect("/admin");
}

export async function logout(): Promise<void> {
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    await supabase.auth.signOut();
  } else {
    const cookieStore = await cookies();
    cookieStore.delete(DEMO_ADMIN_COOKIE);
  }
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------
// On-demand ISR: changes go live immediately, no scheduled-rebuild wait.
// ---------------------------------------------------------------------------
async function revalidatePublicPages(categorySlug?: string, courseSlug?: string) {
  revalidatePath("/");
  revalidatePath("/courses");
  revalidatePath("/sitemap.xml");
  if (categorySlug) {
    revalidatePath(`/category/${categorySlug}`);
    if (courseSlug) revalidatePath(`/courses/${categorySlug}/${courseSlug}`);
  }
  // Comparison pages embed course data; they are few, so refresh the set.
  revalidatePath("/compare", "layout");
}

async function categorySlugOf(categoryId: string): Promise<string | undefined> {
  const categories = await getCategories();
  return categories.find((c) => c.id === categoryId)?.slug;
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------
function toCourseInput(values: CourseFormValues): CourseInput {
  return {
    title: values.title,
    slug: values.slug,
    platform_id: values.platform_id,
    category_id: values.category_id,
    subcategory: values.subcategory || null,
    offered_by: values.offered_by || null,
    description: values.description,
    ai_summary: values.ai_summary || null,
    price_range: values.price_range,
    price_amount: values.price_range === "free" ? null : (values.price_amount ?? null),
    currency: values.currency,
    external_rating: values.external_rating ?? null,
    review_count: values.review_count ?? null,
    duration: values.duration || null,
    language: values.language,
    enrollment_link: values.enrollment_link,
    thumbnail_url: values.thumbnail_url || null,
    is_active: values.is_active,
  };
}

// Fetches a course's own public page and extracts whatever structured SEO
// metadata it exposes (JSON-LD Course schema, Open Graph tags) to prefill
// the "Add course" form. Never touches ai_summary — that stays admin-authored.
export async function fetchCourseMetadataAction(
  url: string,
): Promise<ActionResult<FetchedCourseMetadata>> {
  try {
    await requireAdmin();
    const data = await fetchCourseMetadata(url);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function saveCourse(
  values: CourseFormValues,
  courseId?: string,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = courseSchema.parse(values);
    // Content-uniqueness check: summaries must not near-duplicate the
    // platform's marketing copy (duplicate-content SEO risk).
    if (parsed.ai_summary) {
      const problem = checkDistinctness(parsed.ai_summary, parsed.description);
      if (problem) return { ok: false, error: problem };
    }
    const input = toCourseInput(parsed);
    const saved = courseId
      ? await updateCourse(courseId, input)
      : await createCourse(input);
    await revalidatePublicPages(await categorySlugOf(saved.category_id), saved.slug);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function setCourseActive(
  courseId: string,
  isActive: boolean,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const saved = await updateCourse(courseId, { is_active: isActive });
    await revalidatePublicPages(await categorySlugOf(saved.category_id), saved.slug);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function removeCourse(courseId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const course = (await getCourses({ includeInactive: true })).find((c) => c.id === courseId);
    await deleteCourse(courseId);
    await revalidatePublicPages(course?.category.slug, course?.slug);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

// ---------------------------------------------------------------------------
// Bulk import. Validation happens in the preview step client-side AND here:
// rows referencing non-affiliate platforms are rejected, never silently
// imported (the DB trigger is the final backstop).
// ---------------------------------------------------------------------------
export interface ImportRowResult {
  row: number;
  title: string;
  status: "imported" | "failed";
  error?: string;
}

export async function bulkImportCourses(
  rows: Record<string, unknown>[],
): Promise<ActionResult<ImportRowResult[]>> {
  try {
    await requireAdmin();
    const [platforms, categories, existing] = await Promise.all([
      getPlatforms(),
      getCategories(),
      getCourses({ includeInactive: true }),
    ]);
    const usedSlugs = new Set(existing.map((c) => c.slug));
    const results: ImportRowResult[] = [];

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

      let slug = slugify(row.title);
      let n = 2;
      while (usedSlugs.has(slug)) slug = `${slugify(row.title)}-${n++}`;

      try {
        await createCourse({
          title: row.title,
          slug,
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
          thumbnail_url: null,
          is_active: true,
        });
        usedSlugs.add(slug);
        results.push({ row: rowNum, title: row.title, status: "imported" });
      } catch (e) {
        results.push({ row: rowNum, title: row.title, status: "failed", error: errorMessage(e) });
      }
    }

    revalidatePath("/", "layout");
    return { ok: true, data: results };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

// ---------------------------------------------------------------------------
// Platforms
// ---------------------------------------------------------------------------
export async function savePlatform(
  values: PlatformFormValues,
  platformId?: string,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = platformSchema.parse(values);
    const input = {
      name: parsed.name,
      website_url: parsed.website_url,
      logo_url: parsed.logo_url || null,
      has_affiliate_program: parsed.has_affiliate_program,
      commission_rate: parsed.commission_rate ?? null,
      affiliate_network: parsed.affiliate_network || null,
    };
    if (platformId) await updatePlatform(platformId, input);
    else await createPlatform(input);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function removePlatform(platformId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await deletePlatform(platformId);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export async function saveCategory(
  values: CategoryFormValues,
  categoryId?: string,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = categorySchema.parse(values);
    const input = {
      name: parsed.name,
      slug: parsed.slug,
      description: parsed.description || null,
      parent_category_id: parsed.parent_category_id ?? null,
      seo_title: parsed.seo_title || null,
      seo_description: parsed.seo_description || null,
    };
    if (categoryId) await updateCategory(categoryId, input);
    else await createCategory(input);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function removeCategory(categoryId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await deleteCategory(categoryId);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
