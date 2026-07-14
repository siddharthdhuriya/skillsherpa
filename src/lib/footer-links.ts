import "server-only";

import { getCategories, getCourses } from "@/lib/data";
import { getComparePairs } from "@/lib/compare";

// Strategic footer internal-linking. Rules that keep this an SEO asset
// instead of keyword stuffing:
// - every anchor points at a real, indexable page (course, category, or
//   comparison), never at noindex search URLs;
// - keywords are resolved against the live catalog at render time, so a link
//   only renders if its target exists (no 404s after admin edits);
// - lists stay short and curated (crawlable site-wide links, natural anchors).

export interface FooterLink {
  label: string;
  href: string;
}

// Curated keyword -> target map. Extend as the catalog grows; anything whose
// target slug no longer exists is silently dropped.
const TRENDING_KEYWORDS: {
  label: string;
  target: { type: "course" | "category"; slug: string };
}[] = [
  { label: "AI Courses Online", target: { type: "category", slug: "data-science" } },
  { label: "Machine Learning Courses Online", target: { type: "course", slug: "machine-learning-specialization-stanford" } },
  { label: "Python Courses Online", target: { type: "course", slug: "python-data-science-machine-learning-bootcamp" } },
  { label: "Data Science Certification Online", target: { type: "course", slug: "ibm-data-science-professional-certificate" } },
  { label: "SQL Courses Online", target: { type: "course", slug: "sql-for-data-analysis-beginner-advanced" } },
  { label: "Web Development Bootcamp Online", target: { type: "course", slug: "complete-web-development-bootcamp" } },
  { label: "React Courses Online", target: { type: "course", slug: "react-complete-guide-nextjs" } },
  { label: "Front End Developer Certification", target: { type: "course", slug: "meta-front-end-developer-certificate" } },
  { label: "IELTS Preparation Course Online", target: { type: "course", slug: "british-council-ielts-coach" } },
  { label: "Learn Spanish Online", target: { type: "course", slug: "rosetta-stone-spanish-latin-america" } },
  { label: "English Speaking Course Online", target: { type: "course", slug: "british-council-english-online-live" } },
  { label: "Entrepreneurship Courses Online", target: { type: "course", slug: "sara-blakely-self-made-entrepreneurship" } },
  { label: "Leadership Courses Online", target: { type: "category", slug: "business-leadership" } },
  { label: "Event Planning Certification Online", target: { type: "course", slug: "eventtrix-event-planning-certification" } },
];

export interface FooterLinkGroups {
  trending: FooterLink[];
  categories: FooterLink[];
  comparisons: FooterLink[];
}

export async function getFooterLinkGroups(): Promise<FooterLinkGroups> {
  const [courses, categories, pairs] = await Promise.all([
    getCourses(),
    getCategories(),
    getComparePairs(),
  ]);
  const courseBySlug = new Map(courses.map((c) => [c.slug, c]));
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  const trending: FooterLink[] = TRENDING_KEYWORDS.flatMap(({ label, target }) => {
    if (target.type === "course") {
      const course = courseBySlug.get(target.slug);
      return course ? [{ label, href: `/courses/${course.category.slug}/${course.slug}` }] : [];
    }
    return categoryBySlug.has(target.slug)
      ? [{ label, href: `/category/${target.slug}` }]
      : [];
  });

  // Keyword-rich category anchors ("Data Science Courses Online" beats
  // a bare "Data Science" for anchor-text relevance).
  const categoryLinks: FooterLink[] = categories
    .filter((c) => !c.parent_category_id)
    .map((c) => ({ label: `${c.name} Courses Online`, href: `/category/${c.slug}` }));

  // A handful of the curated comparison pages, natural "X vs Y" anchors.
  const comparisons: FooterLink[] = pairs.slice(0, 6).map((p) => ({
    label: `${p.courses[0].title} vs ${p.courses[1].title}`,
    href: `/compare/${p.slug}`,
  }));

  return { trending, categories: categoryLinks, comparisons };
}
