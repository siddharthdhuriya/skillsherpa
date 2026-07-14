import { getCourses, getPlatforms } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { PlatformsClient } from "./platforms-client";

export default async function PlatformsPage() {
  const [platforms, courses] = await Promise.all([
    getPlatforms(),
    getCourses({ includeInactive: true }),
  ]);
  const courseCounts = Object.fromEntries(
    platforms.map((p) => [p.id, courses.filter((c) => c.platform_id === p.id).length]),
  );
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Platforms</h1>
      <PlatformsClient
        platforms={platforms}
        courseCounts={courseCounts}
        storageEnabled={isSupabaseConfigured()}
      />
    </div>
  );
}
