import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CompareTable } from "@/components/compare-table";
import { getComparePairs, resolveComparePair } from "@/lib/compare";
import { JsonLdScript, breadcrumbSchema, courseSchema } from "@/lib/schema";
import { AFFILIATE_DISCLOSURE, SITE_NAME, SITE_URL } from "@/lib/site";

// Comparison pages target high-intent "X vs Y" searches; statically generated
// with hourly revalidation plus on-demand refresh from the admin panel.
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const pairs = await getComparePairs();
  return pairs.map((p) => ({ pair: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pair: string }>;
}): Promise<Metadata> {
  const { pair } = await params;
  const resolved = await resolveComparePair(pair);
  if (!resolved) return {};
  const [a, b] = resolved;
  const title = `${a.title} vs ${b.title}: Which Is Better?`;
  const description = `Side-by-side comparison of ${a.title} (${a.platform.name}) and ${b.title} (${b.platform.name}): price, rating, duration, and who each course suits best.`;
  const url = `${SITE_URL}/compare/${pair}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary_large_image" },
  };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ pair: string }>;
}) {
  const { pair } = await params;
  const resolved = await resolveComparePair(pair);
  if (!resolved) notFound();
  const [a, b] = resolved;
  const url = `${SITE_URL}/compare/${pair}`;

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
      <JsonLdScript
        data={[
          courseSchema(a),
          courseSchema(b),
          breadcrumbSchema([
            { name: "Home", url: SITE_URL },
            { name: "Comparisons", url: `${SITE_URL}/compare` },
            { name: `${a.title} vs ${b.title}`, url },
          ]),
        ]}
      />

      <div className="space-y-4">
        <Breadcrumbs
          crumbs={[{ name: "Comparisons", href: "/compare" }, { name: `${a.title} vs ${b.title}` }]}
        />
        <h1 className="font-heading text-3xl font-bold leading-tight sm:text-4xl">
          {a.title} <span className="text-muted-foreground">vs</span> {b.title}
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Two strong options in {a.category.name}. Here is how they stack up on price, rating,
          format, and who each one actually suits.
        </p>
      </div>

      <CompareTable courses={[a, b]} />

      <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">{AFFILIATE_DISCLOSURE}</p>
    </div>
  );
}
