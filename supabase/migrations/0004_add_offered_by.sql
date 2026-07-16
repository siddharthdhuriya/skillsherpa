-- The organization/institution that actually created and teaches a course
-- (e.g. "Stanford University and DeepLearning.AI"), distinct from the
-- affiliate marketplace it's sold through (platform_id, e.g. Coursera).
alter table public.courses add column if not exists offered_by text;
