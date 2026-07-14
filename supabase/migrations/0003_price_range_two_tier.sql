-- Simplify price_range from a 4-tier enum ('free','$','$$','$$$') to a
-- 2-tier one ('free','paid'). The admin now always captures an explicit
-- price_amount + currency for paid courses, so the old tier symbols were
-- redundant with the real price and confusing to a non-technical admin.

create type public.price_range_new as enum ('free', 'paid');

alter table public.courses
  alter column price_range drop default;

alter table public.courses
  alter column price_range type public.price_range_new
  using (case when price_range = 'free' then 'free' else 'paid' end)::text::public.price_range_new;

alter table public.courses
  alter column price_range set default 'paid';

drop type public.price_range;
alter type public.price_range_new rename to price_range;
