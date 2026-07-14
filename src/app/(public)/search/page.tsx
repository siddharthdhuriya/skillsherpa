import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CourseCard } from "@/components/course-card";
import { CourseGridSkeleton } from "@/components/course-card-skeleton";
import { HeroSearchBar } from "@/components/hero/search-bar";
import { searchCourses } from "@/lib/data";
import { toPublicCourse } from "@/lib/database.types";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// Search results are dynamic (not indexed); the course pages they link to are
// the pre-rendered, indexable surfaces.
export const metadata: Metadata = {
  title: "Search Courses",
  description: `Search every course on ${SITE_NAME} by topic, skill, platform, or title.`,
  alternates: { canonical: `${SITE_URL}/search` },
  robots: { index: false, follow: true },
};

async function SearchResults({ query }: { query: string }) {
  if (!query.trim()) {
    return (
      <p className="text-muted-foreground">
        Type what you want to learn, like &quot;machine learning&quot; or &quot;IELTS&quot;.
      </p>
    );
  }
  const results = await searchCourses(query);
  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
        <p className="font-medium">No courses found for &quot;{query}&quot;.</p>
        <p className="mt-1 text-sm">Try a broader term, or browse by category instead.</p>
      </div>
    );
  }
  return (
    <>
      <p className="text-sm text-muted-foreground" role="status">
        {results.length} {results.length === 1 ? "course" : "courses"} for &quot;{query}&quot;
      </p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((course) => (
          <CourseCard key={course.id} course={toPublicCourse(course)} />
        ))}
      </div>
    </>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div className="space-y-4">
        <Breadcrumbs crumbs={[{ name: "Search" }]} />
        <h1 className="font-heading text-3xl font-bold">Search courses</h1>
        <HeroSearchBar />
      </div>
      <Suspense key={q} fallback={<CourseGridSkeleton count={6} />}>
        <SearchResults query={q} />
      </Suspense>
    </div>
  );
}
