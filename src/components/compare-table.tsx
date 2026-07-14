import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EnrollButton } from "@/components/enroll-button";
import { PlatformBadge } from "@/components/platform-badge";
import { RatingStars } from "@/components/rating-stars";
import { formatPrice } from "@/lib/format";
import { SITE_NAME } from "@/lib/site";
import type { CourseWithRelations, PublicCourse } from "@/lib/database.types";

type ComparableCourse = CourseWithRelations | PublicCourse;

// Side-by-side comparison table for 2-4 courses, reusing the card visual
// language. Server-renderable; used by the indexed /compare/[pair] pages and
// the user-driven /compare/view page.
export function CompareTable({ courses }: { courses: ComparableCourse[] }) {
  const rows: {
    label: string;
    render: (c: ComparableCourse) => React.ReactNode;
  }[] = [
    {
      label: "Platform",
      render: (c) => <PlatformBadge name={c.platform.name} logoUrl={c.platform.logo_url} />,
    },
    {
      label: "Price",
      render: (c) => (
        <span className="font-semibold text-primary">
          {formatPrice(c.price_range, c.price_amount, c.currency)}
        </span>
      ),
    },
    {
      label: "Rating",
      render: (c) => <RatingStars rating={c.external_rating} reviewCount={c.review_count} />,
    },
    { label: "Duration", render: (c) => c.duration ?? "Self-paced" },
    { label: "Language", render: (c) => c.language },
    {
      label: "Category",
      render: (c) => <Badge variant="secondary">{c.category.name}</Badge>,
    },
    {
      label: "Subcategory",
      render: (c) => c.subcategory ?? "-",
    },
    {
      label: `The ${SITE_NAME} take`,
      render: (c) =>
        c.ai_summary ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{c.ai_summary}</p>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        ),
    },
    {
      label: "About",
      render: (c) => (
        <p className="text-sm leading-relaxed text-muted-foreground">{c.description}</p>
      ),
    },
  ];

  const minWidth = 320 * Math.min(courses.length, 2) + 160;

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full border-separate border-spacing-0 text-left"
        style={{ minWidth: `${minWidth}px` }}
      >
        <caption className="sr-only">
          Comparison of {courses.map((c) => c.title).join(", ")}
        </caption>
        <thead>
          <tr>
            <th scope="col" className="w-36 pb-4" aria-label="Attribute" />
            {courses.map((c) => (
              <th
                key={c.id}
                scope="col"
                className="rounded-t-xl border border-b-0 bg-card p-5 align-top font-normal"
                style={{ width: `${100 / courses.length}%` }}
              >
                <Link
                  href={`/courses/${c.category.slug}/${c.slug}`}
                  className="font-heading text-lg font-semibold leading-snug hover:text-primary"
                >
                  {c.title}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.label}>
              <th
                scope="row"
                className="pr-4 text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                {row.label}
              </th>
              {courses.map((c) => (
                <td
                  key={c.id}
                  className={`border-x bg-card p-5 align-top ${i === 0 ? "" : "border-t"}`}
                >
                  {row.render(c)}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <th scope="row" className="sr-only">
              Enroll
            </th>
            {courses.map((c) => (
              <td key={c.id} className="rounded-b-xl border bg-card p-5">
                <EnrollButton courseSlug={c.slug} courseTitle={c.title} platformName={c.platform.name} />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
