import Link from "next/link";
import { Logo } from "@/components/logo";
import { AFFILIATE_DISCLOSURE, SITE_NAME } from "@/lib/site";
import { getFooterLinkGroups } from "@/lib/footer-links";

function FooterNav({
  title,
  links,
  columns = 1,
}: {
  title: string;
  links: { label: string; href: string }[];
  columns?: 1 | 2;
}) {
  if (links.length === 0) return null;
  return (
    <nav aria-label={title}>
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <ul
        className={`gap-x-6 gap-y-2 text-sm text-muted-foreground ${
          columns === 2 ? "grid grid-cols-1 sm:grid-cols-2" : "space-y-2"
        }`}
      >
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export async function SiteFooter() {
  const { trending, categories, comparisons } = await getFooterLinkGroups();

  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-12">
        {/* Row 1: brand + core navigation */}
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-4">
            <Logo />
            <p className="max-w-md text-sm text-muted-foreground">
              {SITE_NAME} is an independent course discovery guide. We compare online courses
              from trusted partner platforms so you can pick the right one faster.
            </p>
            {/* Sitewide affiliate disclosure (FTC-style best practice). */}
            <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
              {AFFILIATE_DISCLOSURE}
            </p>
          </div>
          <FooterNav title="Learn by Category" links={categories} />
          <FooterNav
            title="Explore"
            links={[
              { label: "All Online Courses", href: "/courses" },
              { label: "Course Comparisons", href: "/compare" },
              { label: "Search Courses", href: "/search" },
            ]}
          />
        </div>

        {/* Row 2: strategic internal-linking blocks. Every anchor targets a
            real, indexable course/category/comparison page. */}
        <div className="grid gap-10 border-t pt-10 md:grid-cols-2">
          <FooterNav title="Trending Courses" links={trending} columns={2} />
          <FooterNav title="Popular Comparisons" links={comparisons} />
        </div>
      </div>

      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {SITE_NAME}. All course names, logos, and brands are
          property of their respective owners and are used for identification purposes only.
        </p>
      </div>
    </footer>
  );
}
