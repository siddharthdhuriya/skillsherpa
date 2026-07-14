import type { MetadataRoute } from "next";
import { getCategories, getCourses } from "@/lib/data";
import { getComparePairs } from "@/lib/compare";
import { SITE_URL } from "@/lib/site";

// Regenerated hourly and on demand (admin saves call revalidatePath on
// /sitemap.xml), so new courses appear without a redeploy. /go/* and /admin
// are deliberately excluded.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [courses, categories, pairs] = await Promise.all([
    getCourses(),
    getCategories(),
    getComparePairs(),
  ]);

  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/courses`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/compare`, changeFrequency: "weekly", priority: 0.6 },
    ...categories.map((c) => ({
      url: `${SITE_URL}/category/${c.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...courses.map((c) => ({
      url: `${SITE_URL}/courses/${c.category.slug}/${c.slug}`,
      lastModified: new Date(c.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...pairs.map((p) => ({
      url: `${SITE_URL}/compare/${p.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
