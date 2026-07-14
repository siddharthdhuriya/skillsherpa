import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Scale } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CourseCard } from "@/components/course-card";
import { getCategories, getCategoryBySlug, getCourses } from "@/lib/data";
import { toPublicCourse } from "@/lib/database.types";
import { getComparePairs } from "@/lib/compare";
import {
  JsonLdScript,
  breadcrumbSchema,
  courseUrl,
  faqSchema,
  itemListSchema,
} from "@/lib/schema";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// Category pages are statically generated and revalidated every 10 minutes,
// plus on demand whenever the admin edits a course or category.
export const revalidate = 600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  const title = category.seo_title ?? `Best ${category.name} Courses Online | ${SITE_NAME}`;
  const description =
    category.seo_description ??
    `Compare the best ${category.name.toLowerCase()} courses from trusted partner platforms. Ratings, prices, and durations side by side.`;
  const url = `${SITE_URL}/category/${category.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary_large_image" },
  };
}

function buildFaqs(categoryName: string, courseCount: number, freeCount: number) {
  // FAQ copy is generated from live data so it stays accurate as the catalog
  // changes; the FAQPage JSON-LD below mirrors this block exactly.
  return [
    {
      question: `How many ${categoryName.toLowerCase()} courses does ${SITE_NAME} list?`,
      answer: `${SITE_NAME} currently lists ${courseCount} hand-picked ${categoryName.toLowerCase()} courses from partner platforms, each with an original summary and comparable pricing details.`,
    },
    {
      question: `Are there free ${categoryName.toLowerCase()} courses?`,
      answer:
        freeCount > 0
          ? `Yes. ${freeCount} of the ${categoryName.toLowerCase()} courses listed here are free to start. Look for the Free badge on the course cards.`
          : `Most ${categoryName.toLowerCase()} courses listed here are paid, but platforms often run discounts. Check the course page for current pricing.`,
    },
    {
      question: `How does ${SITE_NAME} choose which courses to list?`,
      answer: `We only list courses from platforms we have an active partnership with, and we write an original summary for each one. If you enroll through our links we may earn a commission at no extra cost to you.`,
    },
  ];
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const [courses, allPairs] = await Promise.all([
    getCourses({ categorySlug: slug }),
    getComparePairs(),
  ]);
  const pairs = allPairs.filter((p) => p.courses[0].category_id === category.id).slice(0, 4);
  const freeCount = courses.filter((c) => c.price_range === "free").length;
  const faqs = buildFaqs(category.name, courses.length, freeCount);
  const url = `${SITE_URL}/category/${category.slug}`;

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-10">
      <JsonLdScript
        data={[
          breadcrumbSchema([
            { name: "Home", url: SITE_URL },
            { name: category.name, url },
          ]),
          itemListSchema(
            courses.map((c) => ({ name: c.title, url: courseUrl(c) })),
          ),
          ...(faqs.length > 0 ? [faqSchema(faqs)] : []),
        ]}
      />

      <div className="space-y-4">
        <Breadcrumbs crumbs={[{ name: category.name }]} />
        <h1 className="font-heading text-3xl font-bold sm:text-4xl">
          Best {category.name} courses online
        </h1>
        {category.description && (
          <p className="max-w-2xl text-muted-foreground">{category.description}</p>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <p className="font-medium">No courses in this category yet.</p>
          <p className="mt-1 text-sm">Check back soon; the catalog grows every week.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={toPublicCourse(course)} />
          ))}
        </div>
      )}

      {pairs.length > 0 && (
        <section aria-labelledby="compare-heading" className="rounded-xl border bg-muted/30 p-6">
          <h2 id="compare-heading" className="font-heading flex items-center gap-2 text-xl font-semibold">
            <Scale aria-hidden="true" className="size-5 text-primary" />
            Popular comparisons
          </h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {pairs.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/compare/${p.slug}`}
                  className="block rounded-lg border bg-card px-4 py-3 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  {p.courses[0].title} vs {p.courses[1].title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="faq-heading" className="max-w-3xl">
        <h2 id="faq-heading" className="font-heading text-2xl font-bold">
          Frequently asked questions
        </h2>
        <dl className="mt-6 space-y-6">
          {faqs.map((f) => (
            <div key={f.question}>
              <dt className="font-semibold">{f.question}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
