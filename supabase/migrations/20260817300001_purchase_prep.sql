-- Phase 4 prep: purchase invoice numbering (mirrors the sales numbering columns
-- from Phase 1) and the last-purchase fields on products that only Purchase entry
-- can honestly populate (Phase 2 deliberately left these off).

alter table public.company_settings
  add column purchase_ref_prefix text not null default 'PUR',
  add column purchase_ref_padding int not null default 5,
  add column next_purchase_ref_number int not null default 1;

alter table public.products
  add column last_purchase_rate numeric(14, 2),
  add column last_purchase_date date;
