# Skye ERP - Development Log

Internal progress/context log for continuing this build across sessions. Not user-facing (see `USER_GUIDE.md` for that). Update this after every phase or significant milestone.

## Project identity

- Repo: https://github.com/skyeautomotives/ERP (branch `main`)
- Local path: `D:\Skye ERP`
- Supabase project: ref `yvvquzofuqkhwbmbqhcs`, region ap-south-1 (Mumbai), org "skyeautomotives's Org"
- Supabase project URL: `https://yvvquzofuqkhwbmbqhcs.supabase.co`
- Stack: Next.js (App Router, Turbopack) + TypeScript + Tailwind v4 + Supabase (Postgres/Auth/Storage), installable PWA. Single codebase for web + mobile-responsive use, no separate native app.
- Admin login: `vjoelvarghese@gmail.com` (the user, Joel Varghese)
- Master spec: a 60-section requirements doc the user pasted at project start (referenced throughout as "the spec" / "section N"). Phase order for the build is spec section 57.

## Phase status (spec section 57 order)

- [x] **Phase 1** - Auth, RBAC, company setup, PWA shell. Shipped 2026-08-17.
- [x] **Phase 2** - Customer/Supplier/Product/Route masters. Shipped 2026-08-17.
- [x] **Phase 3** - Sales (credit, cash, sales orders). Shipped 2026-08-17.
- [x] **Dark mode** - real `dark:` Tailwind support added across the whole app (not a spec phase, but a full pass). Shipped 2026-08-17.
- [ ] **Phase 4** - Purchase + Purchase Verification. **IN PROGRESS** (see below).
- [ ] Phase 5 - Inventory
- [ ] Phase 6 - Cash/Bank Receipts + Cash/Bank Payments + Expenses
- [ ] Phase 7 - Accounting + Ledgers + Trial Balance + P&L + Balance Sheet
- [ ] Phase 8 - GST
- [ ] Phase 9 - Staff + Sales Performance + Collection Performance
- [ ] Phase 10 - Incentive Engine
- [ ] Phase 11 - Dashboard + Analytics
- [ ] Phase 12 - Mobile Application (likely mostly covered already since the app is responsive/PWA - revisit what's actually missing when we get there)
- [ ] Phase 13 - Realtime Sync + Offline Queue
- [ ] Phase 14 - Security Audit + Testing + Performance Optimization

User said (2026-08-17): "continue with the rest of the phases" - blanket approval to keep going through all remaining phases without stopping to ask between each. Still using EnterPlanMode per phase (has caught real design decisions every time), just not pausing for a go-ahead between phases.

## Phase 4 (Purchase + Purchase Verification) - current state

Plan file: `C:\Users\vjoel\.claude\plans\federated-popping-engelbart.md` (gets overwritten each phase - this log is the durable record, that file is scratch).

**Done:**
- Migrations pushed: `20260817300001_purchase_prep.sql` (company_settings purchase numbering cols + products.last_purchase_rate/last_purchase_date), `20260817300002_purchase_invoices.sql`, `20260817300003_purchase_verifications.sql`, `20260817300004_purchase_rpcs.sql` (create_purchase_invoice, cancel_purchase_invoice, record_purchase_verification).
- `database.types.ts` regenerated.
- Nav updated (`src/app/(app)/layout.tsx`): "purchase" added to BUILT_MODULES + SUB_LINKS (Purchase Entry, Bill Verification real; Purchase Return, Purchase Reports coming-soon).
- Settings > Company form/action: added `purchase_ref_prefix` field.
- Refactored `LineItemRow` (product/qty/rate/discount picker) from `sales/line-item-row.tsx` to `src/components/line-item-row.tsx` for cross-module reuse (sales + purchase both need it) - renamed its `selling_rate` field to generic `default_rate`. Updated all 3 sales pages that feed it (`sales/credit/new`, `sales/cash/new`, `sales/orders/new`) to alias `default_rate:selling_rate` in their `.select()`.
- Refactored `CancelInvoiceButton` the same way: moved `sales/cancel-invoice-button.tsx` -> `src/components/cancel-invoice-button.tsx`, now takes an `action` prop instead of being hardcoded to `cancelSalesInvoice`. Updated `sales/[id]/page.tsx` to pass `action={cancelSalesInvoice}`.
- Built: `purchase/entries/actions.ts` (createPurchaseInvoice, cancelPurchaseInvoice, recordPurchaseVerification), `purchase/entries/purchase-invoice-form.tsx`, `purchase/entries/new/page.tsx`, `purchase/entries/page.tsx` (list), `purchase/entries/verification-panel.tsx`, `purchase/entries/[id]/page.tsx` (detail + verification + cancel).

**Still to do for Phase 4:**
- `purchase/page.tsx` (redirect to `/purchase/entries`, same pattern as `sales/page.tsx`).
- `purchase/verification/page.tsx` (the verification *queue* - list of all purchase invoices with status/difference at a glance, filterable, linking into each invoice's detail page). This is the dedicated nav item per spec section 17; the panel on the invoice detail page is where verification is actually *recorded*, this page is for *finding* what needs it.
- `npm run build` to catch type errors (expect some - haven't built since the refactors above).
- Restart dev server fresh (avoid the stale-Server-Action bug - see Gotchas below) and run a full Playwright verification pass per the plan file's Verification section: create purchase, confirm ref number/GST/stock/last_purchase_rate; duplicate supplier-invoice-number block + override flow; verification status logic (matched/partial/mismatch); cancel + stock reversal.
- Clean up test data afterward (checked individually, correct FK order - see Gotchas).
- Add Phase 4 section to `docs/USER_GUIDE.md`.
- Commit + push.
- Update the `project_erp_overview` memory file with Phase 4 completion.

## Established architecture / conventions (apply to every future phase)

- **RBAC**: `public.has_permission(module_key, action)` and `public.is_admin()` Postgres functions (Phase 1). Module keys currently seeded: dashboard, sales, purchase, inventory, accounts, gst, staff, reports, masters, settings - each with view/create/edit/delete/export actions. `src/lib/auth/permissions.ts` has the client-side `can(user, module, action)` mirror and `getCurrentUser()`.
- **Audit trail**: `public.log_audit()` trigger (Phase 1), attach to any new table's insert/update. Table `audit_logs`, viewable via `RecordHistory` component (`src/components/record-history.tsx`) filtered by table_name+record_id.
- **Money-critical writes go through RPCs, not direct table access**: any table involving invoice numbering, GST calculation, or stock movement (sales_invoices, purchase_invoices, stock_transactions) has **no insert/update policy for `authenticated`** - only a `security definer` RPC can write, so the atomic numbering/GST/stock logic can never be bypassed by a direct client call. Plain master-data tables (customers, products, sales_orders, etc.) use normal has_permission-gated CRUD policies instead.
- **Invoice numbering pattern**: atomic via `UPDATE company_settings SET next_X_number = next_X_number + 1 WHERE id = (select id from company_settings limit 1) RETURNING ... INTO ...` in one statement - the WHERE clause is mandatory (see Gotchas) and doing the increment+read as one UPDATE (not SELECT then UPDATE) is what makes it race-safe.
- **Deletion policy**: nothing gets hard-deleted. Every transactional entity has a **Cancel** action instead (reverses stock, marks status='cancelled'), matching spec section 48. Master data uses `is_active` deactivate/reactivate toggle instead of delete.
- **Stock**: single ledger table `stock_transactions` (product_id, quantity_change signed, transaction_type, reference_table, reference_id) introduced in Phase 3 ahead of the "official" Inventory phase (5) because Sales needed it to be real. Current stock for a product = `opening_qty + sum(quantity_change)`. Phase 5 should build reporting on top of this, not redefine it.
- **GST split**: CGST+SGST vs IGST determined by comparing `company_settings.state` to the counterparty's (customer or supplier) `state` field - same-state = CGST/SGST split in half, different = IGST. Company state must be set on Settings > Company for this to work correctly (it's blank by default/after test cleanup - remind the user to set their real state before real billing).
- **Dark mode**: every new component must include `dark:` Tailwind variants. Established color recipe (light -> dark): `bg-white`->`dark:bg-gray-900`, `bg-gray-50`->`dark:bg-gray-950`, `bg-gray-100`->`dark:bg-gray-800`, `border-gray-200`->`dark:border-gray-800`, `border-gray-300`->`dark:border-gray-700`, `text-gray-900`->`dark:text-gray-100`, `text-gray-700`->`dark:text-gray-300`, `text-gray-500`/`600`->`dark:text-gray-400`, `text-gray-400`->`dark:text-gray-500`, `text-blue-600`->`dark:text-blue-400`, status badges use `bg-{color}-50 dark:bg-{color}-950/40 text-{color}-700 dark:text-{color}-400`. `color-scheme: light dark` is set in `globals.css` root.
- **Forms**: every text input/textarea gets `autoComplete="off"` (password fields creating a new user get `"new-password"`) - browsers were offering irrelevant autofill suggestions on business-data fields otherwise.
- **Shared components** (`src/components/`): `SearchInput`, `Pagination`, `StatusBadge`, `DeactivateButton`, `RecordHistory`, `RouteFilter`, `LineItemRow` (+ `ProductOption`/`LineItem` types), `CancelInvoiceButton`. Reach for these before writing a new one-off.
- **List pages**: server component, `.range()` pagination (`PAGE_SIZE = 20`), `ilike` search via the shared `SearchInput` (writes `?q=` to the URL), reuse `Pagination`.
- **Create/edit forms**: dedicated `/new` page + a shared form component parameterized where the create/edit flows are near-identical (e.g. one `SalesInvoiceForm` for both credit and cash). Multi-line-item forms (invoices/orders) are client components with local array state, not raw `<form action>` FormData, because the data is structured/nested.
- **Company info**: `company_settings` is a true singleton (unique index on `(true)`), always UPDATE never INSERT from the app.

## Gotchas (hit these once already - don't repeat)

1. **Supabase's managed Postgres rejects any `UPDATE`/`DELETE` with no `WHERE` clause** - even inside a `security definer` plpgsql function, even via the REST API. Error: "UPDATE/DELETE requires a WHERE clause". Always add one (`where id = (select id from x limit 1)` for a singleton table; `?id=not.is.null` for ad-hoc REST cleanup queries).
2. **Stale Next.js dev server Server Action manifest**: after many hot-reloads across a long dev session, clicking a form's submit button can silently invoke the *wrong* server action (observed: a "Save" button on a brand-new page triggered `logout()` from an unrelated file). Symptom: form submit redirects to `/login` for no reason. Fix: fully kill and restart `npm run dev` (`Get-NetTCPConnection -LocalPort 3000` -> `Stop-Process`, then relaunch) before any serious Playwright verification pass, not just rely on Fast Refresh.
3. **FK-dependency order matters when cleaning up test data via the REST API**, and don't assume a DELETE call succeeded just because the script didn't visibly error - check each response. `sales_orders.converted_invoice_id` references `sales_invoices`, so orders must be deleted *before* invoices (backwards from the child-items-first order you'd expect). A 409 on one table silently leaves rows that then block deletes on what looks like an unrelated table later in the script. Always re-query counts after a cleanup pass to confirm zero, don't trust the script's own success message.
4. **Playwright selector ambiguity**: the sidebar's persistent "Sign out" button is also `button[type="submit"]` and appears on every page - a bare `page.click('button[type="submit"]')` on an authenticated page can hit the wrong button (DOM order puts the sidebar first). Scope selectors to `main button[type="submit"]`, or better, give form fields explicit `name` attributes and target those.
5. **Browsers apply native dark-mode styling to form controls independent of the page's own CSS** unless the page sets `color-scheme` - this is what caused the original "unreadable input text" bug reported by the user (looked like a CSS bug, was actually a missing `color-scheme` declaration plus zero `dark:` variants anywhere in the app).
6. **Supabase-js RPC arg types are stricter than the actual DB function** when a plpgsql function parameter has no SQL `DEFAULT` - generated `Args` types mark nullable-in-practice params as required non-null strings. Cast the call's argument object to `Database["public"]["Functions"]["fn_name"]["Args"]` (or `as unknown as ...` when a literal `null` is involved and TS complains about "insufficient overlap").
7. **create-next-app scaffolds a `.claude/` dir with local session settings** - gitignored, not committed. Also Next.js 16 deprecated the `middleware.ts` convention in favor of `proxy.ts` (rename the file, rename the exported function from `middleware` to `proxy`, functionally identical) - already done, just don't reintroduce a `middleware.ts`.

## Tokens / access (for reference, already used this session - handle carefully, don't display back to the user again)

- Supabase access token, GitHub auth (via `gh` CLI device flow, already authenticated as `skyeautomotives` on this machine), and the DB password are stashed in the session scratchpad directory, not in this repo. If a fresh session needs them and they're not in the scratchpad anymore, ask the user rather than guessing.
- Migrations are pushed via `npx supabase db push --linked --password <pw> --yes` with `SUPABASE_ACCESS_TOKEN` env var set inline per-command (PowerShell doesn't persist env vars across tool calls).

## Notes for whoever (or whatever session) picks this up

- Read this file first, then `git log --oneline` for the real commit history, then the current plan file if one exists.
- Follow the phase order in spec section 57 unless the user redirects.
- Keep `docs/USER_GUIDE.md` updated at the end of every phase (user explicitly asked for this, separate from this log).
- No em dashes anywhere (chat, code, commits, docs) - standing user rule, use a plain hyphen.
- User is a beginner to app development - keep explanations plain, don't assume CLI/tooling familiarity in chat responses (this log itself can be as technical as needed, it's not user-facing).
