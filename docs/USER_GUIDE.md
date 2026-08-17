# Skye ERP - User Guide

This guide is written for someone with no technical background. It grows with every phase of the build - new sections get added as features ship, so this is always up to date with what you can actually do in the app today.

## Getting started

The app lives at whatever web address it's deployed to (during development, that's `http://localhost:3000` on the machine running it). Open that address in your browser, on desktop or mobile - the app is designed to work on both, and can be "installed" like a mobile app from your phone's browser menu (Add to Home Screen).

Log in with the email and password an administrator gave you.

## Phase 1: Accounts, roles, and company details

### Logging in

Go to the app's web address, enter your email and password, and click **Sign in**. If your password is wrong or your account has been switched off, you'll see an error message.

### The main menu

After logging in you land on the **Dashboard**. On the left is the main menu. Modules that aren't built yet are shown greyed out with a "Coming soon" label - they're not broken, they just haven't been built in this phase of the project.

Your name and role are shown at the top of the menu. Click **Sign out** at the bottom any time to log out.

### Company Setup (Settings > Company)

This is where your business's details live - name, address, GSTIN, phone, email, bank details, invoice terms, and your logo. These details will appear on printed invoices and reports once those features are built. Only Admins (or anyone specifically given permission) can edit this; everyone else can view it.

To change the logo, use the file picker under "Logo" and click **Save changes**.

### Users (Settings > Users)

Only **Admins** can create new user accounts - there's no public sign-up, by design, since this is a private business system. To add someone:

1. Go to **Settings > Users**.
2. Click **New user**.
3. Fill in their name, email, a temporary password (tell them to change it after they log in), and pick their role.
4. Click **Create user**.

You can **Deactivate** an account at any time (e.g. someone leaves the company) - this blocks their login without deleting their history. **Activate** brings them back.

### Roles & Permissions (Settings > Roles & Permissions)

This screen controls exactly what each role is allowed to do, module by module. Click a role's name at the top to select it, then tick or untick the checkboxes for View / Create / Edit / Delete / Export on each module. Changes apply immediately - no save button needed.

The **Admin** role always has full access and can't be restricted from this screen (that's intentional, so there's always at least one way in).

The five built-in roles are: Admin, Accountant, Sales Staff, Store/Inventory Staff, and Management. Each starts with sensible default permissions, which you can adjust here any time.

## Phase 2: Customers, Suppliers, Products, Routes

The **Masters** section holds the core reference data everything else in the ERP will build on. Click **Masters** in the menu to see the four sections: Customers, Suppliers, Products, Routes.

Every list screen has a search box at the top, and most support filtering too. Lists load in pages (20 at a time) so they stay fast even with thousands of records.

### Routes

A route is a delivery/sales territory - e.g. "North Zone". To add one: **Masters > Routes > New route**. Fill in the name, area, which staff member covers it, and which days of the week it runs, then **Save**.

### Customers

**Masters > Customers > New customer**. Fill in their details - name, address, phone, GSTIN, state/district, which route they're on, credit limit and credit period, opening balance, and which staff member is assigned to them. Click **Save**.

On the customer list, you can filter by route using the dropdown next to the search box.

Every customer page has a **History** panel on the right showing every change ever made to that record and when - useful for tracking who changed a credit limit or address and when.

### Suppliers

**Masters > Suppliers > New supplier**. Same idea as customers, but for the businesses you buy from - includes their bank details for payments.

### Products

**Masters > Products > New product**. Every product needs a unique **code** (like a SKU) - the system will tell you if you try to reuse one. Fill in name, brand, group/sub-group, HSN code, unit, pack size, pricing (MRP, purchase rate, selling rate, landing cost), GST %, opening stock quantity and value, and min/max stock levels. Batch number and expiry date are optional, for products that need them.

The product page's history panel doubles as a **price history** - any time you change a rate, it's recorded there with the old and new value.

### Deactivating records

