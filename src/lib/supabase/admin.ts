import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS — use only where required:
// click_events inserts from /go, and admin bulk import. Never import
// from client components.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
