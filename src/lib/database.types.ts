// Hand-maintained database types matching supabase/migrations.
// When a real Supabase project is connected, these can be regenerated with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts

export type PriceRange = "free" | "paid";

export interface Platform {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string;
  has_affiliate_program: boolean;
  commission_rate: number | null;
  affiliate_network: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_category_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
}

export interface Course {
  id: string;
  platform_id: string;
  title: string;
  slug: string;
  category_id: string;
  subcategory: string | null;
  description: string;
  ai_summary: string | null;
  price_range: PriceRange;
  price_amount: number | null;
  currency: string;
  external_rating: number | null;
  review_count: number | null;
  duration: string | null;
  language: string;
  /** Raw partner affiliate URL — server-only, never sent to the client. */
  enrollment_link: string;
  thumbnail_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClickEvent {
  id: string;
  course_id: string;
  clicked_at: string;
  referrer: string | null;
  user_agent: string | null;
}

/** Course joined with its platform and category, as used on listing surfaces. */
export type CourseWithRelations = Course & {
  platform: Platform;
  category: Category;
};

/** Client-safe course shape: enrollment_link stripped. */
export type PublicCourse = Omit<CourseWithRelations, "enrollment_link">;

export function toPublicCourse(course: CourseWithRelations): PublicCourse {
  const safe = { ...course } as Partial<CourseWithRelations>;
  delete safe.enrollment_link;
  return safe as PublicCourse;
}

export interface Database {
  public: {
    Tables: {
      platforms: {
        Row: Platform;
        Insert: Partial<Platform> &
          Pick<Platform, "name" | "website_url" | "has_affiliate_program">;
        Update: Partial<Platform>;
        Relationships: [];
      };
      categories: {
        Row: Category;
        Insert: Partial<Category> & Pick<Category, "name" | "slug">;
        Update: Partial<Category>;
        Relationships: [];
      };
      courses: {
        Row: Course;
        Insert: Partial<Course> &
          Pick<
            Course,
            | "platform_id"
            | "title"
            | "slug"
            | "category_id"
            | "description"
            | "enrollment_link"
          >;
        Update: Partial<Course>;
        Relationships: [];
      };
      click_events: {
        Row: ClickEvent;
        Insert: Partial<ClickEvent> & Pick<ClickEvent, "course_id">;
        Update: Partial<ClickEvent>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_courses: {
        Args: { query: string; max_results?: number };
        Returns: Course[];
      };
    };
    Enums: {
      price_range: PriceRange;
    };
  };
}
