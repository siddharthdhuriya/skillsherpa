import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Globe, Scale, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CompareDetailButton } from "@/components/compare/compare-button";
import { CourseCard } from "@/components/course-card";
import { CourseThumbnail } from "@/components/course-thumbnail";
import { EnrollButton } from "@/components/enroll-button";
import { PlatformBadge } from "@/components/platform-badge";
import { RatingStars } from "@/components/rating-stars";
import { getCourseBySlug, getCourses, getRelatedCourses } from "@/lib/data";
import { toPublicCourse } from "@/lib/database.types";
import { comparePairSlug } from "@/lib/compare";
import { formatPrice } from "@/lib/format";
import { JsonLdScript, breadcrumbSchema, courseSchema, courseUrl } from "@/lib/schema";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// Course pages are pre-rendered at build time and revalidated every 5
// minutes, plus on demand from the admin panel on save.
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const courses = await getCourses();
  return courses.map((c) => ({ category: c.category.slug, slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return {};
  const title = `${course.title} Review: Price, Rating & Alternatives`;
  const description = `${course.title} on ${course.platform.name}: ${formatPrice(course.price_range, course.price_amount, course.currency)}, rated ${course.external_rating ?? "n/a"}/5. Read ${SITE_NAME}'s honest summary and compare alternatives.`;
  const url = courseUrl(course);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary_large_image" },
  };
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category: categorySlug, slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course || course.category.slug !== categorySlug) notFound();

  const related = await getRelatedCourses(course, 4);
  const topAlternative = related.find((r) => r.category_id === course.category_id);
  const price = formatPrice(course.price_range, course.price_amount, course.currency);
  const url = courseUrl(course);

  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 py-10">
      <JsonLdScript
        data={[
          courseSchema(course),
          breadcrumbSchema([
            { name: "Home", url: SITE_URL },
            { name: course.category.name, url: `${SITE_URL}/category/${course.category.slug}` },
            { name: course.title, url },
          ]),
        ]}
      />

      <div className="space-y-4">
        <Breadcrumbs
          crumbs={[
            { name: course.category.name, href: `/category/${course.category.slug}` },
            { name: course.title },
          ]}
        />
        <div className="flex flex-wrap items-center gap-3">
          <PlatformBadge name={course.platform.name} logoUrl={course.platform.logo_url} size={24} />
          <Badge variant="secondary">{course.category.name}</Badge>
          {course.subcategory && <Badge variant="outline">{course.subcategory}</Badge>}
        </div>
        <h1 className="font-heading max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">
          {course.title}
        </h1>
        {course.offered_by && (
          <p className="text-sm text-muted-foreground">Offered by {course.offered_by}</p>
        )}
        <RatingStars rating={course.external_rating} reviewCount={course.review_count} />
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        {/* Left column: summary + details */}
        <div className="min-w-0 space-y-10">
          {course.ai_summary && (
            <section aria-labelledby="summary-heading" className="rounded-xl border bg-accent/30 p-6">
              <h2 id="summary-heading" className="font-heading flex items-center gap-2 text-lg font-semibold">
                <Sparkles aria-hidden="true" className="size-4.5 text-primary" />
                The {SITE_NAME} take
              </h2>
              <p className="mt-3 leading-relaxed">{course.ai_summary}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                Written by {SITE_NAME}, not the course provider.
              </p>
            </section>
          )}

          <section aria-labelledby="about-heading">
            <h2 id="about-heading" className="font-heading text-xl font-semibold">
              About this course
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{course.description}</p>
          </section>

          <section aria-labelledby="details-heading">
            <h2 id="details-heading" className="font-heading text-xl font-semibold">
              Key details
            </h2>
            <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {[
                ["Platform", course.platform.name],
                ...(course.offered_by ? [["Offered by", course.offered_by]] : []),
                ["Category", course.category.name],
                ["Price", price],
                ["Duration", course.duration ?? "Self-paced"],
                ["Language", course.language],
                [
                  "Rating",
                  course.external_rating != null
                    ? `${course.external_rating}/5 (${course.review_count?.toLocaleString() ?? 0} reviews)`
                    : "Not yet rated",
                ],
              ].map(([label, value]) => (
                <div key={label} className="border-b pb-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="mt-1 font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        {/* Right column: sticky price/CTA card */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <CourseThumbnail
              title={course.title}
              thumbnailUrl={course.thumbnail_url}
              sizes="(max-width: 1024px) 100vw, 340px"
            />
            <div className="p-6">
              <div className="flex items-baseline justify-between">
                <span className="font-heading text-3xl font-bold text-primary">{price}</span>
                {course.duration && (
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock aria-hidden="true" className="size-4" />
                    {course.duration}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                on {course.platform.name}
                {course.price_range !== "free" && ". Platform discounts may apply."}
              </p>
              <div className="mt-5">
                <EnrollButton
                  courseSlug={course.slug}
                  courseTitle={course.title}
                  platformName={course.platform.name}
                />
              </div>
              {/* Inline affiliate disclosure near the CTA (FTC-style). */}
              <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
                Affiliate link: if you enroll, {SITE_NAME} may earn a commission from{" "}
                {course.platform.name} at no extra cost to you.
              </p>
              <div className="mt-5 space-y-2 border-t pt-4 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Globe aria-hidden="true" className="size-4" />
                  Taught in {course.language}
                </p>
                <p className="flex items-center gap-2">
                  <Clock aria-hidden="true" className="size-4" />
                  {course.duration ?? "Learn at your own pace"}
                </p>
              </div>
              <div className="mt-5 space-y-2">
                <CompareDetailButton course={{ slug: course.slug, title: course.title }} />
                {topAlternative && (
                  <Link
                    href={`/compare/${comparePairSlug(course, topAlternative)}`}
                    className="flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
                  >
                    <Scale aria-hidden="true" className="size-4" />
                    See a popular comparison
                  </Link>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-heading">
          <h2 id="related-heading" className="font-heading text-2xl font-bold">
            Related courses
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            More options in{" "}
            <Link
              href={`/category/${course.category.slug}`}
              className="font-medium text-primary hover:underline"
            >
              {course.category.name}
            </Link>{" "}
            and from {course.platform.name}.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <CourseCard key={r.id} course={toPublicCourse(r)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
