import { test, expect } from "@playwright/test";
import { dbClient, tag, safely, findOrCreate, todayISO } from "./helpers";

// Covers spec section 58's Purchase checklist: credit purchase, duplicate
// supplier invoice, purchase return, bill mismatch.
// Tagged master data is created once (or reused across runs via findOrCreate)
// and never hard-deleted; the invoices/debit notes this file produces are
// cleaned up via cancel_purchase_invoice/cancel_debit_note (the app's real
// "undo" - "cancel, never delete" for transactional records).

const SUPPLIER_NAME = tag("Purchase Supplier");
const PRODUCT_CODE = tag("Purchase SKU1");

let supplierId: string;
let productId: string;
const createdInvoiceIds: string[] = [];
const createdDebitNoteIds: string[] = [];

test.beforeAll(async () => {
  const db = await dbClient();

  supplierId = await findOrCreate(db, "suppliers", "name", SUPPLIER_NAME, {
    name: SUPPLIER_NAME,
    state: "Kerala",
    credit_period_days: 30,
  });

  productId = await findOrCreate(db, "products", "code", PRODUCT_CODE, {
    code: PRODUCT_CODE,
    name: tag("Purchase Test Product"),
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
  // "undo"), never deleted. The tagged supplier/product stay active and get
  // reused by the next run via findOrCreate above.
  const db = await dbClient();
  for (const id of createdDebitNoteIds) {
    await safely(() => db.rpc("cancel_debit_note", { p_debit_note_id: id }));
  }
  for (const id of createdInvoiceIds) {
    await safely(() => db.rpc("cancel_purchase_invoice", { p_invoice_id: id }));
  }
});

test("credit purchase creates a correctly-totalled invoice and increases stock", async ({ page }) => {
  const db = await dbClient();

  const { data: stockBefore } = await db
    .from("product_stock_levels")
    .select("current_qty")
    .eq("product_id", productId)
    .single();

  await page.goto("/purchase/entries/new");
  await page.selectOption('select[name="supplier_id"]', supplierId);
  await page.fill('input[name="supplier_invoice_number"]', tag(`CREDIT-${Date.now()}`));
  await page.selectOption('select[name="line_product_id"]', productId);
  await page.fill('input[name="line_quantity"]', "10");
  await page.fill('input[placeholder="Rate"]', "100");

  await page.getByRole("button", { name: /create purchase/i }).click();
  await page.waitForURL(/\/purchase\/entries\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  const invoiceId = page.url().split("/").pop()!;
  createdInvoiceIds.push(invoiceId);

  // Expected: taxable 1000, GST 18% = 180, total 1180.
  await expect(page.getByText("1180.00").first()).toBeVisible();

  const { data: invoice } = await db
    .from("purchase_invoices")
    .select("total_amount, taxable_total, cgst_total, sgst_total, igst_total, status")
    .eq("id", invoiceId)
    .single();
  expect(invoice!.status).toBe("active");
  expect(Number(invoice!.total_amount)).toBe(1180);
  expect(Number(invoice!.taxable_total)).toBe(1000);
  expect(Number(invoice!.cgst_total) + Number(invoice!.sgst_total) + Number(invoice!.igst_total)).toBe(180);

  const { data: stockAfter } = await db
    .from("product_stock_levels")
    .select("current_qty")
    .eq("product_id", productId)
    .single();
  expect(Number(stockAfter!.current_qty)).toBe(Number(stockBefore!.current_qty) + 10);
});

test("duplicate supplier invoice number is blocked, then succeeds with an authorized override", async () => {
  const db = await dbClient();
  const invoiceNumber = tag(`DUP-${Date.now()}`);

  const { data: firstId, error: firstErr } = await db.rpc("create_purchase_invoice", {
    p_supplier_id: supplierId,
    p_supplier_invoice_number: invoiceNumber,
    p_supplier_invoice_date: todayISO(),
    p_notes: tag("duplicate test - original"),
    p_items: [{ product_id: productId, quantity: 1, rate: 100, discount_percent: 0 }],
    p_override_duplicate: false,
  });
  if (firstErr) throw firstErr;
  createdInvoiceIds.push(firstId);

  // Same supplier + same supplier invoice number, no override -> rejected.
  const { data: dupId, error: dupErr } = await db.rpc("create_purchase_invoice", {
    p_supplier_id: supplierId,
    p_supplier_invoice_number: invoiceNumber,
    p_supplier_invoice_date: todayISO(),
    p_notes: tag("duplicate test - should be blocked"),
    p_items: [{ product_id: productId, quantity: 1, rate: 100, discount_percent: 0 }],
    p_override_duplicate: false,
  });
  expect(dupId).toBeNull();
  expect(dupErr).not.toBeNull();
  expect(dupErr!.message).toContain("DUPLICATE_SUPPLIER_INVOICE");

  // Same number again, this time with an authorized override -> succeeds.
  const { data: overrideId, error: overrideErr } = await db.rpc("create_purchase_invoice", {
    p_supplier_id: supplierId,
    p_supplier_invoice_number: invoiceNumber,
    p_supplier_invoice_date: todayISO(),
    p_notes: tag("duplicate test - override"),
    p_items: [{ product_id: productId, quantity: 1, rate: 100, discount_percent: 0 }],
    p_override_duplicate: true,
  });
  if (overrideErr) throw overrideErr;
  createdInvoiceIds.push(overrideId);

  const { data: overrideInvoice } = await db
    .from("purchase_invoices")
    .select("duplicate_override, status")
    .eq("id", overrideId)
    .single();
  expect(overrideInvoice!.status).toBe("active");
  expect(overrideInvoice!.duplicate_override).toBe(true);
});

test("purchase return (debit note) reverses stock and reduces outstanding", async ({ page }) => {
  const db = await dbClient();

  const { data: stockBefore } = await db
    .from("product_stock_levels")
    .select("current_qty")
    .eq("product_id", productId)
    .single();

  const { data: invoiceId, error: invErr } = await db.rpc("create_purchase_invoice", {
    p_supplier_id: supplierId,
    p_supplier_invoice_number: tag(`RETURN-${Date.now()}`),
    p_supplier_invoice_date: todayISO(),
    p_notes: tag("return test"),
    p_items: [{ product_id: productId, quantity: 5, rate: 100, discount_percent: 0 }],
    p_override_duplicate: false,
  });
  if (invErr) throw invErr;
  createdInvoiceIds.push(invoiceId);

  await page.goto(`/purchase/returns/new?invoiceId=${invoiceId}`);
  await page.locator('input[type="number"]').first().fill("2");
  await page.fill("textarea", tag("damaged on receipt"));
  await page.getByRole("button", { name: /create debit note/i }).click();
  await page.waitForURL(/\/purchase\/returns\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  const debitNoteId = page.url().split("/").pop()!;
  createdDebitNoteIds.push(debitNoteId);

  const { data: stockAfter } = await db
    .from("product_stock_levels")
    .select("current_qty")
    .eq("product_id", productId)
    .single();
  expect(Number(stockAfter!.current_qty)).toBe(Number(stockBefore!.current_qty) + 5 - 2); // +5 for the purchase, -2 for the return

  const { data: outstanding } = await db
    .from("purchase_invoice_outstanding")
    .select("outstanding_amount")
    .eq("invoice_id", invoiceId)
    .single();
  // original 5*100*1.18=590, returned 2*100*1.18=236, outstanding should drop by the return
  expect(Number(outstanding!.outstanding_amount)).toBe(590 - 236);
});

test("bill mismatch verification computes matched/partial/mismatch status correctly", async ({ page }) => {
  const db = await dbClient();

  async function createVerificationInvoice(label: string): Promise<string> {
    const { data: id, error } = await db.rpc("create_purchase_invoice", {
      p_supplier_id: supplierId,
      p_supplier_invoice_number: tag(`VERIFY-${label}-${Date.now()}`),
      p_supplier_invoice_date: todayISO(),
      p_notes: tag(`verification test - ${label}`),
      p_items: [{ product_id: productId, quantity: 1, rate: 1000, discount_percent: 0 }],
      p_override_duplicate: false,
    });
    if (error) throw error;
    createdInvoiceIds.push(id);
    return id as string;
  }
  // Each invoice: taxable 1000, GST 18% = 180, total 1180.

  // Matched - supplier figures agree with the invoice, exercised through the
  // real Bill Verification UI (not just the RPC directly).
  const matchedId = await createVerificationInvoice("matched");
  await page.goto(`/purchase/entries/${matchedId}`);
  await page.fill('input[name="supplier_taxable_value"]', "1000");
  await page.fill('input[name="supplier_gst_total"]', "180");
  await page.fill('input[name="supplier_total"]', "1180");
  await page.getByRole("button", { name: /save verification/i }).click();
  await expect(page.getByText("Matched", { exact: true })).toBeVisible({ timeout: 10_000 });

  const { data: matchedRow } = await db
    .from("purchase_verifications")
    .select("status")
    .eq("purchase_invoice_id", matchedId)
    .single();
  expect(matchedRow!.status).toBe("matched");

  // Partial - supplier's total agrees (within tolerance) but the taxable/GST
  // split doesn't.
  const partialId = await createVerificationInvoice("partial");
  const { error: partialErr } = await db.rpc("record_purchase_verification", {
    p_invoice_id: partialId,
    p_supplier_taxable_value: 990,
    p_supplier_gst_total: 190,
    p_supplier_total: 1180,
    p_notes: tag("partial test"),
  });
  if (partialErr) throw partialErr;

  const { data: partialRow } = await db
    .from("purchase_verifications")
    .select("status")
    .eq("purchase_invoice_id", partialId)
    .single();
  expect(partialRow!.status).toBe("partial");

  // Mismatch - the supplier's stated total itself disagrees with the invoice.
  const mismatchId = await createVerificationInvoice("mismatch");
  const { error: mismatchErr } = await db.rpc("record_purchase_verification", {
    p_invoice_id: mismatchId,
    p_supplier_taxable_value: 1000,
    p_supplier_gst_total: 180,
    p_supplier_total: 1300,
    p_notes: tag("mismatch test"),
  });
  if (mismatchErr) throw mismatchErr;

  const { data: mismatchRow } = await db
    .from("purchase_verifications")
    .select("status")
    .eq("purchase_invoice_id", mismatchId)
    .single();
  expect(mismatchRow!.status).toBe("mismatch");
});