None of the masters can be permanently deleted from the app - this is intentional, so nothing important disappears by accident and so history/reports never break. Instead, use **Deactivate** on a record's page. Deactivated customers/suppliers/products/routes won't show up as options elsewhere (e.g. a deactivated route won't appear when creating a new customer), but their history is preserved. **Activate** brings a record back at any time.

## Phase 3: Sales (Credit, Cash, Sales Orders)

Before creating your first sale, set your company's **State** on **Settings > Company** - this is required to correctly split GST into CGST+SGST (same state as the customer) versus IGST (different state). Without it, GST amounts on invoices will be wrong.

### Credit Sales and Cash Sales

**Sales > Credit Sales** or **Sales > Cash Sales > New...**. Pick a customer (for cash sales, you can also leave it as a walk-in and just type a name), route, and the sales staff member. Add one or more product lines - pick a product, enter quantity, rate, and any discount %.

As soon as you pick a product for a customer who's bought it before, the screen shows **what that customer was last charged** for it - the price, date, and invoice number - so you always know the previous price before typing in today's price.

GST, totals, and (for Admin/Accountant/Management users) profit are calculated automatically. Sales Staff accounts don't see cost/profit figures, by design.

Invoice numbers are assigned automatically and never repeat, even if two people are billing at the same time.

### Sales Orders

**Sales > Sales Orders > New sales order**. Use this for a customer's order that isn't a final bill yet - same product-line entry as above, but nothing is charged and stock isn't affected until you convert it. Open a pending order and click **Convert to invoice** to turn it into a real credit sale (this is when stock actually decreases and GST/profit are calculated).

### Cancelling an invoice

Invoices are never deleted - open the invoice and click **Cancel invoice** instead. This marks it cancelled and puts the stock back, while keeping the record for your history/audit trail.

### What's not here yet

Sales Returns and Sales Reports aren't built yet (shown as "Coming soon" under Sales). "Customer outstanding" isn't a full ledger yet either - that arrives once Receipts (a later phase) exist; for now, every credit sale is simply unpaid until that phase ships.

## Phase 4: Purchase + Purchase Bill Verification

### Recording a purchase

**Purchase > Purchase Entry > New purchase**. Pick the supplier, type in the **supplier's own invoice number** (the number printed on their paper bill - this is different from "our reference number", which the system assigns automatically), the date on their invoice, then add product lines the same way as a sale.

Stock goes **up** when you save a purchase, and each product's "last purchase rate" is updated automatically, ready to show up as the default next time you buy that product.

### Duplicate invoice number protection

If you try to enter a purchase from the same supplier using an invoice number that's already been recorded, the system stops you and asks you to confirm it's genuinely a new bill (not the same paper invoice entered twice by accident). Only users with the right permission can push through that warning, and doing so is recorded.

### Bill Verification

**Purchase > Bill Verification** shows every purchase with its verification status at a glance, and lets you filter by status. Open any purchase and use the **Bill Verification** panel to type in what the supplier's paper invoice actually says (taxable value, GST, and total) - the system compares it to what was entered here and tells you:

- **Matched** - everything agrees.
- **Partially Matched** - the total is right but the GST/taxable split doesn't add up the same way (worth a second look).
- **Mismatch** - the totals don't agree at all - shows you exactly how much the difference is.
- **Pending Verification** - nobody has checked this one against the paper bill yet.

### Cancelling a purchase

Same as sales - no deleting. Open the purchase and click **Cancel invoice**; stock is put back and the record stays for history.

### What's not here yet

Purchase Returns and Purchase Reports aren't built yet (shown as "Coming soon" under Purchase).

## Phase 5: Inventory

### Stock Report

**Inventory > Stock Report** is the live picture of what you have on hand - every product's current quantity and value, calculated automatically from every purchase, sale, and adjustment recorded so far. A total value card sits at the top.

- **Search** by name or code, same as everywhere else.
- **Low stock only** shows just the products at or below the minimum stock level you set on the product record.
- **As of date** lets you see what stock looked like on any past date - useful for "what did we have at the start of the month," without needing a separate report.

Click a product to see its full **stock movement** - every purchase, sale, and adjustment that has ever affected it, in order, with a running balance.

### Stock Adjustment

**Inventory > Stock Adjustment** is for correcting stock by hand - damage, loss, or a physical recount that doesn't match the system. Pick the product, whether you're increasing or decreasing stock, the quantity, and a reason. If you make a mistake, don't try to edit or delete it - just enter another adjustment that corrects it (the same "never delete, always add a correcting entry" rule used everywhere else in the system).

### Movement Analysis

**Inventory > Movement Analysis** ranks products by how much has sold over the last 30/60/90 days - fast movers at the top, and a separate list of products with zero sales in that window, so slow stock is easy to spot.

### What's not here yet

Stock Transfer between locations isn't built - the system doesn't currently track multiple warehouses/locations at all.

## Phase 6: Cash/Bank Receipts, Cash/Bank Payments, Expenses

Before using this section, add your expense types under **Masters > Expense Categories** (e.g. Fuel, Rent, Electricity) - you'll need at least one to record an expense payment.

### Recording money coming in

**Accounts > Cash Receipt** or **Bank Receipt > New...**. Pick the customer and a mode:

- **Against bill(s)** - pick which of their outstanding invoices this payment covers, and type how much goes to each. The amounts you allocate must add up exactly to the receipt total. Overpaid by mistake? Record the extra separately as an on-account receipt rather than trying to force it onto one invoice.
- **On account** - the customer paid without saying which invoice it's for. Recorded as a general credit; matching it to a specific bill later isn't built yet.

Bank receipts also ask for the transaction/UTR reference number.

### Recording money going out

**Accounts > Cash Payment** or **Bank Payment > New...**. Pick a purpose:

- **Supplier bill payment** - same idea as receipts, allocate the amount across the supplier's outstanding purchase invoices.
- **On account** - an advance to a supplier, not yet matched to a bill.
- **Expense** - pick a category instead of a supplier. This is the only way to record an expense - there's no separate "add expense" screen, recording the payment *is* the expense entry.

### Expenses

**Accounts > Expenses** shows every expense payment ever recorded, with totals by category - it's a live report over your Cash/Bank Payment entries, not a separate list you maintain.

### Cancelling a receipt or payment

Same rule as everywhere else - no deleting. Cancelling a receipt or payment that was allocated to an invoice makes that invoice outstanding again automatically.

### What's not here yet

Customer Ledger, Supplier Ledger, and Journal aren't built yet (shown as "Coming soon" under Accounts) - full running-balance ledgers are the next phase. What exists now (outstanding balances per invoice) is exactly what those ledgers will be built on top of.

## Phase 7: Accounting, Ledgers, Trial Balance, Profit & Loss, Balance Sheet

Everything in this section works automatically - every sale, purchase, receipt, and payment you record now quietly keeps a proper set of books behind the scenes. You don't need to do anything extra; these are all read-only reports.

### Chart of Accounts (Masters > Chart of Accounts)

The fixed list of accounts (Cash, Bank, Accounts Receivable, Inventory, and so on) that every transaction posts to. This screen just shows each account's current balance - there's nothing to fill in here.

### Journal (Accounts > Journal)

A complete list of every accounting entry the system has posted, automatically, from your sales, purchases, receipts, and payments. Use the **Account** filter to see only Cash movements or only Bank movements - the quick links at the top do this for you ("Cash Book", "Bank Book"). Use the date filters (or the "Day Book" quick link) to see everything for one day.

### Customer Ledger and Supplier Ledger (Accounts > Customer Ledger / Supplier Ledger)

Pick a customer or supplier to see their entire history - every invoice and every payment, in order, with a running balance. "Billed" is money added to what they owe; "Received"/"Paid" is money that reduced it. The balance at the bottom tells you exactly where you stand with them today (or as of any past date you choose).

### Bill-wise Outstanding (Accounts > Bill-wise Outstanding)

Every unpaid invoice, across every customer or every supplier, sorted by how overdue it is. The colored bands (0-15 days, 16-30 days, and so on) make it easy to spot who to chase for payment first, or which supplier bills are due soonest.

### Trial Balance (Accounts > Trial Balance)

A technical check that the books are internally consistent - every account's total debits should equal its total credits. Pick a date and it shows you the running totals up to that point. If it ever says "Not balanced," something needs investigating (this should never normally happen, since every entry is posted automatically in matching pairs).

### Profit & Loss (Accounts > Profit & Loss)

Pick a date range (defaults to the current month) and see your total income, total expenses, and what's left over - your net profit (or loss) for that period.

### Balance Sheet (Accounts > Balance Sheet)

A snapshot, as of one date, of what the business owns (assets like Cash, Bank, Inventory, and money customers owe you), what it owes (Accounts Payable, GST Payable), and what it's worth (equity, including all profit earned to date).

### What's not here yet

There's no screen yet for adding a manual accounting adjustment that isn't tied to a sale, purchase, receipt, or payment - if that's ever needed, it's a future addition. The Chart of Accounts screen is view-only for the same reason.

## Phase 8: GST - Credit Notes, Debit Notes, and GST Reports

### Sales Return (Credit Note) and Purchase Return (Debit Note)

**Sales > Sales Return** and **Purchase > Purchase Return** now work - these are what "Sales Returns" and "Purchase Returns" turned into once GST rules came into scope, since a GST credit/debit note *is* the compliance document for a return.

To record one: click **New credit note** (or **New debit note**), pick the original invoice it's against, then for each product line enter how much you're returning. You can't return more than what's left after any earlier returns against the same line - the screen shows you exactly how much is still returnable. Enter a reason and save. Stock goes back up (credit note) or down (debit note) automatically, and the customer's/supplier's balance adjusts to match.

Credit notes can only be raised against invoices billed to a known customer - a walk-in cash sale with no customer on record can't have one (there's nowhere to attach it to).

