import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server client bound to the request's auth cookies (RSC / route handlers).
// Typing lives at the data-layer boundary (src/lib/database.types.ts).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component where cookies are read-only.
            // Safe to ignore when middleware refreshes sessions.
          }
        },
      },
    },
  );
}
