import { test, expect } from "@playwright/test";
import { dbClient, tag, safely, findOrCreate, todayISO } from "./helpers";

// Covers spec section 58's Staff checklist: staff sales, staff collection,
// ageing, 90-day collection, incentive calculation.
//
// KNOWN LIMITATION (see docs/DEV_LOG.md Phase 14 notes): create_sales_invoice
// always dates the invoice current_date, and create_receipt's p_receipt_date
// can't reasonably be pushed into the future either - so there is no way to
// legitimately create a receipt whose (receipt_date - invoice_date) lands in
// the 16-30/31-45/46-60/61-90/90+ ageing buckets via the live RPCs today (no
// admin backdating path exists - confirmed by reading create_sales_invoice in
// 20260817200006_fix_invoice_number_update.sql, which hardcodes invoice_date
// to its column default of current_date with no parameter to override it).
// Only the 0-15 bucket is directly reachable. The tests below verify that
// same-day collections land correctly in the 0-15 bucket (and that every
// other bucket is unaffected), which at least exercises the real boundary
// arithmetic end-to-end. Full multi-bucket coverage would need a real
// backdating path added to the app - flagged as a gap, not fixed here.
//
// Every assertion below is a before/after DELTA around this file's own
// action (create invoice, create receipt), not an absolute equality check.
// get_staff_performance/get_incentive_dashboard aggregate by staff across
// the *entire* day regardless of customer, and this suite's staff_id is the
// shared E2E user also used by sales.spec.ts - so asserting an absolute
// total would be contaminated by whatever else ran against that staff today.
// Deltas isolate exactly this file's contribution regardless of what else
// happened, and are robust to running a single test via --grep too.

const CUSTOMER_NAME = tag("Staff Customer");
const PRODUCT_CODE = tag("Staff SKU1");

let customerId: string;
let productId: string;
let staffId: string;
let staffName: string;
const createdInvoiceIds: string[] = [];
const createdReceiptIds: string[] = [];

type StaffPerformanceRow = {
  staff_id: string;
  staff_name: string;
  total_sales: number;
  credit_sales: number;
  invoice_count: number;
  customer_count: number;
  total_collection: number;
  total_outstanding: number;
  sales_return_total: number;
  profit_total: number;
  collected_0_15: number;
  collected_16_30: number;
  collected_31_45: number;
  collected_46_60: number;
  collected_61_90: number;
  collected_90_plus: number;
};

const ZERO_STAFF_ROW: Omit<StaffPerformanceRow, "staff_id" | "staff_name"> = {
  total_sales: 0,
  credit_sales: 0,
  invoice_count: 0,
  customer_count: 0,
  total_collection: 0,
  total_outstanding: 0,
  sales_return_total: 0,
  profit_total: 0,
  collected_0_15: 0,
  collected_16_30: 0,
  collected_31_45: 0,
  collected_46_60: 0,
  collected_61_90: 0,
  collected_90_plus: 0,
};

type IncentiveRow = {
  staff_id: string;
  staff_name: string;
  total_sales: number;
  sales_incentive: number;
  collection_incentive: number;
  total_incentive: number;
};

const ZERO_INCENTIVE_ROW: Omit<IncentiveRow, "staff_id" | "staff_name"> = {
  total_sales: 0,
  sales_incentive: 0,
  collection_incentive: 0,
  total_incentive: 0,
};

// supabase-js hands back numeric columns as strings - every field on the rows
// this file compares is coerced through Number() at the point of use.
async function staffPerformanceRow(
  db: Awaited<ReturnType<typeof dbClient>>,
  from: string,
  to: string,
): Promise<StaffPerformanceRow> {
  const { data, error } = await db.rpc("get_staff_performance", { p_from: from, p_to: to });
  if (error) throw error;
  const row = (data as StaffPerformanceRow[] | null)?.find((r) => r.staff_id === staffId);
  return row ?? { staff_id: staffId, staff_name: staffName, ...ZERO_STAFF_ROW };
}

