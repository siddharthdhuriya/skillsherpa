import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// External on-demand revalidation hook. The admin panel already calls
// revalidatePath directly in its server actions; this route exists for
// changes made OUTSIDE the app (SQL edits in the Supabase dashboard, a
// Supabase webhook, a cron). Guarded by REVALIDATION_SECRET — set a real
// random value (e.g. `openssl rand -hex 32`) before deploying; the
// placeholder in .env.example must never be used in production.
//
//   POST /api/revalidate  header: x-revalidate-secret: ...   -> revalidates everything
//   POST /api/revalidate?path=/...  header: x-revalidate-secret: ...  -> revalidates one path
//
// Prefers the header over a query param so the secret doesn't end up in
// server access logs or browser history.
export async function POST(request: NextRequest) {
  const secret =
    request.headers.get("x-revalidate-secret") ?? request.nextUrl.searchParams.get("secret");
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