Cancelling a credit or debit note reverses it completely, same as everywhere else - no deleting.

### GSTR-1 (Accounts... GST > GSTR-1)

Pick a date range and see your outward-supply GST return data in the two tables you need for filing: **B2B** (every invoice billed to a customer who has a GSTIN on file, listed one by one) and **B2C** (everything else, added up by GST rate). Each table has an **Export CSV** button to hand off to your accountant or GST software.

### HSN Summary (GST > HSN Summary)

Sales or purchases for a period, grouped by each product's HSN code and GST rate. Products missing an HSN code show up under "N/A" - worth fixing on the product record before filing season.

### Purchase Register (GST > Purchase Register)

Every purchase in a period with its GST breakup and the supplier's GSTIN - this is your input tax credit claim for the period.

### GST Reconciliation (GST > GST Reconciliation)

A sanity check that the GST reports above and the accounting ledger (from Phase 7) agree with each other. It should always say "Matched" - if it ever doesn't, something needs looking into before you file.

### GST Returns (GST > GST Returns)

A simple checklist for tracking each month's GSTR-1 and GSTR-3B through **Draft**, **Verified**, **Ready for filing**, and **Filed**. Add a period, then click the button to move it to the next stage as you work through it. There's a spot to note the filing reference number once you've actually filed it.

