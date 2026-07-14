import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// External on-demand revalidation hook. The admin panel already calls
// revalidatePath directly in its server actions; this route exists for
// changes made OUTSIDE the app (SQL edits in the Supabase dashboard, a
// Supabase webhook, a cron). Guarded by REVALIDATION_SECRET.
//
//   POST /api/revalidate?secret=...           -> revalidates everything
//   POST /api/revalidate?secret=...&path=/... -> revalidates one path
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!process.env.REVALIDATION_SECRET || secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ ok: false, error: "Invalid secret" }, { status: 401 });
  }
  const path = request.nextUrl.searchParams.get("path");
  if (path) {
    revalidatePath(path);
  } else {
    revalidatePath("/", "layout");
  }
  return NextResponse.json({ ok: true, revalidated: path ?? "all", at: new Date().toISOString() });
}
