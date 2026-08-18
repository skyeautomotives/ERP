export type HelpContent = {
  title: string;
  description: string;
  fields: { label: string; text: string }[];
};

export const HELP_CONTENT: Record<string, HelpContent> = {
  "company-settings": {
    title: "Company Setup",
    description:
      "Your business's own details. These appear on printed invoices and reports, and drive automatic numbering and GST calculation - so it's worth filling in fully before you start billing.",
    fields: [
      { label: "Logo", text: "Shown on printed invoices once that feature is built." },
      { label: "Company name", text: "Your business's registered/trading name." },
      { label: "GSTIN", text: "Your business's GST registration number." },
      {
        label: "State",
        text: "Required for GST to calculate correctly - sales/purchases within this state use CGST+SGST, others use IGST.",
      },
      { label: "Bank name / Account number / IFSC", text: "Shown on invoices for customers paying by bank transfer." },
      { label: "Invoice terms", text: "Free-text terms/notes printed on every sales invoice." },
      {
        label: "Sales invoice number prefix",
        text: "E.g. \"INV\" - the system appends an automatic sequential number after this (INV00001, INV00002, ...). Never repeats, even with two people billing at once.",
      },
      {
        label: "Purchase reference number prefix",
        text: "Same idea as the sales prefix, but for the \"our reference number\" the system assigns to every purchase you record.",
      },
    ],
  },
  users: {
    title: "Users",
    description:
      "Everyone who can log in. Only Admins can create accounts here - there's no public sign-up, since this is a private business system.",
    fields: [
      { label: "Full name", text: "How this person's name appears throughout the app (e.g. as \"Sales staff\" on an invoice)." },
      { label: "Email", text: "Their login email." },
      { label: "Temporary password", text: "Set by you when creating the account - tell them to change it after they first log in." },
      { label: "Role", text: "Determines what they can see and do - configured in Roles & Permissions." },
      { label: "Deactivate / Activate", text: "Deactivating blocks their login without deleting their history. You can't deactivate your own account." },
    ],
  },
  roles: {
    title: "Roles & Permissions",
    description:
      "Controls exactly what each role can see and do, module by module. Click a role at the top, then tick/untick View / Create / Edit / Delete / Export for each module - changes apply immediately.",
    fields: [
      { label: "View", text: "Can open and see this module's screens." },
      { label: "Create", text: "Can add new records (e.g. a new sale, a new customer)." },
      { label: "Edit", text: "Can change existing records, and covers \"elevated\" actions like verifying a purchase bill." },
      { label: "Delete", text: "Covers cancel/reverse-style actions (nothing is ever hard-deleted) and overriding warnings like a duplicate invoice number." },
      { label: "Export", text: "Reserved for future export/download features." },
      { label: "Admin", text: "Always has full access everywhere and can't be restricted from this screen - there's always at least one way in." },
    ],
  },
  customers: {
    title: "Customers",
    description: "Everyone you sell to on credit or regularly. Used throughout Sales for billing, routes, and credit terms.",
    fields: [
      { label: "GSTIN", text: "Their GST number, if registered. Leave blank for an unregistered/consumer customer." },
      { label: "State", text: "Compared against your company's state to decide CGST+SGST vs IGST on their invoices." },
      { label: "Route", text: "Which delivery/sales route they're on - lets you filter and report sales by route." },
      { label: "Category", text: "Free-text grouping, e.g. \"Retailer\", \"Wholesaler\" - your own naming, not a fixed list." },
      { label: "Credit limit", text: "Informational for now - shown during billing, not currently enforced as a hard stop." },
      { label: "Credit period (days)", text: "Default number of days they get to pay a credit sale - pre-fills the invoice's due date." },
      { label: "Opening balance / type", text: "What they owed (or you owed them) before you started using this system." },
      { label: "Assigned staff", text: "The salesperson responsible for this account - pre-fills on new sales to them." },
    ],
  },
  suppliers: {
    title: "Suppliers",
    description: "Everyone you buy from. Used in Purchase entry and for supplier-side GST/bank details.",
    fields: [
      { label: "GSTIN", text: "Their GST registration number." },
      { label: "State", text: "Compared against your company's state to decide CGST+SGST vs IGST on purchases from them." },
      { label: "Contact person", text: "Who to reach out to at this supplier." },
      { label: "Credit period (days)", text: "How long they typically give you to pay." },
      { label: "Opening balance / type", text: "What you owed (or they owed you) before you started using this system." },
      { label: "Bank name / Account number / IFSC", text: "Their bank details, for when you pay by transfer." },
    ],
  },
  products: {
    title: "Products",
    description: "Everything you stock and sell. The single source of truth for pricing, GST rate, and stock levels.",
    fields: [
      { label: "Product code", text: "Your own SKU/code - must be unique, the system will reject a duplicate." },
      { label: "Brand / Group / Sub-group", text: "Free-text grouping fields used for filtering and future reporting." },
      { label: "HSN code", text: "The GST classification code for this product." },
      { label: "Unit / Pack size", text: "E.g. \"PCS\" / \"Box of 12\" - descriptive only." },
      { label: "MRP", text: "Maximum retail price, for reference/printing." },
      { label: "Purchase rate", text: "Your standard/assumed buying price - pre-fills new purchase entries (updated automatically to the most recent actual purchase rate after each purchase)." },
      { label: "Selling rate", text: "Your standard selling price - pre-fills new sales, but the last price actually charged to a specific customer is shown separately when billing them." },
      { label: "Landing cost", text: "What this product really costs you including freight etc. - used for profit calculation on sales; falls back to Purchase rate if left blank." },
      { label: "GST %", text: "The tax rate applied on every sale/purchase of this product - the system splits it into CGST+SGST or IGST automatically based on state." },
      { label: "Opening quantity / value", text: "Stock on hand (and its value) before you started using this system - the starting point for all stock reports." },
      { label: "Minimum / Maximum stock level", text: "Minimum is used for the \"low stock\" flag in the Inventory Stock Report." },
      { label: "Batch number / Expiry date", text: "Optional - only fill in for products that need batch/expiry tracking." },
    ],
  },
  routes: {
    title: "Routes",
    description: "Delivery/sales territories. Assign customers to a route to filter and report sales by area.",
    fields: [
      { label: "Area", text: "Free-text description of the territory this route covers." },
      { label: "Assigned staff", text: "The salesperson who covers this route." },
      { label: "Route days", text: "Which days of the week this route runs." },
    ],
  },
  "credit-sales": {
    title: "Credit Sales",
    description: "A sale where the customer pays later, within their credit period. Creates a real invoice - stock and GST update immediately.",
    fields: [
      { label: "Customer", text: "Required for credit sales. Selecting one pre-fills their route, assigned staff, and credit period." },
      { label: "Credit period (days)", text: "How many days the customer has to pay - sets the invoice's due date. Defaults from the customer record but can be overridden." },
      { label: "Sales staff", text: "Who this sale is credited to - required on every invoice." },
      { label: "Products", text: "Pick a product, enter quantity/rate/discount %. Once you've picked both a customer and product, the screen shows the last price that customer was charged for it." },
      { label: "GST / Total", text: "Calculated automatically from each line's rate, discount, and the product's GST %." },
    ],
  },
  "cash-sales": {
    title: "Cash Sales",
    description: "A sale paid immediately. Can use a real customer record, or just a walk-in name for a one-off buyer.",
    fields: [
      { label: "Customer", text: "Optional for cash sales - leave as \"Walk-in\" and type a name/phone instead if they're not a regular customer." },
      { label: "Products", text: "Same as credit sales - pick product, quantity, rate, discount %." },
    ],
  },
  "sales-orders": {
    title: "Sales Orders",
    description: "A customer's order that isn't a final bill yet. Stock and GST aren't affected until you convert it to an invoice.",
    fields: [
      { label: "Customer", text: "Required - who the order is for." },
      { label: "Products", text: "What they want to buy, at what proposed price." },
      { label: "Convert to invoice", text: "Turns a pending order into a real credit sale - this is the moment stock actually decreases and GST/profit get calculated." },
    ],
  },
  "sales-invoice-detail": {
    title: "Invoice detail",
    description: "The finished record of a sale - what was billed, the GST breakdown, and (for Admin/Accountant/Management) profit.",
    fields: [
      { label: "CGST / SGST / IGST", text: "Same-state sales split GST into CGST+SGST; different-state sales use IGST instead." },
      { label: "Profit", text: "Selling value minus cost - only visible to Admin, Accountant, and Management accounts, not Sales Staff." },
      { label: "Cancel invoice", text: "Marks the invoice cancelled and restores the stock - invoices are never deleted, only cancelled." },
    ],
  },
  "purchase-entries": {
    title: "Purchase Entry",
    description: "Recording what you bought from a supplier. Increases stock immediately and updates that product's last purchase rate.",
    fields: [
      { label: "Supplier", text: "Who you bought from." },
      { label: "Supplier invoice number", text: "The number printed on their paper bill - not the same as \"our reference number\", which the system assigns automatically. Re-using a number already recorded for the same supplier triggers a duplicate warning." },
      { label: "Supplier invoice date", text: "The date on their invoice, not today's date." },
      { label: "Products", text: "What you bought, at what quantity and rate." },
    ],
  },
  "purchase-verification": {
    title: "Bill Verification",
    description: "Cross-checking what a supplier's paper invoice actually says against what got entered into the system, so data-entry mistakes surface instead of silently corrupting your books.",
    fields: [
      { label: "Supplier taxable value / GST / total", text: "Type in exactly what the supplier's paper invoice states for these three figures." },
      { label: "Matched", text: "All three figures agree with what's in the system." },
      { label: "Partially Matched", text: "The total agrees, but the taxable/GST split doesn't - worth a second look, often a tax miscalculation." },
      { label: "Mismatch", text: "The total doesn't agree - shows exactly how much the difference is." },
      { label: "Pending Verification", text: "Nobody has entered the supplier's figures to check against yet." },
    ],
  },
  "stock-report": {
    title: "Stock Report",
    description: "Live stock levels and value, calculated from opening stock plus every purchase, sale, and adjustment recorded since.",
    fields: [
      { label: "Qty", text: "Current quantity on hand. Shown in red if at or below the product's minimum stock level." },
      { label: "Unit cost", text: "Landing cost (or purchase rate if landing cost isn't set) - used to value the stock." },
      { label: "Value", text: "Quantity x unit cost." },
      { label: "Low stock only", text: "Filters to just the products at or below their set minimum stock level." },
      { label: "As of date", text: "Shows what stock looked like on a past date instead of right now - useful for \"what did we have at the start of the month.\"" },
    ],
  },
  "stock-adjustments": {
    title: "Stock Adjustment",
    description: "Correcting stock by hand for anything that isn't a purchase or sale - damage, loss, or a physical recount.",
    fields: [
      { label: "Direction", text: "Whether this correction increases or decreases the stock on hand." },
      { label: "Quantity", text: "Always entered as a positive number - the direction above decides whether it adds or subtracts." },
      { label: "Reason", text: "Required - a short explanation of why (e.g. \"Damaged in warehouse\")." },
      { label: "Fixing a mistake", text: "Don't edit or delete an adjustment - enter another one that offsets it, same as everywhere else in the system." },
    ],
  },
  "movement-analysis": {
    title: "Movement Analysis",
    description: "Which products are actually selling, and which are sitting still, over a recent window of time.",
    fields: [
      { label: "Window (30/60/90 days)", text: "How far back to look when counting sales." },
      { label: "Fast moving", text: "The top 10 products by quantity sold in the window." },
      { label: "Slow moving", text: "Products with zero recorded sales in the window - candidates for a closer look." },
    ],
  },
  "expense-categories": {
    title: "Expense Categories",
    description: "The categories available when recording an expense payment - e.g. Fuel, Electricity, Rent. Add as many as you need.",
    fields: [{ label: "Name", text: "Must be unique - the system will reject a duplicate category name." }],
  },
  receipts: {
    title: "Cash / Bank Receipt",
    description: "Recording money coming in from a customer. Every receipt is either matched against specific bills, or recorded as a general advance.",
    fields: [
      { label: "Mode: Against bill(s)", text: "Pick one or more of this customer's outstanding invoices and allocate how much of the receipt pays off each one. The amounts allocated must add up exactly to the receipt amount." },
      { label: "Mode: On account", text: "Use when the customer pays without specifying which invoice it's for - recorded as a general advance, not yet matched to any bill." },
      { label: "Reference / UTR number", text: "Bank receipts only - the transaction reference from the bank statement." },
      { label: "Cancel receipt", text: "Reverses the receipt - any invoices it was paying off become outstanding again." },
    ],
  },
  payments: {
    title: "Cash / Bank Payment",
    description: "Recording money going out - to a supplier, as an advance, or as a business expense.",
    fields: [
      { label: "Supplier bill payment", text: "Pick a supplier and allocate the amount across their outstanding purchase invoices - must add up exactly to the payment amount." },
      { label: "On account", text: "An advance to a supplier not yet matched to a specific bill." },
      { label: "Expense", text: "A business expense (fuel, rent, etc.) - pick a category instead of a supplier. This is what makes it show up on the Expenses screen." },
      { label: "Paid to", text: "Optional free text - who physically received the money, useful for expenses without a formal supplier record." },
      { label: "Reference / UTR number", text: "Bank payments only - the transaction reference from the bank statement." },
      { label: "Cancel payment", text: "Reverses the payment - any invoices it was paying off become outstanding again." },
    ],
  },
  expenses: {
    title: "Expenses",
    description: "Every expense payment recorded through Cash Payment or Bank Payment, in one place - there's no separate expense entry screen, recording the payment is what creates the expense record.",
    fields: [
      { label: "Category totals", text: "Sum of all active (non-cancelled) expenses, grouped by category." },
    ],
  },
  "chart-of-accounts": {
    title: "Chart of Accounts",
    description: "The accounts that every sale, purchase, receipt, payment, and adjustment automatically posts to behind the scenes - this is what makes the Trial Balance, Profit & Loss, and Balance Sheet possible without you entering anything by hand.",
    fields: [
      { label: "Balance", text: "The account's running total, cumulative up to today. Asset and expense accounts show their debit-side balance; liability, equity, and income accounts show their credit-side balance." },
    ],
  },
  journal: {
    title: "Journal",
    description: "Every accounting entry the system has posted automatically, in one filterable list. The same data doubles as a Cash Book, Bank Book, or Day Book depending on how you filter it.",
    fields: [
      { label: "Account filter", text: "Narrow the list to just one account - pick Cash for a Cash Book, Bank for a Bank Book." },
      { label: "From / To", text: "Narrow the list to a date range - set both to today for a Day Book." },
    ],
  },
  "customer-ledger": {
    title: "Customer Ledger",
    description: "One customer's complete history - every sales invoice and every receipt from them, in date order, with a running balance.",
    fields: [
      { label: "Billed", text: "Amount added to what this customer owes you (a sales invoice, or their opening balance if they had one)." },
      { label: "Received", text: "Amount that reduced what this customer owes you (a receipt)." },
      { label: "Balance", text: "Running total after each row. Positive means the customer still owes you money." },
    ],
  },
  "supplier-ledger": {
    title: "Supplier Ledger",
    description: "One supplier's complete history - every purchase and every payment to them, in date order, with a running balance.",
    fields: [
      { label: "Billed", text: "Amount added to what you owe this supplier (a purchase, or their opening balance if they had one)." },
      { label: "Paid", text: "Amount that reduced what you owe this supplier (a payment)." },
      { label: "Balance", text: "Running total after each row. Positive means you still owe the supplier money." },
    ],
  },
  outstanding: {
    title: "Bill-wise Outstanding",
    description: "Every unpaid invoice across all customers or all suppliers, sorted by how overdue it is - useful for deciding who to chase for payment, or who to pay first.",
    fields: [
      { label: "Due date", text: "Sales invoices use their own due date. Purchase invoices don't store one, so it's worked out from the supplier's invoice date plus their credit period." },
      { label: "Ageing", text: "How many days past the due date this invoice is, grouped into bands (0-15, 16-30, 31-45, 46-60, 61-90, 90+)." },
    ],
  },
  "trial-balance": {
    title: "Trial Balance",
    description: "Every account's total debits and credits, cumulative up to the date you pick. If the books are correct, the two totals always match - that's the whole point of double-entry accounting.",
    fields: [
      { label: "As of date", text: "Shows the accumulated balance of every account from the very beginning up to this date." },
    ],
  },
  "profit-and-loss": {
    title: "Profit & Loss",
    description: "Income and expenses for a period of your choosing, and what's left over after subtracting one from the other.",
    fields: [
      { label: "From / To", text: "The period this report covers - defaults to the current month." },
      { label: "Net profit", text: "Total income minus total expenses for the period. Negative means a loss." },
    ],
  },
  "balance-sheet": {
    title: "Balance Sheet",
    description: "A snapshot of what the business owns (assets), owes (liabilities), and is worth (equity) as of one date.",
    fields: [
      { label: "Current Earnings", text: "All-time income minus all-time expenses up to the date you picked - this is what keeps Assets equal to Liabilities plus Equity." },
      { label: "As of date", text: "Everything on this report is cumulative from the very beginning up to this date, not just a single period." },
    ],
  },
  "credit-notes": {
    title: "Sales Return (Credit Note)",
    description: "Recording goods a customer returned, or a price correction on a sale already billed. Reverses the exact stock, revenue, and GST from the original invoice, and reduces what the customer owes.",
    fields: [
      { label: "Sales invoice", text: "The original credit sale this return is against - you can't create a credit note without one." },
      { label: "Return qty", text: "How much of each line you're taking back. Can't exceed what's left after any earlier credit notes against the same invoice line." },
      { label: "Reason", text: "Free text - why the goods came back or the price was corrected." },
      { label: "Cancel credit note", text: "Reverses the credit note itself - stock and balances go back to how they were before it was recorded." },
    ],
  },
  "debit-notes": {
    title: "Purchase Return (Debit Note)",
    description: "Recording goods sent back to a supplier, or a price correction on a purchase already recorded. Reverses the exact stock, cost, and GST from the original purchase, and reduces what you owe the supplier.",
    fields: [
      { label: "Purchase invoice", text: "The original purchase this return is against." },
      { label: "Return qty", text: "How much of each line is going back. Can't exceed what's left after any earlier debit notes against the same purchase line." },
      { label: "Reason", text: "Free text - why the goods went back or the price was corrected." },
      { label: "Cancel debit note", text: "Reverses the debit note itself." },
    ],
  },
  gstr1: {
    title: "GSTR-1",
    description: "The two tables you need to prepare your outward-supply GST return for a period: B2B (customers with a GSTIN, listed invoice by invoice) and B2C (everyone else, summarized by GST rate).",
    fields: [
      { label: "B2B", text: "One row per invoice billed to a customer who has a GSTIN on file." },
      { label: "B2C", text: "Everything else, added up by GST rate rather than listed invoice by invoice." },
      { label: "Export CSV", text: "Download either table to hand to your accountant or GST filing software." },
    ],
  },
  "hsn-summary": {
    title: "HSN Summary",
    description: "Sales or purchases for a period, grouped by each product's HSN code and GST rate - the format GST returns need for the HSN-wise summary table.",
    fields: [
      { label: "HSN", text: "Comes from the product's own HSN code (Masters > Products). Products without one are grouped under \"N/A\" - worth fixing before filing." },
    ],
  },
  "purchase-register": {
    title: "Purchase Register",
    description: "Every purchase for a period with its GST breakup - this is your input tax credit claim for the period.",
    fields: [
      { label: "GSTIN", text: "The supplier's GST number on file. Blank means the supplier record has no GSTIN saved." },
    ],
  },
  "gst-reconciliation": {
    title: "GST Reconciliation",
    description: "A sanity check that the GST reports and the accounting ledger agree with each other for the same period - they're computed from the same underlying transactions, so they should always match.",
    fields: [
      { label: "Mismatch", text: "If this ever shows Mismatch, something is wrong and worth investigating before filing - it should not normally happen." },
    ],
  },
  "gst-returns": {
    title: "GST Returns",
    description: "A checklist for tracking each period's GSTR-1/GSTR-3B through Draft, Verified, Ready for filing, and Filed. This app does not file anything with the government - you still do the actual filing yourself on the GST portal; this is only a record of where things stand.",
    fields: [
      { label: "Reference #", text: "Optional - the acknowledgement or reference number you get after filing, for your own records." },
    ],
  },
  "staff-performance": {
    title: "Staff Performance",
    description: "Sales, collection, outstanding, and returns for every staff member over a period, plus how quickly each one's credit sales get paid off.",
    fields: [
      { label: "Credit sales", text: "Only the credit-sale portion of total sales - the part that can have an outstanding balance and needs collecting." },
      { label: "Collection", text: "Money actually received in this period against this staff member's credit sales, regardless of when the original invoice was raised." },
      { label: "0-15d ... 90+d", text: "Of the money collected in this period, how many days after the invoice date it arrived - the same ageing bands used on Bill-wise Outstanding." },
    ],
  },
  "collection-report": {
    title: "Credit Collection Within 90 Days",
    description: "One row per payment collected against a credit sale in this period, showing exactly how long it took from invoice to payment.",
    fields: [
      { label: "Days taken", text: "Payment date minus invoice date." },
      { label: "Status", text: "Which ageing band the collection falls into - green is fast, red is slow." },
    ],
  },
  "route-performance": {
    title: "Route Performance",
    description: "Sales, collection, and outstanding by delivery route over a period, plus which staff sold on each route.",
    fields: [
      { label: "Route-wise staff breakdown", text: "Since a route isn't always worked by exactly one staff member, this table shows sales split by both route and staff for the period." },
    ],
  },
  "incentive-dashboard": {
    title: "Incentive Dashboard",
    description: "How much incentive each staff member has earned for the period - from sales, from collection, and combined - alongside their target, achievement, and collection speed.",
    fields: [
      { label: "Sales incentive", text: "Total sales for the period x the sales incentive rate set on Settings > Company." },
      { label: "Collection incentive", text: "Each payment collected earns incentive at the rate for how quickly it was collected (see Incentive Slabs) - faster collection earns more." },
      { label: "Target / Achievement", text: "Target comes from Sales Targets. Achievement is sales as a percentage of target. Shows \"-\" if no target is set for the period." },
      { label: "Collection %", text: "How much of the credit sales billed this period has actually been collected." },
      { label: "90+ day outstanding", text: "How much this staff's customers currently owe on invoices more than 90 days past due - as of today, not limited to this period." },
    ],
  },
  "incentive-slabs": {
    title: "Collection Incentive Slabs",
    description: "The configurable rate table that decides how much collection incentive a payment earns, based on the actual number of days between the invoice date and the day it was collected. Admins can change the rates here at any time - nothing is hard-coded.",
    fields: [
      { label: "Days", text: "The day-range this slab covers, fixed to keep coverage from having gaps or overlaps." },
      { label: "Incentive rate", text: "The percentage applied to the amount collected in this slab. Click Save after changing a rate." },
    ],
  },
  "sales-targets": {
    title: "Sales Targets",
    description: "A monthly sales target per staff member, used by the Incentive Dashboard to show achievement against target.",
    fields: [
      { label: "Setting a target again", text: "Setting a new target for a staff member and month that already has one replaces the old value." },
    ],
  },
  dashboard: {
    title: "Dashboard",
    description: "Today's business at a glance, plus the last four weeks' trend. Every card links through to the full report behind it.",
    fields: [
      { label: "Customer / Supplier Outstanding, Stock Value, Cash / Bank Balance", text: "Current figures as of right now, not limited to today's activity." },
      { label: "Weekly graphs", text: "Monday through Sunday, with this week's bars next to the same day last week for comparison." },
      { label: "Gross Profit / Profit Percentage", text: "Only visible to Admin, Accountant, and Management roles, same as everywhere else profit appears in the app." },
    ],
  },
  "my-dashboard": {
    title: "My Workspace",
    description: "Your own personal view - your sales, your route, your assigned customers, and your recent collections. Everyone sees only their own numbers here, regardless of what else they're permitted to see elsewhere in the app.",
    fields: [
      { label: "My route", text: "Shown if a route has been assigned to you on Masters > Routes. Blank means no route is assigned yet." },
      { label: "My customers", text: "How many customers are assigned to you (Masters > Customers) - tap through to see the full list." },
    ],
  },
  "my-customers": {
    title: "My Customers",
    description: "Every customer assigned to you, with their current outstanding balance. Tap into a customer to see their full ledger - every invoice and payment, in order.",
    fields: [],
  },
  "my-collections": {
    title: "My Collections",
    description: "Every payment you've personally collected in the period you pick, with how many days it took from invoice to payment.",
    fields: [],
  },
};
