-- Every other master-data table (routes, customers, suppliers, products)
-- already has a delete policy; expense_categories was missed. Mirrors the
-- same pattern exactly.

create policy "expense_categories_delete_permitted" on public.expense_categories
  for delete to authenticated
  using (public.is_admin() or public.has_permission('masters', 'delete'));
