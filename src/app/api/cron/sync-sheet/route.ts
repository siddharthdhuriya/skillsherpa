import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { readSheetRows, writeBackToSheet } from "@/lib/google-sheets";
import { upsertCourseRows } from "@/lib/course-upsert";

// Scheduled Google Sheets -> course catalog sync. Fully automatic, no human
// review step (by explicit product decision): a row whose slug matches an
// existing course updates it, a blank slug creates a new one. Every row's
// resolved slug + status + timestamp gets written back into the sheet so
// the admin has visibility into what happened without checking logs.
//
// Trigger-source-agnostic: works whether it's called by Vercel Cron
// (sends `Authorization: Bearer $CRON_SECRET` automatically when the env
// var is named exactly CRON_SECRET) or an external scheduler like a GitHub
// Actions workflow (curl with the same header, or a ?secret= query param).
// Prefers the header so the secret doesn't end up in logs/history.
//
// Required env vars: CRON_SECRET, GOOGLE_SHEET_ID,
// GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.
export async function POST(request: NextRequest) {
  return handleSync(request);
}

// GET too: some schedulers (and manual browser testing) are simplest as GET.
export async function GET(request: NextRequest) {
  return handleSync(request);
}

async function handleSync(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const secret = bearerSecret ?? request.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Invalid secret" }, { status: 401 });
  }

  try {
    const rows = await readSheetRows();
    if (rows.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, results: [] });
    }

    const results = await upsertCourseRows(rows);

    const now = new Date().toISOString();
    await writeBackToSheet(
      results.map((r) => ({
        rowIndex: r.row - 1,
        slug: r.slug ?? "",
        status: r.status === "failed" ? `Error: ${r.error}` : r.status,
        lastSynced: now,
      })),
    );

    revalidatePath("/", "layout");

    const summary = {
      created: results.filter((r) => r.status === "created").length,
      updated: results.filter((r) => r.status === "updated").length,
      failed: results.filter((r) => r.status === "failed").length,
    };
    return NextResponse.json({ ok: true, processed: results.length, summary, results, at: now });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
