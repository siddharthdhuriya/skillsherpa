import "server-only";

import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const DEMO_ADMIN_COOKIE = "skillsherpa_demo_admin";

/**
 * True when the current request is an authenticated admin.
 * - Supabase mode: a valid Supabase Auth session (admin accounts are created
 *   in the Supabase dashboard; any authenticated user is staff).
 * - Demo mode (no credentials yet): a demo-session cookie set by the login
 *   page's "Enter demo admin" action.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const cookieStore = await cookies();
    return cookieStore.get(DEMO_ADMIN_COOKIE)?.value === "1";
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user);
}
