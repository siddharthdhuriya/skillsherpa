"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser client for the admin panel (auth + client-side queries).
// Typing lives at the data-layer boundary (src/lib/database.types.ts);
// the raw client is intentionally untyped.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
