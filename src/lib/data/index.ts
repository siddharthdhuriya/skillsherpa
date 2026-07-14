import "server-only";

// Data access layer. Every read/write goes through here so the rest of the
// app never cares whether it is talking to Supabase or to the local demo
// store (used until real Supabase credentials are provided in .env.local).

import type {
  Category,
  ClickEvent,
  Course,
  CourseWithRelations,
  Platform,
  PriceRange,
} from "@/lib/database.types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getDemoStore } from "./store";

const COURSE_WITH_RELATIONS = "*, platform:platforms(*), category:categories(*)";

// Cookie-bound client: session-aware, used for admin writes and admin-only
// reads (auth.role() = 'authenticated' policies). Only valid inside a real
// request (server action / route handler) — never at build time.
async function supa() {
  const { createClient } = await import("@/lib/supabase/server");
  return createClient();
}

// Cookie-free client: used for public reads so they also work during
// generateStaticParams / ISR revalidation, which have no request context.
async function supaPublic() {
  const { createPublicClient } = await import("@/lib/supabase/public");
  return createPublicClient();
}

function demoJoin(course: Course): CourseWithRelations {
  const store = getDemoStore();
  const platform = store.platforms.find((p) => p.id === course.platform_id)!;
  const category = store.categories.find((c) => c.id === course.category_id)!;
  return { ...course, platform, category };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export async function getCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) {
    return getDemoStore().categories.slice().sort((a, b) => a.name.localeCompare(b.name));
  }
  const client = await supaPublic();
  const { data, error } = await client.from("categories").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  if (!isSupabaseConfigured()) {
    return getDemoStore().categories.find((c) => c.slug === slug) ?? null;
  }
  const client = await supaPublic();
  const { data } = await client.from("categories").select("*").eq("slug", slug).maybeSingle();
  return data;
}

// ---------------------------------------------------------------------------
// Platforms
// ---------------------------------------------------------------------------
export async function getPlatforms(): Promise<Platform[]> {
  if (!isSupabaseConfigured()) {
    return getDemoStore().platforms.slice().sort((a, b) => a.name.localeCompare(b.name));
  }
  const client = await supaPublic();
  const { data, error } = await client.from("platforms").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function getAffiliatePlatforms(): Promise<Platform[]> {
  return (await getPlatforms()).filter((p) => p.has_affiliate_program);
}

// ---------------------------------------------------------------------------
// Courses (public reads)
// ---------------------------------------------------------------------------
export interface CourseFilter {
  categorySlug?: string;
  platformId?: string;
  priceRange?: PriceRange;
  language?: string;
  includeInactive?: boolean;
}

export async function getCourses(filter: CourseFilter = {}): Promise<CourseWithRelations[]> {
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    return store.courses
      .filter((c) => filter.includeInactive || c.is_active)
      .map(demoJoin)
      .filter((c) => !filter.categorySlug || c.category.slug === filter.categorySlug)
      .filter((c) => !filter.platformId || c.platform_id === filter.platformId)
      .filter((c) => !filter.priceRange || c.price_range === filter.priceRange)
      .filter((c) => !filter.language || c.language === filter.language)
      .sort((a, b) => (b.external_rating ?? 0) - (a.external_rating ?? 0));
  }
  const client = await supaPublic();
  let query = client.from("courses").select(COURSE_WITH_RELATIONS);
  if (!filter.includeInactive) query = query.eq("is_active", true);
  if (filter.platformId) query = query.eq("platform_id", filter.platformId);
  if (filter.priceRange) query = query.eq("price_range", filter.priceRange);
  if (filter.language) query = query.eq("language", filter.language);
  if (filter.categorySlug) {
    const category = await getCategoryBySlug(filter.categorySlug);
    if (!category) return [];
    query = query.eq("category_id", category.id);
  }
  const { data, error } = await query.order("external_rating", { ascending: false });
  if (error) throw error;
  return data as unknown as CourseWithRelations[];
}

export async function getCourseBySlug(slug: string): Promise<CourseWithRelations | null> {
  if (!isSupabaseConfigured()) {
    const found = getDemoStore().courses.find((c) => c.slug === slug && c.is_active);
    return found ? demoJoin(found) : null;
  }
  const client = await supaPublic();
  const { data } = await client
    .from("courses")
    .select(COURSE_WITH_RELATIONS)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data as unknown as CourseWithRelations | null;
}

