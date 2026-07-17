import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { readSheetRows, writeBackToSheet } from "@/lib/google-sheets";
import { upsertCourseRows } from "@/lib/course-upsert";

// Google Sheet -> course catalog sync. Fully automatic, no human review step
// (by explicit product decision): a row whose slug matches an existing
// course updates it, a blank slug creates a new one. The DB trigger is
// still the final backstop regardless of which mode below is used.
//
// Two ways to reach this route, since server-side service-account key
// creation is disabled by policy on some Google Cloud orgs:
//
//   PUSH (primary): a Google Apps Script bound to the sheet POSTs
//   `{ rows: [...] }` directly — no Google credentials on our side at all.
//   The script itself writes slug/status/last_synced back into the sheet
//   using the JSON response, since it already has native access to its own
//   bound sheet.
//
//   PULL (fallback, if GOOGLE_SERVICE_ACCOUNT_* env vars are set): the
//   route reads the sheet itself via the Sheets API and writes the results
//   back server-side. Useful if a service account key is available.
//
// Auth is trigger-source-agnostic: the secret can arrive as
// `Authorization: Bearer <CRON_SECRET>` (what Apps Script's UrlFetchApp and
// Vercel Cron both send) or a `?secret=` query param.

function checkSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const secret = bearerSecret ?? request.nextUrl.searchParams.get("secret");
  return Boolean(process.env.CRON_SECRET) && secret === process.env.CRON_SECRET;
}

async function runSync(pushedRows: Record<string, unknown>[] | null) {
  const rows = pushedRows ?? (await readSheetRows());
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, results: [] });
  }

  const results = await upsertCourseRows(rows);
  const now = new Date().toISOString();

  // Pull mode: we read the sheet ourselves, so we also write results back
  // ourselves. Push mode: the caller (Apps Script) already has the sheet
  // open and writes results back itself from our JSON response.
  if (!pushedRows) {
    await writeBackToSheet(
      results.map((r) => ({
        rowIndex: r.row - 1,
        slug: r.slug ?? "",
        status: r.status === "failed" ? `Error: ${r.error}` : r.status,
        lastSynced: now,
      })),
    );
  }

  revalidatePath("/", "layout");

  const summary = {
    created: results.filter((r) => r.status === "created").length,
    updated: results.filter((r) => r.status === "updated").length,
    failed: results.filter((r) => r.status === "failed").length,
  };
  return NextResponse.json({ ok: true, processed: results.length, summary, results, at: now });
}

export async function POST(request: NextRequest) {
  if (!checkSecret(request)) {
    return NextResponse.json({ ok: false, error: "Invalid secret" }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => null);
    const pushedRows = Array.isArray(body?.rows) ? (body.rows as Record<string, unknown>[]) : null;
    return await runSync(pushedRows);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// GET: pull mode only (no request body to carry pushed rows), kept for
// manual browser testing and any scheduler that prefers GET.
export async function GET(request: NextRequest) {
  if (!checkSecret(request)) {
    return NextResponse.json({ ok: false, error: "Invalid secret" }, { status: 401 });
  }
  try {
    return await runSync(null);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
