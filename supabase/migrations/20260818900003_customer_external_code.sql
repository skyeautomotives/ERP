-- Supports the new Settings > Data Import feature: a nullable, unique
-- external-system identifier so re-importing the same legacy export upserts
-- existing customers instead of creating duplicates. Plain `unique` allows
-- unlimited NULLs in Postgres, so every existing/manually-created customer
-- (which will never have this set) is unaffected.
alter table public.customers add column external_code text unique;
