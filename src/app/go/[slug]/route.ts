import { NextRequest, NextResponse } from "next/server";
import { getCourseBySlug, logClickEvent } from "@/lib/data";

// Affiliate redirect: /go/[course-slug]
// - Looks up the course's real enrollment_link (never exposed in page HTML;
//   pages link here with rel="sponsored nofollow noopener noreferrer").
// - Logs an anonymous click event (referrer + user agent only, no IP).
// - 302s to the partner URL with tracking parameters intact.
// - noindex via X-Robots-Tag; /go/ is also disallowed in robots.txt and
//   excluded from the sitemap.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) {
    return NextResponse.redirect(new URL("/", request.url), {
      status: 302,
      headers: { "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  // Fire-and-forget would risk being cancelled on some runtimes; await keeps
  // the log reliable and it is a single fast insert.
  try {
    await logClickEvent({
      course_id: course.id,
      referrer: request.headers.get("referer"),
      user_agent: request.headers.get("user-agent"),
    });
  } catch {
    // Never block the redirect on analytics.
  }

  // Per-platform tracking parameters are already embedded in enrollment_link
  // (managed in the admin panel). If a platform later requires dynamic
  // params (e.g. subId per click), append them here based on
  // course.platform.affiliate_network.
  return NextResponse.redirect(course.enrollment_link, {
    status: 302,
    headers: {
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
