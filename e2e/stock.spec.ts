import { test, expect } from "@playwright/test";
import { dbClient, tag, safely, findOrCreate, todayISO } from "./helpers";

// Covers spec section 58's Stock checklist: purchase increases stock, sale
// decreases stock, return updates stock, adjustment works - plus a combined
// end-to-end arithmetic-chain sanity check. Every assertion is a `current_qty`
// delta on `product_stock_levels` (see helpers.ts / sales.spec.ts for why: it
// catches a wrong multiplier that a "total looks plausible" check would miss).
// Tagged master data is created once (findOrCreate) and reused across runs;
// transactional records are cleaned up via the app's real cancel_* RPCs, never
// hard-deleted - matching sales.spec.ts's convention. Stock adjustments have no
// cancel/reverse RPC (see supabase/migrations/20260817400002_stock_adjustments.sql),
// so those are deliberately left behind as real audit-trail records.

const SUPPLIER_NAME = tag("Stock Supplier");
const CUSTOMER_NAME = tag("Stock Customer");
const PRODUCT_CODE = tag("Stock SKU1");
const CHAIN_PRODUCT_CODE = tag("Stock Chain SKU");

let supplierId: string;
let customerId: string;
let staffId: string;
let productId: string;
let chainProductId: string;
const createdPurchaseInvoiceIds: string[] = [];
const createdSalesInvoiceIds: string[] = [];
const createdCreditNoteIds: string[] = [];

async function currentQty(db: Awaited<ReturnType<typeof dbClient>>, product_id: string): Promise<number> {
  const { data, error } = await db.from("product_stock_levels").select("current_qty").eq("product_id", product_id).single();
  if (error) throw error;
  return Number(data!.current_qty);
}

test.beforeAll(async () => {
  const db = await dbClient();

  const { data: me } = await db.auth.getUser();
  staffId = me.user!.id;

  supplierId = await findOrCreate(db, "suppliers", "name", SUPPLIER_NAME, {
    name: SUPPLIER_NAME,
    state: "Kerala",
    credit_period_days: 30,
  });

  customerId = await findOrCreate(db, "customers", "name", CUSTOMER_NAME, {
    name: CUSTOMER_NAME,
    state: "Kerala",
    district: "Ernakulam",
    credit_limit: 100000,
    credit_period_days: 30,
  });

  productId = await findOrCreate(db, "products", "code", PRODUCT_CODE, {
    code: PRODUCT_CODE,
    name: tag("Stock Test Product"),
    unit: "pcs",
    mrp: 200,
    purchase_rate: 100,
    selling_rate: 150,
    landing_cost: 100,
    gst_percent: 18,
    opening_qty: 1000,
    min_stock_level: 0,
    max_stock_level: 10000,
  });

  chainProductId = await findOrCreate(db, "products", "code", CHAIN_PRODUCT_CODE, {
    code: CHAIN_PRODUCT_CODE,
    name: tag("Stock Chain Product"),
    unit: "pcs",
    mrp: 200,
    purchase_rate: 100,
    selling_rate: 150,
    landing_cost: 100,
    gst_percent: 18,
    opening_qty: 500,
    min_stock_level: 0,
    max_stock_level: 10000,
  });
});

test.afterAll(async () => {
  // Transactional records this file created are cancelled (the app's real
  // "undo"), never deleted. The tagged supplier/customer/products stay active
  // and get reused by the next run via findOrCreate above.
  const db = await dbClient();
  for (const id of createdCreditNoteIds) {
    await safely(() => db.rpc("cancel_credit_note", { p_credit_note_id: id }));
  }
  for (const id of createdSalesInvoiceIds) {
    await safely(() => db.rpc("cancel_sales_invoice", { p_invoice_id: id }));
  }
  for (const id of createdPurchaseInvoiceIds) {
    await safely(() => db.rpc("cancel_purchase_invoice", { p_invoice_id: id }));
  }
  // No cleanup for stock_adjustments - there is no cancel/reverse RPC for them
  // (by design: a stock adjustment is itself the correction record, and
  // money/stock-critical tables never allow direct deletes). The small test
  // adjustments below are real, deliberate, tagged records left on a
  // test-only product.
});

test("purchase increases stock by exactly the purchased quantity", async () => {
  const db = await dbClient();
  const before = await currentQty(db, productId);

  const { data: invoiceId, error } = await db.rpc("create_purchase_invoice", {
    p_supplier_id: supplierId,
    p_supplier_invoice_number: tag(`PUR-${Date.now()}`),
    p_supplier_invoice_date: todayISO(),
    p_notes: tag("purchase increases stock"),
    p_items: [{ product_id: productId, quantity: 20, rate: 100, discount_percent: 0 }],
    p_override_duplicate: false,
  });
  if (error) throw error;
  createdPurchaseInvoiceIds.push(invoiceId);

  const after = await currentQty(db, productId);
  expect(after).toBe(before + 20);
});

test("sale decreases stock by exactly the sold quantity", async () => {
  const db = await dbClient();
  const before = await currentQty(db, productId);

  const { data: invoiceId, error } = await db.rpc("create_sales_invoice", {
    p_sale_type: "credit",
    p_customer_id: customerId,
    p_cash_customer_name: null,
    p_cash_customer_phone: null,
    p_route_id: null,
    p_staff_id: staffId,
    p_credit_period_days: 30,
    p_notes: tag("sale decreases stock"),
    p_items: [{ product_id: productId, quantity: 8, rate: 150, discount_percent: 0 }],
  });
  if (error) throw error;
  createdSalesInvoiceIds.push(invoiceId);

  const after = await currentQty(db, productId);
  expect(after).toBe(before - 8);
});

