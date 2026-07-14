import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Cookie-free Supabase client for public, RLS-permitted reads (courses,
 * categories, platforms, search). Unlike the request-scoped server client in
 * server.ts, this doesn't call next/headers' cookies(), so it works both at
 * request time AND during `generateStaticParams`/ISR revalidation, which run
 * without an HTTP request context.
 *
 * Never use this for admin writes or anything gated by
 * `auth.role() = 'authenticated'` — those need the cookie-bound session.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}
