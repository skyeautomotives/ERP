-- Phase 10 prep: a single configurable sales-incentive rate, alongside the
-- other global rates/prefixes already on company_settings.

alter table public.company_settings
  add column sales_incentive_rate numeric(5, 2) not null default 0;
