-- Phase 3: company_settings needs a state to determine CGST/SGST vs IGST on sales
-- (intra-state vs inter-state) by comparing to the customer's state.

alter table public.company_settings add column state text;
