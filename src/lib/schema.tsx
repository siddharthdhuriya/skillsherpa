import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from "@/lib/site";
import type { CourseWithRelations, PublicCourse } from "@/lib/database.types";

// JSON-LD builders. Every builder only emits properties that have real
// values; required fields are always populated, optional ones are dropped
// when empty (never emitted blank) per Google's Rich Results requirements.

type JsonLd = Record<string, unknown>;

export function organizationSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
    description: SITE_DESCRIPTION,
  };
}

export function websiteSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function courseUrl(course: Pick<PublicCourse, "slug"> & { category: { slug: string } }): string {
  return `${SITE_URL}/courses/${course.category.slug}/${course.slug}`;
}

export function courseSchema(course: CourseWithRelations | PublicCourse): JsonLd {
  const schema: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.description,
    url: courseUrl(course),
    provider: {
      "@type": "Organization",
      name: course.platform.name,
      url: course.platform.website_url,
    },
    inLanguage: course.language,
    offers: {
      "@type": "Offer",
      category: course.price_range === "free" ? "Free" : "Paid",
      ...(course.price_range === "free"
        ? { price: 0, priceCurrency: course.currency }
        : course.price_amount != null
          ? { price: course.price_amount, priceCurrency: course.currency }
          : {}),
    },
    // Google requires hasCourseInstance for Course rich results.
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Online",
      ...(course.duration ? { courseWorkload: course.duration } : {}),
    },
  };
  if (course.external_rating != null && course.review_count != null && course.review_count > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: course.external_rating,
      reviewCount: course.review_count,
      bestRating: 5,
      worstRating: 0,
    };
  }
  return schema;
}

export function itemListSchema(
  items: { name: string; url: string }[],
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

export function breadcrumbSchema(crumbs: { name: string; url: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

export function faqSchema(faqs: { question: string; answer: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function JsonLdScript({ data }: { data: JsonLd | JsonLd[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