test("sales return increases stock back by exactly the returned quantity", async ({ page }) => {
  const db = await dbClient();
  const beforeSale = await currentQty(db, productId);

  const { data: invoiceId, error: invErr } = await db.rpc("create_sales_invoice", {
    p_sale_type: "credit",
    p_customer_id: customerId,
    p_cash_customer_name: null,
    p_cash_customer_phone: null,
    p_route_id: null,
    p_staff_id: staffId,
    p_credit_period_days: 30,
    p_notes: tag("return test"),
    p_items: [{ product_id: productId, quantity: 6, rate: 150, discount_percent: 0 }],
  });
  if (invErr) throw invErr;
  createdSalesInvoiceIds.push(invoiceId);

  const afterSale = await currentQty(db, productId);
  expect(afterSale).toBe(beforeSale - 6);

  await page.goto(`/sales/returns/new?invoiceId=${invoiceId}`);
  await page.locator('input[type="number"]').first().fill("3");
  await page.fill("textarea", tag("stock return test"));
  await page.getByRole("button", { name: /create credit note/i }).click();
  await page.waitForURL(/\/sales\/returns\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  const creditNoteId = page.url().split("/").pop()!;
  createdCreditNoteIds.push(creditNoteId);

  const afterReturn = await currentQty(db, productId);
  expect(afterReturn).toBe(afterSale + 3);
});

test("stock adjustment moves current_qty by exactly the signed quantity change, both directions", async () => {
  const db = await dbClient();

  const before1 = await currentQty(db, productId);
  const { error: incErr } = await db.rpc("create_stock_adjustment", {
    p_product_id: productId,
    p_quantity_change: 15,
    p_reason: tag("positive adjustment"),
    p_notes: tag("stock.spec.ts rpc test"),
  });
  if (incErr) throw incErr;
  const after1 = await currentQty(db, productId);
  expect(after1).toBe(before1 + 15);

  const { error: decErr } = await db.rpc("create_stock_adjustment", {
    p_product_id: productId,
    p_quantity_change: -4,
    p_reason: tag("negative adjustment"),
    p_notes: tag("stock.spec.ts rpc test"),
  });
  if (decErr) throw decErr;
  const after2 = await currentQty(db, productId);
  expect(after2).toBe(after1 - 4);
});

test("stock adjustment via the UI form updates current_qty end-to-end", async ({ page }) => {
  const db = await dbClient();
  const before = await currentQty(db, productId);

  await page.goto("/inventory/adjustments");
  await page.selectOption('select[name="product_id"]', productId);
  await page.selectOption('select[name="direction"]', "increase");
  await page.fill('input[name="quantity"]', "7");
  await page.fill('input[name="reason"]', tag("UI adjustment test"));
  await page.getByRole("button", { name: /record adjustment/i }).click();
  await expect(page.getByText("Adjustment recorded.")).toBeVisible({ timeout: 10_000 });

  const after = await currentQty(db, productId);
  expect(after).toBe(before + 7);
});

test("full stock lifecycle: purchase -> sale -> return -> adjustment matches arithmetic exactly", async ({ page }) => {
  const db = await dbClient();

  // "before" here plays the role of the checklist's opening_qty: findOrCreate
  // reuses this tagged product across runs, so the literal opening_qty column
  // is only accurate on the very first run - the current_qty snapshot taken
  // right before this test's own chain of operations is the correct baseline
  // on every run.
  const before = await currentQty(db, chainProductId);

  const X = 30; // purchase qty
  const Y = 12; // sale qty
  const Z = 5; // return qty
  const W = -3; // adjustment (a negative correction)

  const { data: purchaseId, error: pErr } = await db.rpc("create_purchase_invoice", {
    p_supplier_id: supplierId,
    p_supplier_invoice_number: tag(`CHAIN-${Date.now()}`),
    p_supplier_invoice_date: todayISO(),
    p_notes: tag("chain purchase"),
    p_items: [{ product_id: chainProductId, quantity: X, rate: 100, discount_percent: 0 }],
    p_override_duplicate: false,
  });
  if (pErr) throw pErr;
  createdPurchaseInvoiceIds.push(purchaseId);
  expect(await currentQty(db, chainProductId)).toBe(before + X);

  const { data: saleInvoiceId, error: sErr } = await db.rpc("create_sales_invoice", {
    p_sale_type: "credit",
    p_customer_id: customerId,
    p_cash_customer_name: null,
    p_cash_customer_phone: null,
    p_route_id: null,
    p_staff_id: staffId,
    p_credit_period_days: 30,
    p_notes: tag("chain sale"),
    p_items: [{ product_id: chainProductId, quantity: Y, rate: 150, discount_percent: 0 }],
  });
  if (sErr) throw sErr;
  createdSalesInvoiceIds.push(saleInvoiceId);
  expect(await currentQty(db, chainProductId)).toBe(before + X - Y);

  await page.goto(`/sales/returns/new?invoiceId=${saleInvoiceId}`);
  await page.locator('input[type="number"]').first().fill(String(Z));
  await page.fill("textarea", tag("chain return"));
  await page.getByRole("button", { name: /create credit note/i }).click();
  await page.waitForURL(/\/sales\/returns\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  const creditNoteId = page.url().split("/").pop()!;
  createdCreditNoteIds.push(creditNoteId);
  expect(await currentQty(db, chainProductId)).toBe(before + X - Y + Z);

  const { error: aErr } = await db.rpc("create_stock_adjustment", {
    p_product_id: chainProductId,
    p_quantity_change: W,
    p_reason: tag("chain adjustment"),
    p_notes: tag("chain test"),
  });
  if (aErr) throw aErr;

  const final = await currentQty(db, chainProductId);
  expect(final).toBe(before + X - Y + Z + W);
});
