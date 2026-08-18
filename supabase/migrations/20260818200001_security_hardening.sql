-- Phase 14: security audit fixes.
-- 1) The four permission-helper functions from Phase 1 (20260817000002_user_profiles.sql)
--    were never given an explicit revoke/grant, unlike every other security definer
--    function since - Postgres defaults to PUBLIC execute, so anon could call them.
--    Low real impact (they're all auth.uid()-scoped and return false/empty for an
--    unauthenticated caller) but closes the gap and matches convention.
revoke all on function public.current_role_name() from public;
grant execute on function public.current_role_name() to authenticated;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.has_permission(text, text) from public;
grant execute on function public.has_permission(text, text) to authenticated;

revoke all on function public.my_permissions() from public;
grant execute on function public.my_permissions() to authenticated;

-- 2) audit_logs coverage gap: journal_entries, stock_transactions, and
--    purchase_verifications never got the standard audit_<table> trigger every
--    other transactional header table has had since its own migration.
create trigger audit_journal_entries
after insert or update or delete on public.journal_entries
for each row execute function public.log_audit();

create trigger audit_stock_transactions
after insert or update or delete on public.stock_transactions
for each row execute function public.log_audit();

create trigger audit_purchase_verifications
after insert or update or delete on public.purchase_verifications
for each row execute function public.log_audit();
