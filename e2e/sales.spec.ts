import { test, expect } from "@playwright/test";
import { dbClient, tag, safely, findOrCreate } from "./helpers";

// Covers spec section 58's Sales checklist: credit sale, cash sale, partial
// payment, full payment, sales return, last price, profit calculation.
// Tagged master data is created once and hard-deleted afterward; the invoice
// and receipts it produces are cleaned up via cancel_sales_invoice/cancel_receipt
// (the app's real "undo" - matches the "cancel, never delete" convention for
// transactional records, so this leaves cancelled-but-correct records behind,
// not orphaned data).

const CUSTOMER_NAME = tag("Sales Customer");
const PRODUCT_CODE = tag("SKU1");

let customerId: string;
let productId: string;
let staffId: string;
const createdInvoiceIds: string[] = [];
const createdReceiptIds: string[] = [];
const createdCreditNoteIds: string[] = [];

test.beforeAll(async () => {
  const db = await dbClient();

  const { data: me } = await db.auth.getUser();
  staffId = me.user!.id;

  customerId = await findOrCreate(db, "customers", "name", CUSTOMER_NAME, {
    name: CUSTOMER_NAME,
    state: "Kerala",
    district: "Ernakulam",
    credit_limit: 100000,
    credit_period_days: 30,
  });

  productId = await findOrCreate(db, "products", "code", PRODUCT_CODE, {
    code: PRODUCT_CODE,
    name: tag("Sales Test Product"),
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
});

test.afterAll(async () => {
  // Transactional records this file created are cancelled (the app's real
  // "undo"), never deleted. The tagged customer/product stay active and get
  // reused by the next run via findOrCreate above.
  const db = await dbClient();
  for (const id of createdCreditNoteIds) {
    await safely(() => db.rpc("cancel_credit_note", { p_credit_note_id: id }));
  }
  for (const id of createdReceiptIds) {
    await safely(() => db.rpc("cancel_receipt", { p_receipt_id: id }));
  }
  for (const id of createdInvoiceIds) {
    await safely(() => db.rpc("cancel_sales_invoice", { p_invoice_id: id }));
  }
});

test("credit sale creates a correctly-totalled invoice with profit", async ({ page }) => {
  await page.goto("/sales/new?type=credit");
  await page.selectOption('select[name="customer_id"]', customerId);
  await page.selectOption('select[name="staff_id"]', staffId);
  await page.locator('select[name="line_product_id"]').first().selectOption(productId);
  await page.locator('input[name="line_quantity"]').first().fill("10");
  await page.locator('input[placeholder="Rate"]').first().fill("150");

  await page.getByRole("button", { name: /create credit sale/i }).click();
  await page.waitForURL(/\/sales\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  const invoiceId = page.url().split("/").pop()!;
  createdInvoiceIds.push(invoiceId);

  // Expected: taxable 1500, GST 18% = 270, total 1770, cost 10*100=1000, profit 500
  await expect(page.getByText("1770.00").first()).toBeVisible();

  const db = await dbClient();
  const { data: invoice } = await db
    .from("sales_invoices")
    .select("total_amount, taxable_total, cgst_total, sgst_total, igst_total, profit_total, sale_type, status")
    .eq("id", invoiceId)
    .single();
  expect(invoice!.sale_type).toBe("credit");
  expect(invoice!.status).toBe("active");
  expect(Number(invoice!.total_amount)).toBe(1770);
  expect(Number(invoice!.taxable_total)).toBe(1500);
  expect(Number(invoice!.cgst_total) + Number(invoice!.sgst_total) + Number(invoice!.igst_total)).toBe(270);
  expect(Number(invoice!.profit_total)).toBe(500); // (150-100)*10
});

test("cash sale for a walk-in customer", async ({ page }) => {
  await page.goto("/sales/new?type=cash");
  await page.selectOption('select[name="staff_id"]', staffId);
  await page.fill('input[name="cash_customer_name"]', tag("Walkin"));
  await page.locator('select[name="line_product_id"]').first().selectOption(productId);
  await page.locator('input[name="line_quantity"]').first().fill("2");
  await page.locator('input[placeholder="Rate"]').first().fill("150");

  await page.getByRole("button", { name: /create cash sale/i }).click();
  await page.waitForURL(/\/sales\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  const invoiceId = page.url().split("/").pop()!;
  createdInvoiceIds.push(invoiceId);

  const db = await dbClient();
  const { data: invoice } = await db
    .from("sales_invoices")
    .select("sale_type, cash_customer_name, total_amount")
    .eq("id", invoiceId)
    .single();
  expect(invoice!.sale_type).toBe("cash");
  expect(invoice!.cash_customer_name).toBe(tag("Walkin"));
  expect(Number(invoice!.total_amount)).toBe(354); // 2*150*1.18
});

test("partial then full payment against a credit invoice via receipts", async ({ page }) => {
  const db = await dbClient();

  // A fresh invoice for this test so payment-state assertions aren't affected by other tests.
  const { data: invoiceId, error: invErr } = await db.rpc("create_sales_invoice", {
    p_sale_type: "credit",
    p_customer_id: customerId,
    p_cash_customer_name: null,
    p_cash_customer_phone: null,
    p_route_id: null,
    p_staff_id: staffId,
    p_credit_period_days: 30,
    p_notes: tag("payment test"),
    p_items: [{ product_id: productId, quantity: 4, rate: 150, discount_percent: 0 }],
  });
  if (invErr) throw invErr;
  createdInvoiceIds.push(invoiceId);
  // total = 4*150*1.18 = 708
  const { data: thisInvoice } = await db.from("sales_invoices").select("invoice_number").eq("id", invoiceId).single();
  const invoiceNumber = thisInvoice!.invoice_number;

  // The customer may have other outstanding invoices from other tests in this
  // file, so the allocation row must be targeted by this test's own invoice
  // number, not just "the first row in the table".
  await page.goto("/accounts/receipts/cash/new");
  await page.selectOption('select[name="customer_id"]', customerId);
  const row1 = page.locator("tbody tr", { hasText: invoiceNumber });
  await row1.locator('input[type="number"]').waitFor({ timeout: 10_000 });
  await page.fill('input[name="amount"]', "300");
  await row1.locator('input[type="number"]').fill("300");
  await page.getByRole("button", { name: /record cash receipt/i }).click();
  await page.waitForURL(/\/accounts\/receipts\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  const receipt1Id = page.url().split("/").pop()!;
  createdReceiptIds.push(receipt1Id);

  const { data: afterPartial } = await db
    .from("sales_invoice_outstanding")
    .select("outstanding_amount")
    .eq("invoice_id", invoiceId)
    .single();
  expect(Number(afterPartial!.outstanding_amount)).toBe(408); // 708 - 300

  await page.goto("/accounts/receipts/cash/new");
  await page.selectOption('select[name="customer_id"]', customerId);
  const row2 = page.locator("tbody tr", { hasText: invoiceNumber });
  await row2.locator('input[type="number"]').waitFor({ timeout: 10_000 });
  await page.fill('input[name="amount"]', "408");
  await row2.locator('input[type="number"]').fill("408");
  await page.getByRole("button", { name: /record cash receipt/i }).click();
  await page.waitForURL(/\/accounts\/receipts\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  const receipt2Id = page.url().split("/").pop()!;
  createdReceiptIds.push(receipt2Id);

  const { data: afterFull } = await db
    .from("sales_invoice_outstanding")
    .select("outstanding_amount")
    .eq("invoice_id", invoiceId)
    .single();
  expect(Number(afterFull!.outstanding_amount)).toBe(0);
});

test("sales return (credit note) reduces outstanding and reverses stock/GST", async ({ page }) => {
  const db = await dbClient();

  const { data: stockBefore } = await db
    .from("product_stock_levels")
    .select("current_qty")
    .eq("product_id", productId)
    .single();

  const { data: invoiceId, error: invErr } = await db.rpc("create_sales_invoice", {
    p_sale_type: "credit",
    p_customer_id: customerId,
    p_cash_customer_name: null,
    p_cash_customer_phone: null,
    p_route_id: null,
    p_staff_id: staffId,
    p_credit_period_days: 30,
    p_notes: tag("return test"),
    p_items: [{ product_id: productId, quantity: 5, rate: 150, discount_percent: 0 }],
  });
  if (invErr) throw invErr;
  createdInvoiceIds.push(invoiceId);

  await page.goto(`/sales/returns/new?invoiceId=${invoiceId}`);
  await page.locator('input[type="number"]').first().fill("2");
  await page.fill("textarea", tag("damaged goods"));
  await page.getByRole("button", { name: /create credit note/i }).click();
  await page.waitForURL(/\/sales\/returns\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  const creditNoteId = page.url().split("/").pop()!;
  createdCreditNoteIds.push(creditNoteId);

  const { data: stockAfter } = await db
    .from("product_stock_levels")
    .select("current_qty")
    .eq("product_id", productId)
    .single();
  expect(Number(stockAfter!.current_qty)).toBe(Number(stockBefore!.current_qty) - 5 + 2); // -5 for the sale, +2 for the return

  const { data: outstanding } = await db
    .from("sales_invoice_outstanding")
    .select("outstanding_amount")
    .eq("invoice_id", invoiceId)
    .single();
  // original 5*150*1.18=885, returned 2*150*1.18=354, outstanding should drop by the return
  expect(Number(outstanding!.outstanding_amount)).toBe(885 - 354);
});

test("last price shows the previous sale of this product to this customer", async ({ page }) => {
  const db = await dbClient();
  const { data: invoiceId, error: invErr } = await db.rpc("create_sales_invoice", {
    p_sale_type: "credit",
    p_customer_id: customerId,
    p_cash_customer_name: null,
    p_cash_customer_phone: null,
    p_route_id: null,
    p_staff_id: staffId,
    p_credit_period_days: 30,
    p_notes: tag("last price seed"),
    p_items: [{ product_id: productId, quantity: 1, rate: 175, discount_percent: 5 }],
  });
  if (invErr) throw invErr;
  createdInvoiceIds.push(invoiceId);

  await page.goto("/sales/new?type=credit");
  await page.selectOption('select[name="customer_id"]', customerId);
  await page.selectOption('select[name="line_product_id"]', productId);

  await expect(page.getByText(/Last sold to this customer: Rs\.175/)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/5% off/)).toBeVisible();
});

test("a brand-new customer can be created inline from Sales Entry and used in the same submission", async ({ page }) => {
  const db = await dbClient();
  const newName = tag(`Inline Customer ${Date.now()}`);

  await page.goto("/sales/new?type=credit");
  await page.selectOption('select[name="staff_id"]', staffId);

  await page.getByRole("button", { name: "+ New", exact: true }).click();
  await page.fill('label:has-text("Customer name") + input', newName);
  await page.getByRole("button", { name: "Create", exact: true }).click();

  // The new customer should now be selected on the form automatically.
  await expect(page.locator('select[name="customer_id"]')).not.toHaveValue("", { timeout: 10_000 });

  // Picking a product on the last line auto-adds a fresh empty line right
  // after, so target the first (filled-in) row's inputs explicitly.
  await page.locator('select[name="line_product_id"]').first().selectOption(productId);
  await page.locator('input[name="line_quantity"]').first().fill("1");
  await page.locator('input[placeholder="Rate"]').first().fill("150");
  await page.getByRole("button", { name: /create credit sale/i }).click();
  await page.waitForURL(/\/sales\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  const invoiceId = page.url().split("/").pop()!;
  createdInvoiceIds.push(invoiceId);

  const { data: customer } = await db.from("customers").select("id").eq("name", newName).single();
  expect(customer).not.toBeNull();

  const { data: invoice } = await db.from("sales_invoices").select("customer_id").eq("id", invoiceId).single();
  expect(invoice!.customer_id).toBe(customer!.id);
});
