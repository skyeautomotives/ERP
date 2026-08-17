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
- [x] **Phase 4** - Purchase + Purchase Verification. Shipped and verified end-to-end 2026-08-17.
- [x] **Phase 5** - Inventory. Shipped and verified end-to-end 2026-08-17. **A cleanup-script mistake during this phase accidentally deleted one of the user's own real sales invoices (INV00001) - see Gotcha #9. Flagged to the user directly; not silently noted.**
- [ ] **Phase 6** - Cash/Bank Receipts + Cash/Bank Payments + Expenses. **NEXT UP.**
- [ ] Phase 7 - Accounting + Ledgers + Trial Balance + P&L + Balance Sheet
- [ ] Phase 8 - GST
- [ ] Phase 9 - Staff + Sales Performance + Collection Performance
- [ ] Phase 10 - Incentive Engine
- [ ] Phase 11 - Dashboard + Analytics
- [ ] Phase 12 - Mobile Application (likely mostly covered already since the app is responsive/PWA - revisit what's actually missing when we get there)
- [ ] Phase 13 - Realtime Sync + Offline Queue
- [ ] Phase 14 - Security Audit + Testing + Performance Optimization

User said (2026-08-17): "continue with the rest of the phases" - blanket approval to keep going through all remaining phases without stopping to ask between each. Still using EnterPlanMode per phase (has caught real design decisions every time), just not pausing for a go-ahead between phases.

## Phase 4 (Purchase + Purchase Verification) - COMPLETE

Plan file used: `C:\Users\vjoel\.claude\plans\federated-popping-engelbart.md` (gets overwritten each phase - this log is the durable record, that file is scratch/current-phase-only).

**What shipped:**
- Migrations: `20260817300001_purchase_prep.sql` (company_settings purchase numbering cols + products.last_purchase_rate/last_purchase_date), `20260817300002_purchase_invoices.sql`, `20260817300003_purchase_verifications.sql`, `20260817300004_purchase_rpcs.sql` (create_purchase_invoice, cancel_purchase_invoice, record_purchase_verification).
- Nav: "purchase" module live (Purchase Entry, Bill Verification real links; Purchase Return/Reports coming-soon).
- Settings > Company: added `purchase_ref_prefix` field alongside the existing sales `invoice_prefix`.
- Refactored two components for cross-module reuse (sales + purchase both need them), moved to `src/components/`: `LineItemRow` (renamed its rate-autofill field from `selling_rate` to generic `default_rate` - callers now alias `default_rate:selling_rate` or `default_rate:purchase_rate` in their `.select()`), and `CancelInvoiceButton` (now takes an `action` prop instead of being hardcoded to sales).
- Built: `purchase/page.tsx` (redirect), `purchase/entries/{actions.ts, purchase-invoice-form.tsx, page.tsx, new/page.tsx, [id]/page.tsx, verification-panel.tsx}`, `purchase/verification/page.tsx` (status queue, filterable).
- Full Playwright verification pass: intra-state purchase (CGST/SGST) correct, inter-state (IGST) correct, duplicate supplier-invoice-number blocked then override flow worked and was recorded, all three verification statuses (matched/partial/mismatch) computed correctly by the RPC (confirmed directly against the DB, not just the UI - one screenshot caught the UI mid-save and looked like a false negative, DB was actually correct), stock increased on purchase and correctly reversed on cancel, `products.last_purchase_rate` updated.
- Test data cleaned up afterward. **Found unrelated pre-existing data during cleanup** - a product "123"/"Test" and one sales invoice INV00001 that none of my scripts created, most likely the user's own manual exploration of the dev server in their browser - deliberately left alone rather than deleted (see Gotchas #8, new).
- `docs/USER_GUIDE.md` Phase 4 section added.

**Fast-follow / not done (intentionally, matches spec's Phase 4 charter exactly):** Purchase Returns, Purchase Reports - shown as "Coming soon", same as every other unbuilt screen.

## Phase 5 (Inventory) - COMPLETE, but read this before touching cleanup scripts again

**What shipped:**
- Migrations: `20260817400001_stock_view.sql` (`product_stock_levels`, a `security_invoker` view - current qty/value per product), `20260817400002_stock_adjustments.sql` (`stock_adjustments` table + `create_stock_adjustment` RPC), `20260817400003_stock_as_of.sql` (`get_stock_as_of(date)` RPC - same shape as the view, date-bounded, powers the "opening/closing stock" picker), `20260817400004_movement_analysis.sql` (`get_movement_analysis(days)` RPC - fast/slow moving ranking).
- Nav: "inventory" module live (Stock Report, Stock Adjustment, Movement Analysis - nothing marked coming-soon, section 19's whole list is covered per the plan's "fold into existing pages" design).
- Built: `inventory/page.tsx` (redirect), `inventory/stock/page.tsx` (main report: search, low-stock filter, as-of date, total value card), `inventory/stock/[productId]/page.tsx` (movement ledger with running balance), `inventory/adjustments/{actions.ts, adjustment-form.tsx, page.tsx}`, `inventory/analysis/page.tsx`.
- Caught and fixed the same Server-Component-can't-take-onChange bug as Phase 2 (the "as of date" picker) before it shipped - used a plain submit button instead of auto-submit-on-change.
- Full Playwright + direct-DB verification: opening/purchase/sale/adjustment math all correct (58 = 50 opening + 10 purchase - 5 sale + 3 adjustment, value 2900 = 58 x unit_cost 50), low-stock filter correctly included/excluded the right products, as-of-yesterday correctly excluded same-day transactions, movement analysis correctly ranked the sold product as fast-moving.

**Incident during this phase's cleanup - read Gotcha #9 below.** The cleanup script used unfiltered `sales_invoices?id=not.is.null` / `sales_invoice_items?id=not.is.null` deletes (correct in Phase 3/4 because those tables were verified empty beforehand) and this time swept up the user's own pre-existing sales invoice (INV00001, for their "Test"/123 product) along with the test rows. The product itself was not deleted, only the invoice and its stock transaction. **This was reported to the user directly in the same turn it was discovered**, not silently absorbed - if you're resuming this project and don't see that conversation, ask the user whether they still need that invoice recreated (I have no way to reconstruct its exact original contents).

**Fast-follow / not done:** "Stock Transfer" (section 19) skipped entirely - no warehouse/location concept exists anywhere in the spec's master data or what's been built; would require inventing a new master not requested elsewhere.

## In-app contextual help - IN PROGRESS, paused mid-build (user asked to continue later)

User asked (2026-08-17) for a detailed field-by-field user guide plus in-app "?" help on every screen, same cross-cutting treatment as dark mode. Plan file used: `C:\Users\vjoel\.claude\plans\federated-popping-engelbart.md` (will be overwritten by the next phase's plan - this section is the durable record).

**Design (approved):** one reusable `HelpButton` ("?" icon next to each page's `<h1>`, opens a popover) fed by centralized content in `src/lib/help-content.ts`, rather than per-field inline tooltips everywhere. Content keyed by feature slug, reused across a feature's list/new/detail pages.

**Done:**
- `src/components/help-button.tsx` - the reusable component (click-outside + Escape to close, full dark: variants). Builds clean, not yet imported anywhere.
- `src/lib/help-content.ts` - all 15 content entries written (company-settings, users, roles, customers, suppliers, products, routes, credit-sales, cash-sales, sales-orders, sales-invoice-detail, purchase-entries, purchase-verification, stock-report, stock-adjustments, movement-analysis).

**Still to do (resume here):**
- Wire `<HelpButton content={HELP_CONTENT["..."]} />` into each page next to its `<h1>` - roughly 20 files: `settings/company`, `settings/users`, `settings/roles`, `masters/{customers,suppliers,products,routes}/page.tsx` + their `new/page.tsx`, `sales/{credit,cash,orders}/page.tsx` + their `new/page.tsx`, `sales/[id]/page.tsx`, `sales/orders/[id]/page.tsx`, `purchase/entries/page.tsx` + `new/page.tsx` + `[id]/page.tsx`, `purchase/verification/page.tsx`, `inventory/stock/page.tsx`, `inventory/adjustments/page.tsx`, `inventory/analysis/page.tsx`.
- `npm run build` again after wiring, fresh dev server restart, Playwright pass per the plan's Verification section (open a handful of screens, click help icon, confirm real content shows and closes on click-outside/Escape, check both color schemes).
- Commit + push.
- This becomes a **standing convention**: every future phase's new pages should get a `HELP_CONTENT` entry + `<HelpButton>` from the start, same as `dark:` variants and `autoComplete="off"` already are.

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
8. **Not all data in the dev database is test data I created** - the user has their own login and has been exploring the live dev server directly in their browser (asked for the admin password more than once, reported a UI bug via screenshot). Before any test-data cleanup pass, check `created_at` timestamps and cross-reference against what your own scripts actually created - don't assume everything matching a loose pattern is yours to delete. When in doubt, leave it.
9. **CRITICAL, learned the hard way in Phase 5**: cleanup deletes on *transactional* tables (`sales_invoices`, `purchase_invoices`, their `_items`, `stock_transactions`, etc.) were written as blanket `?id=not.is.null` deletes - correct in Phase 3/4 because those tables were verified empty before the test run started, so "everything in the table" and "everything my script made" were the same set. In Phase 5 that assumption silently broke: the user had their own real sales invoice (INV00001, for the "Test"/123 product) sitting in `sales_invoices`, and the blanket delete wiped it along with the test rows. **Never use an unfiltered delete on a transactional table again.** Before any cleanup pass: (a) query the table's count/contents *first* and note which rows predate your test run, (b) delete only by the specific IDs your script actually created (capture them as you go), never by "delete everything in this table." This applies even when a table looked empty last time you checked - re-verify every time, don't rely on memory of a prior phase's state.

## Tokens / access (for reference, already used this session - handle carefully, don't display back to the user again)

- Supabase access token, GitHub auth (via `gh` CLI device flow, already authenticated as `skyeautomotives` on this machine), and the DB password are stashed in the session scratchpad directory, not in this repo. If a fresh session needs them and they're not in the scratchpad anymore, ask the user rather than guessing.
- Migrations are pushed via `npx supabase db push --linked --password <pw> --yes` with `SUPABASE_ACCESS_TOKEN` env var set inline per-command (PowerShell doesn't persist env vars across tool calls).

## Notes for whoever (or whatever session) picks this up

- Read this file first, then `git log --oneline` for the real commit history, then the current plan file if one exists.
- Follow the phase order in spec section 57 unless the user redirects.
- Keep `docs/USER_GUIDE.md` updated at the end of every phase (user explicitly asked for this, separate from this log).
- No em dashes anywhere (chat, code, commits, docs) - standing user rule, use a plain hyphen.
- User is a beginner to app development - keep explanations plain, don't assume CLI/tooling familiarity in chat responses (this log itself can be as technical as needed, it's not user-facing).
