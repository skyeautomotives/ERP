import { test, expect } from "@playwright/test";
import { dbClient, tag, safely, findOrCreate } from "./helpers";

// Covers this session's sales-order additions: sequential order numbers
// (including the idempotent create_sales_order RPC that both the normal
// form and the offline-sync path now share), bulk order-to-invoice
// conversion with a per-order cash/credit choice, and that single-order
// convert (the existing button) still defaults to credit.

const CUSTOMER_NAME = tag("SalesOrders Customer");
const PRODUCT_CODE = tag("SalesOrdersSKU1");

let customerId: string;
let productId: string;
let staffId: string;

const createdOrderIds: string[] = [];
const createdInvoiceIds: string[] = [];

test.beforeAll(async () => {
  const db = await dbClient();
  const { data: me } = await db.auth.getUser();
  staffId = me.user!.id;

  customerId = await findOrCreate(db, "customers", "name", CUSTOMER_NAME, {
    name: CUSTOMER_NAME,
    state: "Kerala",
    credit_limit: 100000,
    credit_period_days: 30,
  });

  productId = await findOrCreate(db, "products", "code", PRODUCT_CODE, {
    code: PRODUCT_CODE,
    name: tag("SalesOrders Test Product"),
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
    await safely(() => db.rpc("cancel_sales_invoice", { p_invoice_id: id }));
  }
  for (const id of createdOrderIds) {
    await safely(() => db.from("sales_orders").update({ status: "cancelled" }).eq("id", id));
  }
});

test("create_sales_order allocates a sequential, unique order number and is idempotent by client id", async () => {
  const db = await dbClient();
  const clientId = crypto.randomUUID();

  const { data: firstId, error: firstError } = await db.rpc("create_sales_order", {
    p_customer_id: customerId,
    p_route_id: null,
    p_staff_id: staffId,
    p_notes: tag("idempotency check"),
    p_items: [{ product_id: productId, quantity: 2, rate: 150, discount_percent: 0 }],
    p_client_id: clientId,
  });
  expect(firstError).toBeNull();
  createdOrderIds.push(firstId as string);

  const { data: first } = await db.from("sales_orders").select("order_number").eq("id", firstId).single();
  expect(first!.order_number).toMatch(/^[A-Z]+\d+$/);

  // Retry with the same client id - must return the same order, not burn a
  // second number or create a duplicate row.
  const { data: retryId, error: retryError } = await db.rpc("create_sales_order", {
    p_customer_id: customerId,
    p_route_id: null,
    p_staff_id: staffId,
    p_notes: tag("idempotency check"),
    p_items: [{ product_id: productId, quantity: 2, rate: 150, discount_percent: 0 }],
    p_client_id: clientId,
  });
  expect(retryError).toBeNull();
  expect(retryId).toBe(firstId);

  const { count } = await db
    .from("sales_orders")
    .select("id", { count: "exact", head: true })
    .eq("id", firstId as string);
  expect(count).toBe(1);

  // A second, distinct order gets the next sequential number.
  const { data: secondId } = await db.rpc("create_sales_order", {
    p_customer_id: customerId,
    p_route_id: null,
    p_staff_id: staffId,
    p_notes: tag("second order"),
    p_items: [{ product_id: productId, quantity: 1, rate: 150, discount_percent: 0 }],
    p_client_id: null,
  });
  createdOrderIds.push(secondId as string);
  const { data: second } = await db.from("sales_orders").select("order_number").eq("id", secondId).single();
  expect(second!.order_number).not.toBe(first!.order_number);
});

test("bulk-convert a mixed cash+credit batch produces correctly-typed invoices", async ({ page }) => {
  const db = await dbClient();

  const orderIds: string[] = [];
  for (let i = 0; i < 2; i++) {
    const { data: id } = await db.rpc("create_sales_order", {
      p_customer_id: customerId,
      p_route_id: null,
      p_staff_id: staffId,
      p_notes: tag(`bulk convert ${i}`),
      p_items: [{ product_id: productId, quantity: 2, rate: 150, discount_percent: 0 }],
      p_client_id: null,
    });
    orderIds.push(id as string);
    createdOrderIds.push(id as string);
  }

  await page.goto("/sales/new");
  await page.click('button:has-text("Import from Sales Order")');
  await page.locator(`li:has-text("${CUSTOMER_NAME}")`).first().waitFor({ state: "visible", timeout: 10_000 });

  // Select the two most recently created rows (our two orders) and set one
  // to Cash, one to Credit.
  const checkboxes = page.locator('li:has-text("' + CUSTOMER_NAME + '") input[type="checkbox"]');
  const rowCount = await checkboxes.count();
  expect(rowCount).toBeGreaterThanOrEqual(2);
  await checkboxes.nth(0).check();
  await checkboxes.nth(1).check();

  const selects = page.locator('li:has-text("' + CUSTOMER_NAME + '") select');
  await selects.nth(0).selectOption("cash");
  await selects.nth(1).selectOption("credit");

  await page.getByRole("button", { name: /convert 2 orders/i }).click();
  await page.waitForTimeout(1500);

  await expect(page.getByText("Invoice created").first()).toBeVisible({ timeout: 10_000 });

  const { data: converted } = await db
    .from("sales_orders")
    .select("id, status, converted_invoice_id")
    .in("id", orderIds);
  for (const o of converted ?? []) {
    expect(o.status).toBe("converted");
    expect(o.converted_invoice_id).not.toBeNull();
    if (o.converted_invoice_id) createdInvoiceIds.push(o.converted_invoice_id);
  }

  const { data: invoices } = await db
    .from("sales_invoices")
    .select("sale_type")
    .in(
      "id",
      (converted ?? []).map((o) => o.converted_invoice_id).filter((id): id is string => !!id),
    );
  const saleTypes = (invoices ?? []).map((i) => i.sale_type).sort();
  expect(saleTypes).toEqual(["cash", "credit"]);
});

test("single-order convert (the existing button) still defaults to credit", async ({ page }) => {
  const db = await dbClient();
  const { data: orderId } = await db.rpc("create_sales_order", {
    p_customer_id: customerId,
    p_route_id: null,
    p_staff_id: staffId,
    p_notes: tag("single convert default"),
    p_items: [{ product_id: productId, quantity: 1, rate: 150, discount_percent: 0 }],
    p_client_id: null,
  });
  createdOrderIds.push(orderId as string);

  await page.goto(`/sales/orders/${orderId}`);
  await page.getByRole("button", { name: /convert to invoice/i }).click();
  await page.waitForURL(/\/sales\/[0-9a-f-]{36}$/, { timeout: 15_000 });

  const invoiceId = page.url().split("/").pop()!;
  createdInvoiceIds.push(invoiceId);
  const { data: invoice } = await db.from("sales_invoices").select("sale_type").eq("id", invoiceId).single();
  expect(invoice!.sale_type).toBe("credit");
});