/** Internal-linking graph: same category first, then same platform. */
export async function getRelatedCourses(
  course: CourseWithRelations,
  limit = 6,
): Promise<CourseWithRelations[]> {
  const all = await getCourses();
  const others = all.filter((c) => c.id !== course.id);
  const sameCategory = others.filter((c) => c.category_id === course.category_id);
  const samePlatform = others.filter(
    (c) => c.platform_id === course.platform_id && c.category_id !== course.category_id,
  );
  return [...sameCategory, ...samePlatform].slice(0, limit);
}

export async function searchCourses(query: string, limit = 20): Promise<CourseWithRelations[]> {
  const q = query.trim();
  if (!q) return [];
  if (!isSupabaseConfigured()) {
    const terms = q.toLowerCase().split(/\s+/);
    return (await getCourses())
      .map((c) => {
        const haystack = `${c.title} ${c.subcategory ?? ""} ${c.description} ${c.category.name} ${c.platform.name}`.toLowerCase();
        const hits = terms.filter((t) => haystack.includes(t)).length;
        return { course: c, hits };
      })
      .filter((r) => r.hits > 0)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit)
      .map((r) => r.course);
  }
  const client = await supaPublic();
  const { data, error } = await client.rpc("search_courses", { query: q, max_results: limit });
  if (error) throw error;
  // rpc returns bare courses; hydrate relations in one pass.
  const [platforms, categories] = await Promise.all([getPlatforms(), getCategories()]);
  return (data as Course[]).map((c) => ({
    ...c,
    platform: platforms.find((p) => p.id === c.platform_id)!,
    category: categories.find((cat) => cat.id === c.category_id)!,
  }));
}

export interface Suggestion {
  type: "course" | "category";
  label: string;
  href: string;
}

export async function getSuggestions(query: string): Promise<Suggestion[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const [courses, categories] = await Promise.all([getCourses(), getCategories()]);
  const categoryHits: Suggestion[] = categories
    .filter((c) => c.name.toLowerCase().includes(q))
    .slice(0, 2)
    .map((c) => ({ type: "category", label: c.name, href: `/category/${c.slug}` }));
  const courseHits: Suggestion[] = courses
    .filter((c) => c.title.toLowerCase().includes(q))
    .slice(0, 6)
    .map((c) => ({
      type: "course",
      label: c.title,
      href: `/courses/${c.category.slug}/${c.slug}`,
    }));
  return [...categoryHits, ...courseHits];
}

// ---------------------------------------------------------------------------
// Click events (/go route + admin analytics)
// ---------------------------------------------------------------------------
export async function logClickEvent(input: {
  course_id: string;
  referrer: string | null;
  user_agent: string | null;
}): Promise<void> {
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    store.clickEvents.push({
      id: crypto.randomUUID(),
      course_id: input.course_id,
      clicked_at: new Date().toISOString(),
      referrer: input.referrer,
      user_agent: input.user_agent,
    });
    return;
  }
  // Service role: click logging is anonymous, RLS has no public insert policy.
  const { createAdminClient } = await import("@/lib/supabase/admin");
  await createAdminClient().from("click_events").insert(input);
}

export interface ClickStats {
  total: number;
  last7Days: number;
  last30Days: number;
  byDay: { date: string; clicks: number }[];
  topCourses: { course: CourseWithRelations; clicks: number }[];
}

export async function getClickStats(): Promise<ClickStats> {
  let events: ClickEvent[];
  if (!isSupabaseConfigured()) {
    events = getDemoStore().clickEvents;
  } else {
    const client = await supa();
    const { data, error } = await client.from("click_events").select("*");
    if (error) throw error;
    events = data;
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const within = (e: ClickEvent, days: number) =>
    now - new Date(e.clicked_at).getTime() <= days * dayMs;

  const byDayMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    byDayMap.set(new Date(now - i * dayMs).toISOString().slice(0, 10), 0);
  }
  for (const e of events) {
    const key = e.clicked_at.slice(0, 10);
    if (byDayMap.has(key)) byDayMap.set(key, (byDayMap.get(key) ?? 0) + 1);
  }

  const counts = new Map<string, number>();
  for (const e of events) counts.set(e.course_id, (counts.get(e.course_id) ?? 0) + 1);
  const allCourses = await getCourses({ includeInactive: true });
  const topCourses = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .flatMap(([courseId, clicks]) => {
      const course = allCourses.find((c) => c.id === courseId);
      return course ? [{ course, clicks }] : [];
    });

  return {
    total: events.length,
    last7Days: events.filter((e) => within(e, 7)).length,
    last30Days: events.filter((e) => within(e, 30)).length,
    byDay: [...byDayMap.entries()].map(([date, clicks]) => ({ date, clicks })),
    topCourses,
  };
}

