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

---

*More sections will be added here as each phase of the build ships (Purchase, Inventory, Accounts, GST, Staff & Incentives, Dashboard, and Mobile).*
