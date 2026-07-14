import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CourseCard } from "@/components/course-card";
import { CourseFilters } from "@/components/course-filters";
import { CourseGridSkeleton } from "@/components/course-card-skeleton";
import { getCategories, getCourses, getPlatforms } from "@/lib/data";
import { toPublicCourse, type PriceRange } from "@/lib/database.types";
import { JsonLdScript, breadcrumbSchema } from "@/lib/schema";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Browse All Online Courses",
  description: `Browse every course on ${SITE_NAME}. Filter by category, platform, price, and language to find your next online course.`,
  alternates: { canonical: `${SITE_URL}/courses` },
  openGraph: {
    title: `Browse All Online Courses | ${SITE_NAME}`,
    description: "Filter courses by category, platform, price, and language.",
    url: `${SITE_URL}/courses`,
    siteName: SITE_NAME,
    type: "website",
  },
};

async function FilteredCourses({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; platform?: string; price?: string; language?: string }>;
}) {
  const { category, platform, price, language } = await searchParams;
  const courses = await getCourses({
    categorySlug: category,
    platformId: platform,
    priceRange: price as PriceRange | undefined,
    language,
  });
  if (courses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
        <p className="font-medium">No courses match these filters.</p>
        <p className="mt-1 text-sm">Try removing a filter or two.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <CourseCard key={course.id} course={toPublicCourse(course)} />
      ))}
    </div>
  );
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; platform?: string; price?: string; language?: string }>;
}) {
  const [categories, platforms, allCourses] = await Promise.all([
    getCategories(),
    getPlatforms(),
    getCourses(),
  ]);
  const languages = [...new Set(allCourses.map((c) => c.language))].sort();

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <JsonLdScript
        data={breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "All courses", url: `${SITE_URL}/courses` },
        ])}
      />
      <div className="space-y-4">
        <Breadcrumbs crumbs={[{ name: "All courses" }]} />
        <h1 className="font-heading text-3xl font-bold sm:text-4xl">All courses</h1>
        <p className="max-w-2xl text-muted-foreground">
          Every course from our partner platforms in one place. Filter to narrow it down.
        </p>
      </div>
      <Suspense fallback={null}>
        <CourseFilters
          categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
          platforms={platforms
            .filter((p) => p.has_affiliate_program)
            .map((p) => ({ id: p.id, name: p.name }))}
          languages={languages}
        />
      </Suspense>
      <Suspense fallback={<CourseGridSkeleton count={9} />}>
        <FilteredCourses searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