async function incentiveRow(
  db: Awaited<ReturnType<typeof dbClient>>,
  from: string,
  to: string,
): Promise<IncentiveRow> {
  const { data, error } = await db.rpc("get_incentive_dashboard", { p_from: from, p_to: to });
  if (error) throw error;
  const row = (data as IncentiveRow[] | null)?.find((r) => r.staff_id === staffId);
  return row ?? { staff_id: staffId, staff_name: staffName, ...ZERO_INCENTIVE_ROW };
}

test.beforeAll(async () => {
  const db = await dbClient();

  const { data: me } = await db.auth.getUser();
  staffId = me.user!.id;
  const { data: profile } = await db.from("user_profiles").select("full_name").eq("id", staffId).single();
  staffName = profile!.full_name as string;

  customerId = await findOrCreate(db, "customers", "name", CUSTOMER_NAME, {
    name: CUSTOMER_NAME,
    state: "Kerala",
    district: "Ernakulam",
    credit_limit: 100000,
    credit_period_days: 30,
  });

  productId = await findOrCreate(db, "products", "code", PRODUCT_CODE, {
    code: PRODUCT_CODE,
    name: tag("Staff Test Product"),
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

  // Self-heal: this tagged customer is only ever used by this spec file, so
  // any invoice still 'active' against it is leftover from a previous run
  // that crashed before its own afterAll cleanup ran. Cancelling those first
  // means this run's before/after deltas aren't skewed by stale data (e.g. a
  // customer_count delta of 0 instead of 1 because the customer was already
  // counted from a leftover invoice).
  const { data: leftover } = await db
    .from("sales_invoices")
    .select("id")
    .eq("customer_id", customerId)
    .eq("status", "active");
  for (const row of leftover ?? []) {
    await safely(() => db.rpc("cancel_sales_invoice", { p_invoice_id: row.id as string }));
  }
});

test.afterAll(async () => {
  const db = await dbClient();
  for (const id of createdReceiptIds) {
    await safely(() => db.rpc("cancel_receipt", { p_receipt_id: id }));
  }
  for (const id of createdInvoiceIds) {
    await safely(() => db.rpc("cancel_sales_invoice", { p_invoice_id: id }));
  }
});

test("staff sales performance reflects a new invoice's totals, invoice count and customer count", async () => {
  const db = await dbClient();
  const today = todayISO();
  const before = await staffPerformanceRow(db, today, today);

  const { data: invoiceId, error } = await db.rpc("create_sales_invoice", {
    p_sale_type: "credit",
    p_customer_id: customerId,
    p_cash_customer_name: null,
    p_cash_customer_phone: null,
    p_route_id: null,
    p_staff_id: staffId,
    p_credit_period_days: 30,
    p_notes: tag("staff sales test"),
    p_items: [{ product_id: productId, quantity: 10, rate: 150, discount_percent: 0 }],
  });
  if (error) throw error;
  createdInvoiceIds.push(invoiceId);
  // taxable 10*150=1500, GST 18%=270, total 1770, cost 10*100=1000, profit 500

  const after = await staffPerformanceRow(db, today, today);

  expect(Number(after.total_sales) - Number(before.total_sales)).toBe(1770);
  expect(Number(after.credit_sales) - Number(before.credit_sales)).toBe(1770);
  expect(Number(after.invoice_count) - Number(before.invoice_count)).toBe(1);
  expect(Number(after.customer_count) - Number(before.customer_count)).toBe(1);
  expect(Number(after.profit_total) - Number(before.profit_total)).toBe(500);
  expect(Number(after.total_outstanding) - Number(before.total_outstanding)).toBe(1770);
});

test("staff collection, ageing buckets and 90-day collection detail reflect a same-day payment", async () => {
  const db = await dbClient();
  const today = todayISO();
  const before = await staffPerformanceRow(db, today, today);

  const { data: invoiceId, error: invErr } = await db.rpc("create_sales_invoice", {
    p_sale_type: "credit",
    p_customer_id: customerId,
    p_cash_customer_name: null,
    p_cash_customer_phone: null,
    p_route_id: null,
    p_staff_id: staffId,
    p_credit_period_days: 30,
    p_notes: tag("staff collection test"),
    p_items: [{ product_id: productId, quantity: 4, rate: 150, discount_percent: 0 }],
  });
  if (invErr) throw invErr;
  createdInvoiceIds.push(invoiceId);
  // total = 4*150*1.18 = 708
  const { data: invoiceRow } = await db
    .from("sales_invoices")
    .select("invoice_number, invoice_date, total_amount")
    .eq("id", invoiceId)
    .single();
  const invoiceNumber = invoiceRow!.invoice_number as string;

  const { data: receiptId, error: recErr } = await db.rpc("create_receipt", {
    p_method: "cash",
    p_customer_id: customerId,
    p_mode: "bill",
    p_amount: 708,
    p_receipt_date: today,
    p_reference_number: null,
    p_notes: tag("staff collection test"),
    p_allocations: [{ sales_invoice_id: invoiceId, amount_allocated: 708 }],
  });
  if (recErr) throw recErr;
  createdReceiptIds.push(receiptId);

  const after = await staffPerformanceRow(db, today, today);

  // Staff collection (checklist item 2)
  expect(Number(after.total_collection) - Number(before.total_collection)).toBe(708);
  // Fully paid same day, so outstanding goes back down by the same amount it went up.
  expect(Number(after.total_outstanding) - Number(before.total_outstanding)).toBe(0);

  // Ageing (checklist item 3): same-day payment must land entirely in 0-15,
  // every other bucket must be untouched by this payment.
  expect(Number(after.collected_0_15) - Number(before.collected_0_15)).toBe(708);
  expect(Number(after.collected_16_30) - Number(before.collected_16_30)).toBe(0);
  expect(Number(after.collected_31_45) - Number(before.collected_31_45)).toBe(0);
  expect(Number(after.collected_46_60) - Number(before.collected_46_60)).toBe(0);
  expect(Number(after.collected_61_90) - Number(before.collected_61_90)).toBe(0);
  expect(Number(after.collected_90_plus) - Number(before.collected_90_plus)).toBe(0);

  // 90-day collection report (checklist item 4): get_collection_detail should
  // show this exact invoice/receipt with the right bucket label and days_taken.
  const { data: detailRows, error: detailErr } = await db.rpc("get_collection_detail", {
    p_from: today,
    p_to: today,
  });
  if (detailErr) throw detailErr;
  const detail = (detailRows as Array<Record<string, unknown>>).find(
    (r) => r.invoice_number === invoiceNumber,
  );
  expect(detail, `get_collection_detail should include invoice ${invoiceNumber}`).toBeTruthy();
  expect(detail!.staff_name).toBe(staffName);
  expect(detail!.customer_name).toBe(CUSTOMER_NAME);
  expect(Number(detail!.collection_amount)).toBe(708);
  expect(detail!.days_taken).toBe(0);
  expect(detail!.collection_status).toBe("0-15 days");
});

test("incentive dashboard computes sales and collection incentive from the configured rate/slab", async () => {
  const db = await dbClient();
  const today = todayISO();

  const { data: settings } = await db.from("company_settings").select("sales_incentive_rate").limit(1).single();
  const salesIncentiveRate = Number(settings!.sales_incentive_rate);

  // Same-day (days_taken = 0) collection must match exactly one active slab -
  // that's what get_incentive_dashboard's own join against
  // collection_incentive_slabs would match for this receipt.
  const { data: slabs } = await db
    .from("collection_incentive_slabs")
    .select("incentive_rate, min_days, max_days")
    .eq("is_active", true)
    .lte("min_days", 0);
  const matchingSlabs = (slabs ?? []).filter((s) => s.max_days === null || Number(s.max_days) >= 0);
  expect(matchingSlabs, "exactly one active slab should cover days_taken=0").toHaveLength(1);
  const slabRate = Number(matchingSlabs[0].incentive_rate);

  const before = await incentiveRow(db, today, today);

  const { data: invoiceId, error: invErr } = await db.rpc("create_sales_invoice", {
    p_sale_type: "credit",
    p_customer_id: customerId,
    p_cash_customer_name: null,
    p_cash_customer_phone: null,
    p_route_id: null,
    p_staff_id: staffId,
    p_credit_period_days: 30,
    p_notes: tag("staff incentive test"),
    p_items: [{ product_id: productId, quantity: 1, rate: 1000, discount_percent: 0 }],
  });
  if (invErr) throw invErr;
  createdInvoiceIds.push(invoiceId);
  // taxable 1000, GST 18% = 180, total 1180
  const invoiceTotal = 1180;

  const { data: receiptId, error: recErr } = await db.rpc("create_receipt", {
    p_method: "cash",
    p_customer_id: customerId,
    p_mode: "bill",
    p_amount: invoiceTotal,
    p_receipt_date: today,
    p_reference_number: null,
    p_notes: tag("staff incentive test"),
    p_allocations: [{ sales_invoice_id: invoiceId, amount_allocated: invoiceTotal }],
  });
  if (recErr) throw recErr;
  createdReceiptIds.push(receiptId);

  const after = await incentiveRow(db, today, today);

  const expectedSalesIncentive = Math.round(invoiceTotal * salesIncentiveRate) / 100;
  const expectedCollectionIncentive = Math.round(invoiceTotal * slabRate) / 100;

  const salesIncentiveDelta = Number(after.sales_incentive) - Number(before.sales_incentive);
  const collectionIncentiveDelta = Number(after.collection_incentive) - Number(before.collection_incentive);
  const totalIncentiveDelta = Number(after.total_incentive) - Number(before.total_incentive);

  expect(salesIncentiveDelta).toBeCloseTo(expectedSalesIncentive, 2);
  expect(collectionIncentiveDelta).toBeCloseTo(expectedCollectionIncentive, 2);
  expect(totalIncentiveDelta).toBeCloseTo(expectedSalesIncentive + expectedCollectionIncentive, 2);
});

test("staff performance page renders this staff member's row with the same totals as the RPC", async ({ page }) => {
  const db = await dbClient();
  const today = todayISO();

  const { data: invoiceId, error } = await db.rpc("create_sales_invoice", {
    p_sale_type: "credit",
    p_customer_id: customerId,
    p_cash_customer_name: null,
    p_cash_customer_phone: null,
    p_route_id: null,
    p_staff_id: staffId,
    p_credit_period_days: 30,
    p_notes: tag("staff UI test"),
    p_items: [{ product_id: productId, quantity: 1, rate: 500, discount_percent: 0 }],
  });
  if (error) throw error;
  createdInvoiceIds.push(invoiceId);

  // Absolute (not delta) on purpose here: the page has no notion of "this
  // test's contribution", it renders whatever get_staff_performance returns
  // for the day - so the real cross-check is "does the page show exactly
  // what the RPC returns right now", not a hardcoded number.
  const expected = await staffPerformanceRow(db, today, today);

  await page.goto(`/staff/performance?from=${today}&to=${today}`);
  const row = page.locator("tbody tr", { hasText: staffName });
  await expect(row).toBeVisible({ timeout: 10_000 });
  // Columns: Staff, Invoices, Customers, Total sales, Credit sales, Collection, ...
  await expect(row.locator("td").nth(3)).toHaveText(Number(expected.total_sales).toFixed(2));
  await expect(row.locator("td").nth(1)).toHaveText(String(Number(expected.invoice_count)));
});
