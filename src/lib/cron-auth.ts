import "server-only";

import { NextRequest } from "next/server";

// Shared secret check for scheduled routes (Google Sheets sync, ratings
// refresh, ...). Trigger-source-agnostic: the secret can arrive as
// `Authorization: Bearer <CRON_SECRET>` (what Apps Script's UrlFetchApp and
// Vercel Cron both send) or a `?secret=` query param.
export function checkCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const secret = bearerSecret ?? request.nextUrl.searchParams.get("secret");
  return Boolean(process.env.CRON_SECRET) && secret === process.env.CRON_SECRET;
}
