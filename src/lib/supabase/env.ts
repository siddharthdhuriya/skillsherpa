// True when real Supabase credentials are present. When false, the data layer
// serves the in-memory seed dataset ("local demo mode") so the whole app can
// be developed and reviewed before a Supabase project is provisioned.
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      !url.includes("YOUR-PROJECT-REF") &&
      !key.includes("YOUR-ANON-KEY"),
  );
}
