import { randomUUID } from "crypto";
import { test, expect } from "@playwright/test";
import { dbClient, tag, safely, findOrCreate, todayISO } from "./helpers";

// Covers spec section 58's Mobile checklist: Sales Order, Cash Receipt, Bank
// Receipt, Realtime synchronization, Poor network, Duplicate prevention.
// This file is matched only by the mobile-chromium project (Pixel 7 viewport
// - see playwright.config.ts), so every test here already runs at a mobile
// viewport with no manual setup. Tagged master data uses its own "Mobile"
// suffix so it doesn't collide with sales.spec.ts/purchase.spec.ts's rows.

const CUSTOMER_NAME = tag("Mobile Customer");
const PRODUCT_CODE = tag("MobileSKU1");

let customerId: string;
let productId: string;
let staffId: string;
let userId: string;

// sales_orders have no dedicated "cancel" RPC (Phase 3 note: they're safe for
// clients to write directly since they carry no GST/stock/profit impact) -
// cleanup below just flips status to 'cancelled' the same way order-actions.tsx's
// cancelSalesOrder does.
const createdOrderIds: string[] = [];
const createdInvoiceIds: string[] = [];
const createdReceiptIds: string[] = [];

test.beforeAll(async () => {
  const db = await dbClient();

  const { data: me } = await db.auth.getUser();
  userId = me.user!.id;
  staffId = userId;

  customerId = await findOrCreate(db, "customers", "name", CUSTOMER_NAME, {
    name: CUSTOMER_NAME,
    state: "Kerala",
    district: "Ernakulam",
    credit_limit: 100000,
    credit_period_days: 30,
  });

  productId = await findOrCreate(db, "products", "code", PRODUCT_CODE, {
    code: PRODUCT_CODE,
    name: tag("Mobile Test Product"),
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
  const db = await dbClient();
  for (const id of createdReceiptIds) {
    await safely(() => db.rpc("cancel_receipt", { p_receipt_id: id }));
  }
  for (const id of createdInvoiceIds) {
    await safely(() => db.rpc("cancel_sales_invoice", { p_invoice_id: id }));
  }
  for (const id of createdOrderIds) {
    await safely(() => db.from("sales_orders").update({ status: "cancelled" }).eq("id", id));
  }
});

// Each Playwright test gets a fresh BrowserContext seeded from the
// e2e/.auth/admin.json snapshot taken once (empty queue) in global-setup, so
// the offline queue doesn't naturally leak between tests. This is a defensive
// extra: any localStorage this test's page wrote (queue items) is cleared so
// a later run of the suite against the same browser profile can't see stale
// "pending" rows from a previous, possibly-failed run.
test.afterEach(async ({ page }) => {
  await safely(() => page.evaluate(() => window.localStorage.clear()));
});

test("sales order (online) creates a row with the correct line item", async ({ page }) => {
  await page.goto("/sales/orders/new");
  await page.selectOption('select[name="customer_id"]', customerId);
  await page.selectOption('select[name="staff_id"]', staffId);
  await page.locator('select[name="line_product_id"]').first().selectOption(productId);
  await page.locator('input[name="line_quantity"]').first().fill("6");
  await page.locator('input[placeholder="Rate"]').first().fill("150");

  await page.getByRole("button", { name: /create sales order/i }).click();
  await page.waitForURL(/\/sales\/orders\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  const orderId = page.url().split("/").pop()!;
  createdOrderIds.push(orderId);

  await expect(page.getByText("150.00")).toBeVisible();

  const db = await dbClient();
  const { data: order } = await db
    .from("sales_orders")
    .select("customer_id, staff_id, status")
    .eq("id", orderId)
    .single();
  expect(order!.customer_id).toBe(customerId);
  expect(order!.staff_id).toBe(staffId);
  expect(order!.status).toBe("pending");

  const { data: items } = await db
    .from("sales_order_items")
    .select("product_id, quantity, rate, discount_percent")
    .eq("order_id", orderId);
  expect(items).toHaveLength(1);
  expect(items![0].product_id).toBe(productId);
  expect(Number(items![0].quantity)).toBe(6);
  expect(Number(items![0].rate)).toBe(150);
});

test("cash receipt (online) settles an invoice in full", async ({ page }) => {
  const db = await dbClient();
  const { data: invoiceId, error: invErr } = await db.rpc("create_sales_invoice", {
    p_sale_type: "credit",
    p_customer_id: customerId,
    p_cash_customer_name: null,
    p_cash_customer_phone: null,
    p_route_id: null,
    p_staff_id: staffId,
    p_credit_period_days: 30,
    p_notes: tag("cash receipt test"),
    p_items: [{ product_id: productId, quantity: 3, rate: 150, discount_percent: 0 }],
  });
  if (invErr) throw invErr;
  createdInvoiceIds.push(invoiceId);
  const { data: thisInvoice } = await db.from("sales_invoices").select("invoice_number").eq("id", invoiceId).single();
  const invoiceNumber = thisInvoice!.invoice_number;
  // total = 3 * 150 * 1.18 = 531

  await page.goto("/accounts/receipts/cash/new");
  await page.selectOption('select[name="customer_id"]', customerId);
  const row = page.locator("tbody tr", { hasText: invoiceNumber });
  await row.locator('input[type="number"]').waitFor({ timeout: 10_000 });
  await page.fill('input[name="amount"]', "531");
  await row.locator('input[type="number"]').fill("531");
  await page.getByRole("button", { name: /record cash receipt/i }).click();
  await page.waitForURL(/\/accounts\/receipts\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  const receiptId = page.url().split("/").pop()!;
  createdReceiptIds.push(receiptId);

  const { data: receipt } = await db.from("receipts").select("method, amount, customer_id").eq("id", receiptId).single();
  expect(receipt!.method).toBe("cash");
  expect(Number(receipt!.amount)).toBe(531);
  expect(receipt!.customer_id).toBe(customerId);

  const { data: outstanding } = await db
    .from("sales_invoice_outstanding")
    .select("outstanding_amount")
    .eq("invoice_id", invoiceId)
    .single();
  expect(Number(outstanding!.outstanding_amount)).toBe(0);
});

test("bank receipt (online) records against an invoice with a reference number", async ({ page }) => {
  const db = await dbClient();
  const { data: invoiceId, error: invErr } = await db.rpc("create_sales_invoice", {
    p_sale_type: "credit",
    p_customer_id: customerId,
    p_cash_customer_name: null,
    p_cash_customer_phone: null,
    p_route_id: null,
    p_staff_id: staffId,
    p_credit_period_days: 30,
    p_notes: tag("bank receipt test"),
    p_items: [{ product_id: productId, quantity: 2, rate: 150, discount_percent: 0 }],
  });
  if (invErr) throw invErr;
  createdInvoiceIds.push(invoiceId);
  const { data: thisInvoice } = await db.from("sales_invoices").select("invoice_number").eq("id", invoiceId).single();
  const invoiceNumber = thisInvoice!.invoice_number;
  // total = 2 * 150 * 1.18 = 354
  const utr = tag("UTR123456");

  await page.goto("/accounts/receipts/bank/new");
  await page.selectOption('select[name="customer_id"]', customerId);
  await page.locator('label:has-text("Reference / UTR number") + input').fill(utr);
  const row = page.locator("tbody tr", { hasText: invoiceNumber });
  await row.locator('input[type="number"]').waitFor({ timeout: 10_000 });
  await page.fill('input[name="amount"]', "354");
  await row.locator('input[type="number"]').fill("354");
  await page.getByRole("button", { name: /record bank receipt/i }).click();
  await page.waitForURL(/\/accounts\/receipts\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  const receiptId = page.url().split("/").pop()!;
  createdReceiptIds.push(receiptId);

  const { data: receipt } = await db
    .from("receipts")
    .select("method, amount, reference_number")
    .eq("id", receiptId)
    .single();
  expect(receipt!.method).toBe("bank");
  expect(Number(receipt!.amount)).toBe(354);
  expect(receipt!.reference_number).toBe(utr);
});

test("poor network - a sales order queues offline and syncs once back online", async ({ page, context }) => {
  await page.goto("/sales/orders/new");
  await context.setOffline(true);

  await page.selectOption('select[name="customer_id"]', customerId);
  await page.selectOption('select[name="staff_id"]', staffId);
  await page.locator('select[name="line_product_id"]').first().selectOption(productId);
  await page.locator('input[name="line_quantity"]').first().fill("4");
  await page.locator('input[placeholder="Rate"]').first().fill("150");
  await page.getByRole("button", { name: /create sales order/i }).click();

  // sales-order-form.tsx's exact "Saved offline" panel (shown in place of the
  // form once navigator.onLine is false at submit time).
  await expect(page.getByText("Saved offline")).toBeVisible({ timeout: 10_000 });

  const queueKey = `skye-erp-offline-queue:${userId}`;
  const queued = await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  }, queueKey);
  expect(queued).toHaveLength(1);
  expect(queued[0].type).toBe("sales_order");
  expect(queued[0].status).toBe("pending");
  const localId = queued[0].localId as string;
  // offline-sync-manager.tsx uses the queue item's localId as the row's real
  // id once flushed, so this is the id to look for in the DB and to clean up.
  createdOrderIds.push(localId);

  await context.setOffline(false);
  // OfflineSyncManager flushes the queue on mount (and on the browser's
  // 'online' event) - a reload is the simplest reliable way to trigger that
  // mount now that the network is back.
  await page.reload();

  const db = await dbClient();
  await expect
    .poll(
      async () => {
        const { data } = await db.from("sales_orders").select("id").eq("id", localId).maybeSingle();
        return data?.id ?? null;
      },
      { timeout: 10_000, message: "queued sales order should reach the database once back online" },
    )
    .toBe(localId);

  await expect
    .poll(
      async () => {
        return page.evaluate((key) => {
          const raw = window.localStorage.getItem(key);
          const items = raw ? JSON.parse(raw) : [];
          return items[0]?.status ?? null;
        }, queueKey);
      },
      { timeout: 10_000, message: "queue item's local status should flip to 'synced'" },
    )
    .toBe("synced");
});

test("duplicate prevention - retrying create_receipt with the same client id doesn't double-insert", async () => {
  const db = await dbClient();
  const clientId = randomUUID();

  // Simulates a network-flaky retry: the offline sync flow calls create_receipt
  // with a client-generated id twice (e.g. the first response never arrived,
  // so the client retries) - this must not create two receipts.
  const rpcArgs = {
    p_method: "cash",
    p_customer_id: customerId,
    p_mode: "on_account" as const,
    p_amount: 250,
    p_receipt_date: todayISO(),
    p_reference_number: null,
    p_notes: tag("duplicate prevention test"),
    p_allocations: [],
    p_client_id: clientId,
  };

  const { data: firstId, error: err1 } = await db.rpc("create_receipt", rpcArgs);
  if (err1) throw err1;
  createdReceiptIds.push(firstId);

  const { data: secondId, error: err2 } = await db.rpc("create_receipt", rpcArgs);
  if (err2) throw err2;

  expect(firstId).toBe(clientId);
  expect(secondId).toBe(firstId);

  const { count, error: countErr } = await db
    .from("receipts")
    .select("id", { count: "exact", head: true })
    .eq("id", clientId);
  if (countErr) throw countErr;
  expect(count).toBe(1);
});

test("realtime synchronization - a new invoice appears on a second device without a manual reload", async ({ browser }) => {
  const secondContext = await browser.newContext({ storageState: "e2e/.auth/admin.json" });
  const secondPage = await secondContext.newPage();
  try {
    // RealtimeRefresh opens its postgres_changes websocket subscription in a
    // useEffect after mount, asynchronously - if the DB write below happens
    // before that subscription's join is acknowledged, the event fires into
    // nothing and this test would wrongly look like a broken feature. Wait
    // for the actual websocket handshake to Supabase Realtime (not a fixed
    // sleep guessing page-load time) before triggering the change.
    const wsPromise = secondPage.waitForEvent("websocket", { predicate: (ws) => ws.url().includes("realtime") });
    await secondPage.goto("/accounts/outstanding?type=customer");
    await wsPromise;
    // Small buffer for the phx_join ack after the socket opens.
    await secondPage.waitForTimeout(1500);

    const db = await dbClient();
    const { data: invoiceId, error: invErr } = await db.rpc("create_sales_invoice", {
      p_sale_type: "credit",
      p_customer_id: customerId,
      p_cash_customer_name: null,
      p_cash_customer_phone: null,
      p_route_id: null,
      p_staff_id: staffId,
      p_credit_period_days: 30,
      p_notes: tag("realtime test"),
      p_items: [{ product_id: productId, quantity: 1, rate: 150, discount_percent: 0 }],
    });
    if (invErr) throw invErr;
    createdInvoiceIds.push(invoiceId);

    const { data: thisInvoice } = await db
      .from("sales_invoices")
      .select("invoice_number")
      .eq("id", invoiceId)
      .single();
    const invoiceNumber = thisInvoice!.invoice_number;

    // RealtimeRefresh subscribes to sales_invoices on this page and calls
    // router.refresh() (debounced 500ms) - no reload here, so this only
    // passes if the Postgres changes subscription actually fired.
    await expect(secondPage.getByText(invoiceNumber, { exact: true })).toBeVisible({ timeout: 15_000 });
  } finally {
    await secondPage.close();
    await secondContext.close();
  }
});
