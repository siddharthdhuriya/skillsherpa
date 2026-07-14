import "server-only";

import { getCourses } from "@/lib/data";
import type { CourseWithRelations } from "@/lib/database.types";

// Comparison pages target high-intent "X vs Y" queries. Pairs are generated
// from the top-rated courses within each category, deterministically ordered
// by slug so each pair has exactly one canonical URL.

export function comparePairSlug(a: { slug: string }, b: { slug: string }): string {
  const [first, second] = [a.slug, b.slug].sort();
  return `${first}-vs-${second}`;
}

export async function getComparePairs(): Promise<
  { slug: string; courses: [CourseWithRelations, CourseWithRelations] }[]
> {
  const courses = await getCourses();
  const byCategory = new Map<string, CourseWithRelations[]>();
  for (const course of courses) {
    const list = byCategory.get(course.category_id) ?? [];
    list.push(course);
    byCategory.set(course.category_id, list);
  }

  const pairs: { slug: string; courses: [CourseWithRelations, CourseWithRelations] }[] = [];
  const seen = new Set<string>();
  for (const list of byCategory.values()) {
    // Top 3 per category by rating -> up to 3 pairwise comparisons each.
    const top = list
      .slice()
      .sort((a, b) => (b.external_rating ?? 0) - (a.external_rating ?? 0))
      .slice(0, 3);
    for (let i = 0; i < top.length; i++) {
      for (let j = i + 1; j < top.length; j++) {
        const slug = comparePairSlug(top[i], top[j]);
        if (!seen.has(slug)) {
          seen.add(slug);
          const ordered = [top[i], top[j]].sort((a, b) => a.slug.localeCompare(b.slug)) as [
            CourseWithRelations,
            CourseWithRelations,
          ];
          pairs.push({ slug, courses: ordered });
        }
      }
    }
  }
  return pairs;
}

/**
 * Resolve a "/compare/[pair]" param back to two courses. Slugs may themselves
 * contain hyphens, so every "-vs-" occurrence is tried against real slugs
 * rather than naively splitting on the first one.
 */
export async function resolveComparePair(
  pair: string,
): Promise<[CourseWithRelations, CourseWithRelations] | null> {
  const courses = await getCourses();
  const bySlug = new Map(courses.map((c) => [c.slug, c]));
  let index = pair.indexOf("-vs-");
  while (index !== -1) {
    const left = bySlug.get(pair.slice(0, index));
    const right = bySlug.get(pair.slice(index + 4));
    if (left && right && left.id !== right.id) return [left, right];
    index = pair.indexOf("-vs-", index + 1);
  }
  return null;
}
