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
};
