import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CompareTable } from "@/components/compare-table";
import { getCourseBySlug } from "@/lib/data";
import type { CourseWithRelations } from "@/lib/database.types";
import { SITE_NAME, SITE_URL, AFFILIATE_DISCLOSURE } from "@/lib/site";

const MAX_COURSES = 4;

// User-driven comparison (2-4 arbitrary courses picked via the compare tray).
// Deliberately noindex: arbitrary combinations are thin/duplicative content;
// the curated /compare/[a]-vs-[b] pages remain the indexable surface.
export const metadata: Metadata = {
  title: "Compare Courses Side by Side",
  description: `Compare up to ${MAX_COURSES} courses point by point: price, ratings, duration, language, and ${SITE_NAME}'s honest take on each.`,
  robots: { index: false, follow: true },
  alternates: { canonical: `${SITE_URL}/compare` },
};

export default async function CompareViewPage({
  searchParams,
}: {
  searchParams: Promise<{ courses?: string }>;
}) {
  const { courses: coursesParam = "" } = await searchParams;
  const slugs = [...new Set(coursesParam.split(",").map((s) => s.trim()).filter(Boolean))].slice(
    0,
    MAX_COURSES,
  );
  const resolved = (await Promise.all(slugs.map((slug) => getCourseBySlug(slug)))).filter(
    (c): c is CourseWithRelations => c !== null,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div className="space-y-4">
        <Breadcrumbs
          crumbs={[{ name: "Comparisons", href: "/compare" }, { name: "Your comparison" }]}
        />
        <h1 className="font-heading text-3xl font-bold sm:text-4xl">Your comparison</h1>
        {resolved.length >= 2 && (
          <p className="max-w-2xl text-muted-foreground">
            {resolved.map((c) => c.title).join(" vs ")}, point by point.
          </p>
        )}
      </div>

      {resolved.length < 2 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="font-medium">
            {resolved.length === 0
              ? "No courses selected yet."
              : "Pick at least one more course to compare."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the compare button on any course card to build a comparison of up to{" "}
            {MAX_COURSES} courses.
          </p>
          <Button asChild className="mt-6">
            <Link href="/courses">Browse courses</Link>
          </Button>
        </div>
      ) : (
        <>
          <CompareTable courses={resolved} />
          <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
            {AFFILIATE_DISCLOSURE}
          </p>
        </>
      )}
    </div>
  );
}
