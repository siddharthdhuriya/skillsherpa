import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCourses, updateCourse } from "@/lib/data";
import { fetchCourseRating } from "@/lib/course-metadata";
import { checkCronSecret } from "@/lib/cron-auth";

// Re-scrapes rating/review_count from each active course's own enrollment
// link on a schedule (every 2 days — see docs/apps-script/sync.gs), so
// listed ratings stay current without an admin re-visiting every course.
// Same secret/trigger model as /api/cron/sync-sheet: Apps Script (or Vercel
// Cron / any external scheduler) sends `Authorization: Bearer <CRON_SECRET>`
// or `?secret=`.
//
// A course is skipped (not zeroed out) whenever the fetch fails or the
// source page publishes no aggregateRating — a transient scrape failure or
// a platform that just doesn't expose structured rating data should never
// overwrite good existing values with nulls.

// Sequential with a short delay between requests, not concurrent: this hits
// many different external domains unattended on a timer, so being a
// deliberately slow, well-behaved caller matters more than finishing fast.
const DELAY_BETWEEN_FETCHES_MS = 500;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runRefresh() {
  const courses = await getCourses();
  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (const course of courses) {
    try {
      const { externalRating, reviewCount } = await fetchCourseRating(course.enrollment_link);
      if (externalRating == null && reviewCount == null) {
        unchanged++;
      } else {
        await updateCourse(
          course.id,
          {
            ...(externalRating != null && { external_rating: externalRating }),
            ...(reviewCount != null && { review_count: reviewCount }),
          },
          { serviceRole: true },
        );
        updated++;
      }
    } catch {
      failed++;
    }
    await delay(DELAY_BETWEEN_FETCHES_MS);
  }

  revalidatePath("/", "layout");

  const at = new Date().toISOString();
  return NextResponse.json({ ok: true, processed: courses.length, updated, unchanged, failed, at });
}

export async function POST(request: NextRequest) {
  if (!checkCronSecret(request)) {
    return NextResponse.json({ ok: false, error: "Invalid secret" }, { status: 401 });
  }
  try {
    return await runRefresh();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Refresh failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!checkCronSecret(request)) {
    return NextResponse.json({ ok: false, error: "Invalid secret" }, { status: 401 });
  }
  try {
    return await runRefresh();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Refresh failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
