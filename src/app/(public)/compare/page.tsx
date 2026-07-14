import type { Metadata } from "next";
import Link from "next/link";
import { Scale } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getCategories } from "@/lib/data";
import { getComparePairs } from "@/lib/compare";
import { JsonLdScript, breadcrumbSchema, itemListSchema } from "@/lib/schema";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Course Comparisons: Side-by-Side Showdowns",
  description: `Side-by-side comparisons of popular online courses. ${SITE_NAME} breaks down price, ratings, and format so you can pick with confidence.`,
  alternates: { canonical: `${SITE_URL}/compare` },
  openGraph: {
    title: `Course Comparisons | ${SITE_NAME}`,
    description: "Side-by-side comparisons of popular online courses.",
    url: `${SITE_URL}/compare`,
    siteName: SITE_NAME,
    type: "website",
  },
};

export default async function CompareIndexPage() {
  const [pairs, categories] = await Promise.all([getComparePairs(), getCategories()]);
  const byCategory = categories
    .map((cat) => ({
      category: cat,
      pairs: pairs.filter((p) => p.courses[0].category_id === cat.id),
    }))
    .filter((g) => g.pairs.length > 0);

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
      <JsonLdScript
        data={[
          breadcrumbSchema([
            { name: "Home", url: SITE_URL },
            { name: "Comparisons", url: `${SITE_URL}/compare` },
          ]),
          itemListSchema(
            pairs.map((p) => ({
              name: `${p.courses[0].title} vs ${p.courses[1].title}`,
              url: `${SITE_URL}/compare/${p.slug}`,
            })),
          ),
        ]}
      />
      <div className="space-y-4">
        <Breadcrumbs crumbs={[{ name: "Comparisons" }]} />
        <h1 className="font-heading text-3xl font-bold sm:text-4xl">Course comparisons</h1>
        <p className="max-w-2xl text-muted-foreground">
          Deciding between two courses? These side-by-side breakdowns cover price, ratings,
          duration, and who each course actually suits.
        </p>
      </div>
      {byCategory.map(({ category, pairs: categoryPairs }) => (
        <section key={category.id} aria-labelledby={`compare-${category.slug}`}>
          <h2 id={`compare-${category.slug}`} className="font-heading text-xl font-semibold">
            {category.name}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {categoryPairs.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/compare/${p.slug}`}
                  className="flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary"
                >
                  <Scale aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-sm font-medium leading-snug">
                    {p.courses[0].title} <span className="text-muted-foreground">vs</span>{" "}
                    {p.courses[1].title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