**Important: this app does not file anything with the government.** You still have to file GSTR-1/GSTR-3B yourself on the official GST portal - this screen just keeps a record of where each period stands.

### What's not here yet

Credit and debit notes aren't yet merged into a combined table inside the GSTR-1 report itself (they show up correctly in their own screens and in your account balances, just not folded into that one report yet).

## Phase 9: Staff, Sales, and Collection Performance

A new **Staff** section in the menu holds three reports for seeing how each staff member and each route is doing.

### Staff Performance (Staff > Staff Performance)

One row per staff member for the date range you pick (Today / This Week / This Month, or a custom range): how many invoices and customers they handled, total sales, how much of that was credit, how much has been collected, how much is still outstanding, sales returns, and profit (Admins/Accountants/Management only - Sales Staff accounts don't see profit anywhere in the app). The last six columns show how quickly their credit sales are getting paid off, broken into the same 0-15/16-30/31-45/46-60/61-90/90+ day bands used on Bill-wise Outstanding.

### Credit Collection Within 90 Days (Staff > Collection Report)

Every individual payment collected against a credit sale in the period, one row each - which staff member, which customer, the original invoice and its due date, when it was actually paid, how much, and how many days that took. Useful for spotting slow-paying accounts or comparing staff on collection speed.

### Route Performance (Staff > Route Performance)

Sales, collection, outstanding, customer count, and profit for each delivery route over the period, plus a second table showing the split by both route and staff (since more than one staff member can work the same route).

### A correction worth knowing about

While building this section, a real issue was found and fixed: cash sales were incorrectly being counted as "outstanding" everywhere in the app (Bill-wise Outstanding, Customer Ledger, and these new staff reports), even though a cash sale is paid in full on the spot. That's fixed now - only credit sales carry an outstanding balance. Bill-wise Outstanding was also silently showing "Nothing outstanding" at all times due to a technical query bug - that's fixed too, and it now correctly lists real outstanding invoices.

## Phase 10: Incentive Engine

Before using this section, set your **Sales incentive rate** on **Settings > Company** (defaults to 0% until you set it), and add at least one entry on **Staff > Sales Targets** if you want to see "Achievement" figures.

### Incentive Slabs (Staff > Incentive Slabs)

The rate table that decides how much incentive a collected payment earns, based on how many days after the invoice date it was actually collected - same-day ("Ready Cash") earns the most, slower collection earns less, down to nothing past 90 days. These rates aren't fixed in the code - click into any rate and **Save** to change it.

### Sales Targets (Staff > Sales Targets)

Set a monthly sales target for each staff member. Pick the staff member, month, year, and target amount, then **Set target**. Setting a new target for a month that already has one replaces it.

### Incentive Dashboard (Staff > Incentive Dashboard)

For each staff member, over the period you pick (Today / This Week / This Month, or a custom range):

- **Sales incentive** - total sales for the period times your configured sales incentive rate.
- **Collection incentive** - each payment they collected, valued at whatever slab rate matches how quickly it came in.
- **Total incentive** - the two added together.
- **Target / Achievement** - their configured monthly target, and sales as a percentage of it.
- **Collection %** - how much of their credit sales billed this period has actually been collected.
- **Average collection days**, **Outstanding generated**, **Outstanding collected**, **90+ day outstanding** - the same collection-speed picture as Staff Performance, alongside the incentive figures.

### What's not here yet

Sales incentive is a single flat rate for everyone, not a tiered structure - only collection incentive uses tiers (slabs). There's no separate approval/payout workflow; this is a live calculation, not a record you lock in for payroll.

---

*More sections will be added here as each phase of the build ships (Dashboard and Mobile).*