// ---------------------------------------------------------------------------
// Admin writes. In Supabase mode these run through the RLS-guarded server
// client (caller must be authenticated); in demo mode they mutate the store.
// The affiliate-only rule is enforced here too, mirroring the DB trigger.
// ---------------------------------------------------------------------------
async function assertAffiliatePlatform(platformId: string) {
  const platforms = await getPlatforms();
  const platform = platforms.find((p) => p.id === platformId);
  if (!platform?.has_affiliate_program) {
    throw new Error(
      "Courses can only be listed for platforms with an active affiliate partnership.",
    );
  }
}

export type CourseInput = Omit<Course, "id" | "created_at" | "updated_at">;

export async function createCourse(input: CourseInput): Promise<Course> {
  await assertAffiliatePlatform(input.platform_id);
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    if (store.courses.some((c) => c.slug === input.slug)) {
      throw new Error(`A course with slug "${input.slug}" already exists.`);
    }
    const now = new Date().toISOString();
    const created: Course = { ...input, id: crypto.randomUUID(), created_at: now, updated_at: now };
    store.courses.push(created);
    return created;
  }
  const client = await supa();
  const { data, error } = await client.from("courses").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateCourse(id: string, input: Partial<CourseInput>): Promise<Course> {
  if (input.platform_id) await assertAffiliatePlatform(input.platform_id);
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const idx = store.courses.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Course not found.");
    store.courses[idx] = { ...store.courses[idx], ...input, updated_at: new Date().toISOString() };
    return store.courses[idx];
  }
  const client = await supa();
  const { data, error } = await client.from("courses").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCourse(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    store.courses = store.courses.filter((c) => c.id !== id);
    store.clickEvents = store.clickEvents.filter((e) => e.course_id !== id);
    return;
  }
  const client = await supa();
  const { error } = await client.from("courses").delete().eq("id", id);
  if (error) throw error;
}

export type PlatformInput = Omit<Platform, "id" | "created_at">;

export async function createPlatform(input: PlatformInput): Promise<Platform> {
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const created: Platform = { ...input, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    store.platforms.push(created);
    return created;
  }
  const client = await supa();
  const { data, error } = await client.from("platforms").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updatePlatform(id: string, input: Partial<PlatformInput>): Promise<Platform> {
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const idx = store.platforms.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Platform not found.");
    // Mirror of the DB trigger: cannot drop the affiliate flag while courses exist.
    if (
      input.has_affiliate_program === false &&
      store.platforms[idx].has_affiliate_program &&
      store.courses.some((c) => c.platform_id === id)
    ) {
      throw new Error(
        "Cannot disable the affiliate program while this platform still has listed courses.",
      );
    }
    store.platforms[idx] = { ...store.platforms[idx], ...input };
    return store.platforms[idx];
  }
  const client = await supa();
  const { data, error } = await client.from("platforms").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deletePlatform(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    if (store.courses.some((c) => c.platform_id === id)) {
      throw new Error("Cannot delete a platform that still has courses. Remove its courses first.");
    }
    store.platforms = store.platforms.filter((p) => p.id !== id);
    return;
  }
  const client = await supa();
  const { error } = await client.from("platforms").delete().eq("id", id);
  if (error) throw error;
}

export type CategoryInput = Omit<Category, "id" | "created_at">;

export async function createCategory(input: CategoryInput): Promise<Category> {
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    if (store.categories.some((c) => c.slug === input.slug)) {
      throw new Error(`A category with slug "${input.slug}" already exists.`);
    }
    const created: Category = { ...input, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    store.categories.push(created);
    return created;
  }
  const client = await supa();
  const { data, error } = await client.from("categories").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, input: Partial<CategoryInput>): Promise<Category> {
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const idx = store.categories.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Category not found.");
    store.categories[idx] = { ...store.categories[idx], ...input };
    return store.categories[idx];
  }
  const client = await supa();
  const { data, error } = await client.from("categories").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    if (store.courses.some((c) => c.category_id === id)) {
      throw new Error("Cannot delete a category that still has courses. Reassign them first.");
    }
    store.categories = store.categories.filter((c) => c.id !== id);
    return;
  }
  const client = await supa();
  const { error } = await client.from("categories").delete().eq("id", id);
  if (error) throw error;
}
