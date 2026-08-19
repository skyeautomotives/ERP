import { test, expect } from "@playwright/test";
import { dbClient, tag, safely, findOrCreate } from "./helpers";

// Covers this session's delete/confirm, view-then-edit, and invoice
// print/share/navigation additions: a master-data record with no
// transaction history can be hard-deleted; one that does have history is
// blocked with a friendly message instead of a raw DB error; a detail page
// defaults to read-only and only becomes editable after clicking Edit.

const SUPPLIER_NAME = tag("DeleteEdit Supplier");
const PRODUCT_WITH_HISTORY_CODE = tag("DeleteEdit HistorySKU");

let supplierId: string;
let productWithHistoryId: string;
const createdInvoiceIds: string[] = [];

test.beforeAll(async () => {
  const db = await dbClient();

  supplierId = await findOrCreate(db, "suppliers", "name", SUPPLIER_NAME, {
    name: SUPPLIER_NAME,
    state: "Kerala",
    credit_period_days: 30,
  });

  productWithHistoryId = await findOrCreate(db, "products", "code", PRODUCT_WITH_HISTORY_CODE, {
    code: PRODUCT_WITH_HISTORY_CODE,
    name: tag("DeleteEdit History Product"),
    unit: "pcs",
    mrp: 200,
    purchase_rate: 100,
    selling_rate: 150,
    gst_percent: 18,
    opening_qty: 1000,
  });
});

test.afterAll(async () => {
  const db = await dbClient();
  for (const id of createdInvoiceIds) {
    await safely(() => db.rpc("cancel_purchase_invoice", { p_invoice_id: id }));
  }
});

test("a product with no transaction history can be deleted", async ({ page }) => {
  const db = await dbClient();
  const code = tag(`Deletable-${Date.now()}`);

  await page.goto("/masters/products/new");
  await page.fill('input[name="code"]', code);
  await page.fill('input[name="name"]', tag("Deletable Product"));
  await page.fill('input[name="gst_percent"]', "18");
  await page.getByRole("main").getByRole("button", { name: /save/i }).click();
  await page.waitForURL(/\/masters\/products\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  const productId = page.url().split("/").pop()!;

  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete product" }).click();
  await page.waitForURL(/\/masters\/products$/, { timeout: 15_000 });

  const { data } = await db.from("products").select("id").eq("id", productId).maybeSingle();
  expect(data).toBeNull();
});

test("a product with purchase history is blocked from deleting, with a friendly message", async ({ page }) => {
  const db = await dbClient();

  const { data: invoiceId, error } = await db.rpc("create_purchase_invoice", {
    p_supplier_id: supplierId,
    p_supplier_invoice_number: tag(`DEL-BLOCK-${Date.now()}`),
    p_supplier_invoice_date: new Date().toISOString().slice(0, 10),
    p_notes: null,
    p_items: [{ product_id: productWithHistoryId, quantity: 5, rate: 100, discount_percent: 0 }],
    p_override_duplicate: false,
  });
  expect(error).toBeNull();
  createdInvoiceIds.push(invoiceId as string);

  await page.goto(`/masters/products/${productWithHistoryId}`);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete product" }).click();

  await expect(page.getByText(/has existing transactions/i)).toBeVisible({ timeout: 10_000 });

  const { data: stillThere } = await db.from("products").select("id").eq("id", productWithHistoryId).maybeSingle();
  expect(stillThere).not.toBeNull();
});

test("customer detail page defaults to view mode, Edit reveals the form, Save shows the fresh value", async ({
  page,
}) => {
  const name = tag(`ViewEdit-${Date.now()}`);

  await page.goto("/masters/customers/new");
  await page.fill('input[name="name"]', name);
  await page.getByRole("main").getByRole("button", { name: /save/i }).click();
  await page.waitForURL(/\/masters\/customers\/[0-9a-f-]{36}$/, { timeout: 15_000 });

  const nameField = page.locator('input[name="name"]');
  await expect(nameField).toBeDisabled();
  await expect(page.getByRole("button", { name: "Edit", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(nameField).toBeEnabled();

  const renamed = `${name} RENAMED`;
  await nameField.fill(renamed);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForTimeout(1000);

  await expect(page.locator("h1")).toHaveText(renamed);
  await expect(nameField).toBeDisabled();
  await expect(nameField).toHaveValue(renamed);
});

test("sales invoice detail page has Print, Share to WhatsApp, and Back to list", async ({ page }) => {
  await page.goto("/sales/credit");
  const href = await page.locator('table a[href^="/sales/"]').first().getAttribute("href");
  test.skip(!href, "No sales invoices exist to check");
  await page.goto(href!);

  await expect(page.getByRole("button", { name: "Print / Save as PDF" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Share to WhatsApp" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to list" })).toBeVisible();
});
