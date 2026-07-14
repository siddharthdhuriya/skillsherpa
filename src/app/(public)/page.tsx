import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, Scale, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroBackdrop } from "@/components/hero/hero";
import { HeroSearchBar } from "@/components/hero/search-bar";
import { PartnerMarquee } from "@/components/partner-marquee";
import { CourseCard } from "@/components/course-card";
import { getCategories, getCourses } from "@/lib/data";
import { toPublicCourse } from "@/lib/database.types";
import { JsonLdScript, organizationSchema, websiteSchema } from "@/lib/schema";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME}: Find and Compare the Best Online Courses` },
  description:
    "Search and compare online courses from Coursera, Udemy, British Council, and more trusted partner platforms. Honest summaries, real ratings, and side-by-side comparisons.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: `${SITE_NAME}: Find and Compare the Best Online Courses`,
    description:
      "Search and compare online courses from trusted partner platforms. Honest summaries, real ratings, side-by-side comparisons.",
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

const VALUE_PROPS = [
  {
    icon: Compass,
    title: "Guided discovery",
    text: "Search across partner platforms in one place instead of opening ten tabs.",
  },
  {
    icon: Sparkles,
    title: "Honest summaries",
    text: "Every course gets an original summary of who it suits, not recycled marketing copy.",
  },
  {
    icon: Scale,
    title: "True comparisons",
    text: "Price, rating, duration, and format side by side, so trade-offs are obvious.",
  },
];

export default async function HomePage() {
  const [categories, courses] = await Promise.all([getCategories(), getCourses()]);
  const featured = courses.slice(0, 6).map(toPublicCourse);
  const topLevelCategories = categories.filter((c) => !c.parent_category_id);

  return (
    <>
      <JsonLdScript data={[organizationSchema(), websiteSchema()]} />

      {/* Hero: full-viewport, 3D backdrop (lazy) over static gradient */}
      <section className="relative flex min-h-[88svh] items-center overflow-hidden">
        <HeroBackdrop />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-24">
          <div className="max-w-2xl space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
              {courses.length}+ courses from {new Set(courses.map((c) => c.platform.name)).size} partner platforms
            </p>
            <h1 className="font-heading text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">
              The right course is up there.
              <br />
              <span className="text-primary">We know the way.</span>
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              {SITE_NAME} compares online courses from trusted partner platforms, with honest
              summaries and real ratings, so you climb the right learning path the first time.
            </p>
            <HeroSearchBar />
            <div className="flex flex-wrap gap-2 pt-1">
              {topLevelCategories.map((c) => (
                <Link
                  key={c.id}
                  href={`/category/${c.slug}`}
                  className="rounded-full border bg-background/60 px-3.5 py-1.5 text-sm font-medium backdrop-blur-sm transition-colors hover:border-primary hover:text-primary"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PartnerMarquee />

      {/* Value props */}
      <section aria-labelledby="how-heading" className="mx-auto max-w-6xl px-4 py-20">
        <h2 id="how-heading" className="font-heading text-center text-3xl font-bold">
          Your sherpa for online learning
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          Three things we do so you spend your time learning, not comparing tabs.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {VALUE_PROPS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border bg-card p-6">
              <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-accent">
                <Icon aria-hidden="true" className="size-5 text-primary" />
              </div>
              <h3 className="font-heading text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured courses */}
      <section aria-labelledby="featured-heading" className="bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="featured-heading" className="font-heading text-3xl font-bold">
                Top rated right now
              </h2>
              <p className="mt-2 text-muted-foreground">
                The highest-rated courses across all partner platforms.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/courses">
                Browse all courses
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      </section>

      {/* Category tiles */}
      <section aria-labelledby="categories-heading" className="mx-auto max-w-6xl px-4 py-20">
        <h2 id="categories-heading" className="font-heading text-3xl font-bold">
          Explore by category
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {topLevelCategories.map((c) => {
            const count = courses.filter((course) => course.category_id === c.id).length;
            return (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className="group rounded-xl border bg-card p-6 transition-colors hover:border-primary"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-xl font-semibold group-hover:text-primary">
                    {c.name}
                  </h3>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
                  />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                <p className="mt-3 text-xs font-medium text-primary">
                  {count} {count === 1 ? "course" : "courses"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
