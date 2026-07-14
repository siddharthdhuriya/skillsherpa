import "server-only";

// In-memory store backing "local demo mode" (no Supabase credentials yet).
// Mutations from the admin panel work but reset on server restart; a banner
// in the admin UI makes this visible. Cached on globalThis so dev HMR and
// route handlers share one instance.

import type { Category, ClickEvent, Course, Platform } from "@/lib/database.types";
import { seedCategories, seedCourses, seedPlatforms } from "./seed-data";

export interface DemoStore {
  platforms: Platform[];
  categories: Category[];
  courses: Course[];
  clickEvents: ClickEvent[];
}

const g = globalThis as unknown as { __skillsherpaDemoStore?: DemoStore };

export function getDemoStore(): DemoStore {
  if (!g.__skillsherpaDemoStore) {
    g.__skillsherpaDemoStore = {
      platforms: seedPlatforms.map((p) => ({ ...p })),
      categories: seedCategories.map((c) => ({ ...c })),
      courses: seedCourses.map((c) => ({ ...c })),
      clickEvents: [],
    };
  }
  return g.__skillsherpaDemoStore;
}
