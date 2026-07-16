-- SkillSherpa initial schema
-- Platforms, categories, courses, click_events + affiliate-only enforcement.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- platforms
-- ---------------------------------------------------------------------------
create table public.platforms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  logo_url text,
  website_url text not null,
  has_affiliate_program boolean not null default false,
  -- PLACEHOLDER: commission rates below are illustrative only. Real rates must
  -- be confirmed against each platform's live affiliate agreement before launch.
  commission_rate numeric(5,2),
  affiliate_network text, -- e.g. "Cuelinks", "Direct", "Impact"
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- categories (self-referencing for subcategories)
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  parent_category_id uuid references public.categories(id) on delete set null,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now()
);

create index categories_parent_idx on public.categories(parent_category_id);

-- ---------------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------------
create type public.price_range as enum ('free', 'paid');

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  platform_id uuid not null references public.platforms(id) on delete restrict,
  title text not null,
  slug text not null unique,
  category_id uuid not null references public.categories(id) on delete restrict,
  subcategory text,
  -- The institution/organization that actually created and teaches the
  -- course (e.g. "Stanford University and DeepLearning.AI"), distinct from
  -- the affiliate marketplace it's sold through (platform_id, e.g. Coursera).
  offered_by text,
  description text not null,
  ai_summary text,
  price_range public.price_range not null default 'paid',
  price_amount numeric(10,2),
  currency text not null default 'USD',
  external_rating numeric(3,2) check (external_rating >= 0 and external_rating <= 5),
  review_count integer check (review_count >= 0),
  duration text,
  language text not null default 'English',
  -- Raw partner affiliate URL. Never exposed to the client; only the
  -- /go/[slug] route handler reads it server-side.
  enrollment_link text not null,
  thumbnail_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Generated tsvector for Postgres full-text search.
  -- NOTE: if search volume outgrows Postgres FTS, this is the seam where
  -- Algolia/Meilisearch would replace it: index on write here, query there.
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(subcategory, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) stored
);

create index courses_slug_idx on public.courses(slug);
create index courses_platform_idx on public.courses(platform_id);
create index courses_category_idx on public.courses(category_id);
create index courses_active_idx on public.courses(is_active);
create index courses_search_idx on public.courses using gin(search_vector);

-- ---------------------------------------------------------------------------
-- HARD PRODUCT RULE: courses may only belong to platforms with an active
-- affiliate program. Enforced in the database, not just the app layer.
-- The trigger also fires when a platform tries to flip has_affiliate_program
-- to false while it still has courses listed.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_affiliate_platform()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.platforms p
    where p.id = new.platform_id
      and p.has_affiliate_program = true
  ) then
    raise exception
      'Course "%" rejected: platform % has no affiliate program. Only affiliate-partner platforms may list courses.',
      new.title, new.platform_id;
  end if;
  return new;
end;
$$;

create trigger courses_affiliate_only
  before insert or update of platform_id on public.courses
  for each row
  execute function public.enforce_affiliate_platform();

create or replace function public.prevent_affiliate_flag_removal()
returns trigger
language plpgsql
as $$
begin
  if old.has_affiliate_program = true
     and new.has_affiliate_program = false
     and exists (select 1 from public.courses c where c.platform_id = old.id) then
    raise exception
      'Cannot disable affiliate program for platform "%" while it still has listed courses. Remove or reassign its courses first.',
      old.name;
  end if;
  return new;
end;
$$;

create trigger platforms_affiliate_flag_guard
  before update of has_affiliate_program on public.platforms
  for each row
  execute function public.prevent_affiliate_flag_removal();

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger courses_set_updated_at
  before update on public.courses
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- click_events (affiliate click analytics)
-- Privacy: no IP addresses or user identifiers; only what aggregate
-- reporting needs.
-- ---------------------------------------------------------------------------
create table public.click_events (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  clicked_at timestamptz not null default now(),
  referrer text,
  user_agent text
);

create index click_events_course_idx on public.click_events(course_id);
create index click_events_time_idx on public.click_events(clicked_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Admin users are handled via Supabase Auth directly (no custom auth table).
-- Any authenticated user is treated as an admin; admin accounts are created
-- only via the Supabase dashboard, so "authenticated" == staff.
-- ---------------------------------------------------------------------------
alter table public.platforms enable row level security;
alter table public.categories enable row level security;
alter table public.courses enable row level security;
alter table public.click_events enable row level security;

-- Public read: only active courses; platforms/categories readable by all.
create policy "public read active courses"
  on public.courses for select
  using (is_active = true or auth.role() = 'authenticated');

create policy "public read platforms"
  on public.platforms for select
  using (true);

create policy "public read categories"
  on public.categories for select
  using (true);

-- Admin writes (authenticated role only).
create policy "admin write courses"
  on public.courses for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "admin write platforms"
  on public.platforms for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "admin write categories"
  on public.categories for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Click events: inserted by the /go route via the service role (bypasses RLS);
-- readable only by admins for the analytics dashboard.
create policy "admin read click_events"
  on public.click_events for select
  using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Full-text search helper used by the public search page and autocomplete.
-- ---------------------------------------------------------------------------
create or replace function public.search_courses(query text, max_results int default 20)
returns setof public.courses
language sql
stable
as $$
  select c.*
  from public.courses c
  where c.is_active = true
    and c.search_vector @@ websearch_to_tsquery('english', query)
  order by ts_rank(c.search_vector, websearch_to_tsquery('english', query)) desc
  limit max_results;
$$;

-- ---------------------------------------------------------------------------
-- Storage bucket for platform logos and course thumbnails.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "public read media"
  on storage.objects for select
  using (bucket_id = 'media');

create policy "admin write media"
  on storage.objects for insert
  with check (bucket_id = 'media' and auth.role() = 'authenticated');

create policy "admin update media"
  on storage.objects for update
  using (bucket_id = 'media' and auth.role() = 'authenticated');

create policy "admin delete media"
  on storage.objects for delete
  using (bucket_id = 'media' and auth.role() = 'authenticated');
