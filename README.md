# SkillSherpa

SEO-first online course comparison and discovery platform. Courses come
exclusively from platforms with an active affiliate partnership; that rule is
enforced in the database (triggers), in the app layer, and in the admin UI.

## Stack

- Next.js (App Router, React Server Components, TypeScript) with SSG + ISR
- Tailwind CSS v4 + shadcn/ui, CSS-variable theming (light + dark)
- Framer Motion (transitions, card tilt), React Three Fiber + drei (homepage hero)
- Supabase: Postgres + RLS, Auth (admin panel), Storage (logos/thumbnails)
- Postgres full-text search (tsvector); react-hook-form + zod; recharts; papaparse
- Deployment target: Vercel

## Local development

```bash
npm install
npm run dev
```

Without Supabase credentials the app runs in **local demo mode**: all reads and
writes go to an in-memory copy of the seed data (resets on server restart), and
`/admin` uses an "Enter demo admin" button instead of real auth. Every feature
is exercisable in this mode.

## Connecting Supabase

1. Create a Supabase project, then run the migrations in order:
   `supabase/migrations/0001_initial_schema.sql`, then `0002_seed.sql`
   (SQL editor or `supabase db push`).
2. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only: click logging + bulk import)
   - `NEXT_PUBLIC_SITE_URL` (canonical origin, e.g. https://skillsherpa.in)
   - `REVALIDATION_SECRET` (long random string for /api/revalidate)
3. Create the first admin user in Supabase Dashboard -> Authentication -> Users
   (email + password). Any authenticated user is treated as staff.
4. Restart the dev server; demo mode switches off automatically.

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel (framework preset: Next.js).
2. Add the five environment variables above in Vercel -> Project -> Settings ->
   Environment Variables (Production + Preview).
3. Point the skillsherpa.in domain at the project (Vercel -> Domains).
4. Post-deploy checklist:
   - `https://skillsherpa.in/sitemap.xml` lists home, categories, courses, comparisons
   - `https://skillsherpa.in/robots.txt` disallows `/admin`, `/go/`, `/api/`
   - Edit a course in `/admin` and confirm the public page updates immediately
     (on-demand ISR via `revalidatePath`)
   - `/go/<course-slug>` 302s to the partner URL and logs a row in `click_events`
   - Submit the sitemap in Google Search Console

## Important product rules

- **Affiliate-only catalog**: courses can only reference platforms with
  `has_affiliate_program = true`. Enforced by DB trigger, app-layer check,
  admin UI (non-affiliate platforms are unselectable), and CSV import preview.
- **Raw affiliate URLs never reach the client**: pages link to `/go/[slug]`
  (302 + click logging + `X-Robots-Tag: noindex`); `enrollment_link` is
  stripped from client-facing course objects.
- **Placeholder data**: seeded commission rates and affiliate URL parameters
  are dummies. Confirm real rates and tracking parameters against each
  platform's live affiliate agreement before launch.
- **Content uniqueness**: course summaries are rejected on save if they overlap
  the course description too heavily (trigram similarity check) to avoid
  duplicate-content SEO penalties.
- No em dashes in product copy; no references to any other business.

## Search scaling note

Search uses Postgres tsvector (see `search_courses` in the initial migration).
If search volume or catalog size outgrows it, swap the implementation inside
`searchCourses`/`getSuggestions` in `src/lib/data/index.ts` for
Algolia/Meilisearch; the rest of the app is agnostic.
