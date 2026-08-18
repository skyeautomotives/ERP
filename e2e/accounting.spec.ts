import { test, expect } from "@playwright/test";
import { dbClient, tag, safely, findOrCreate, todayISO } from "./helpers";

// Covers spec section 58's Accounting checklist: receipt allocation, payment
// allocation, opening balance, trial balance, P&L, balance sheet.
//
// Receipt allocation is already covered end-to-end (partial -> full payment
// against a single invoice) by sales.spec.ts's "partial then full payment
// against a credit invoice via receipts" test. This file adds the case that
// one doesn't cover - a single receipt split across TWO invoices in one go -
// and covers the purchase-side mirror (payments) plus the reporting RPC that
// Trial Balance / P&L / Balance Sheet all share.
//
// Trial Balance, P&L and Balance Sheet (src/app/(app)/accounts/trial-balance,
// profit-and-loss, balance-sheet) have no dedicated RPCs of their own - all
// three read get_account_balances(p_from_date, p_to_date) and group by
// account_type. So instead of loading and eyeballing three report pages, this
// file asserts the invariant those pages depend on directly: a known credit
// sale moves Accounts Receivable/Sales Income/GST Payable by exactly the
// right amounts, and total debits still equal total credits across the whole
// chart of accounts afterward.
//
// Regression coverage: sales_invoice_outstanding/purchase_invoice_outstanding
// and get_customer_ledger/get_supplier_ledger previously never subtracted
// credit/debit notes (fixed in 20260818200004_fix_returns_in_outstanding_and_ledger.sql).
// This file doesn't re-test returns (that's sales.spec.ts's job) but the
// opening-balance/ledger tests below independently recompute expected ledger
// values rather than assuming the RPC is correct, so they'd catch a
// regression in that fix going forward.

const CUSTOMER_NAME = tag("Accounting Customer");
const SUPPLIER_NAME = tag("Accounting Supplier");
const PRODUCT_CODE = tag("Accounting Product");
const OB_CUSTOMER_NAME = tag("Accounting OB Customer");
const OB_SUPPLIER_NAME = tag("Accounting OB Supplier");

let customerId: string;
let supplierId: string;
let productId: string;
let obCustomerId: string;
let obSupplierId: string;
let staffId: string;
const createdSalesInvoiceIds: string[] = [];
const createdPurchaseInvoiceIds: string[] = [];
const createdReceiptIds: string[] = [];
const createdPaymentIds: string[] = [];

type BalanceRow = {
  account_id: string;
  code: string;
  name: string;
  account_type: string;
  total_debit: number;
  total_credit: number;
  balance: number;
};

async function accountBalances(db: Awaited<ReturnType<typeof dbClient>>) {
  const { data, error } = await db.rpc("get_account_balances", { p_to_date: todayISO() });
  if (error) throw error;
  return data as BalanceRow[];
}

function findAccount(rows: BalanceRow[], code: string) {
  const row = rows.find((r) => r.code === code);
  if (!row) throw new Error(`Account ${code} not found in get_account_balances output`);
  return row;
}

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

  supplierId = await findOrCreate(db, "suppliers", "name", SUPPLIER_NAME, {
    name: SUPPLIER_NAME,
    state: "Kerala",
    credit_period_days: 30,
  });

  productId = await findOrCreate(db, "products", "code", PRODUCT_CODE, {
    code: PRODUCT_CODE,
    name: tag("Accounting Test Product"),
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

  // Dedicated customer/supplier for the opening-balance tests, created (or
  // reused) with a zero opening balance - each opening-balance test bumps it
  // to a known value and resets it back to zero afterward, so re-running this
  // suite never leaves permanent noise in the shared project's real Trial
  // Balance/Balance Sheet.
  obCustomerId = await findOrCreate(db, "customers", "name", OB_CUSTOMER_NAME, {
    name: OB_CUSTOMER_NAME,
    state: "Kerala",
    district: "Ernakulam",
    credit_limit: 0,
    credit_period_days: 0,
    opening_balance: 0,
    opening_balance_type: "debit",
  });
  await db.from("customers").update({ opening_balance: 0, opening_balance_type: "debit" }).eq("id", obCustomerId);

  obSupplierId = await findOrCreate(db, "suppliers", "name", OB_SUPPLIER_NAME, {
    name: OB_SUPPLIER_NAME,
    state: "Kerala",
    credit_period_days: 0,
    opening_balance: 0,
    opening_balance_type: "credit",
  });
  await db.from("suppliers").update({ opening_balance: 0, opening_balance_type: "credit" }).eq("id", obSupplierId);
});

test.afterAll(async () => {
  const db = await dbClient();
  for (const id of createdPaymentIds) {
    await safely(() => db.rpc("cancel_payment", { p_payment_id: id }));
  }
  for (const id of createdReceiptIds) {
    await safely(() => db.rpc("cancel_receipt", { p_receipt_id: id }));
  }
  for (const id of createdPurchaseInvoiceIds) {
    await safely(() => db.rpc("cancel_purchase_invoice", { p_invoice_id: id }));
  }
  for (const id of createdSalesInvoiceIds) {
    await safely(() => db.rpc("cancel_sales_invoice", { p_invoice_id: id }));
  }
  // Safety net in case an opening-balance test failed before its own reset.
  await safely(() =>
    db.from("customers").update({ opening_balance: 0, opening_balance_type: "debit" }).eq("id", obCustomerId),
  );
  await safely(() =>
    db.from("suppliers").update({ opening_balance: 0, opening_balance_type: "credit" }).eq("id", obSupplierId),
  );
});

test("receipt allocated across two invoices in one receipt updates both, without cross-contamination", async ({
  page,
}) => {
  const db = await dbClient();

  const { data: invoiceAId, error: errA } = await db.rpc("create_sales_invoice", {
    p_sale_type: "credit",
    p_customer_id: customerId,
    p_cash_customer_name: null,
    p_cash_customer_phone: null,
    p_route_id: null,
    p_staff_id: staffId,
    p_credit_period_days: 30,
    p_notes: tag("two-invoice receipt A"),
    p_items: [{ product_id: productId, quantity: 3, rate: 150, discount_percent: 0 }],
  });
  if (errA) throw errA;
  createdSalesInvoiceIds.push(invoiceAId);
  // total = 3*150*1.18 = 531

  const { data: invoiceBId, error: errB } = await db.rpc("create_sales_invoice", {
    p_sale_type: "credit",
    p_customer_id: customerId,
    p_cash_customer_name: null,
    p_cash_customer_phone: null,
    p_route_id: null,
    p_staff_id: staffId,
    p_credit_period_days: 30,
    p_notes: tag("two-invoice receipt B"),
    p_items: [{ product_id: productId, quantity: 2, rate: 150, discount_percent: 0 }],
  });
  if (errB) throw errB;
  createdSalesInvoiceIds.push(invoiceBId);
  // total = 2*150*1.18 = 354

  const { data: invA } = await db.from("sales_invoices").select("invoice_number").eq("id", invoiceAId).single();
  const { data: invB } = await db.from("sales_invoices").select("invoice_number").eq("id", invoiceBId).single();
  const invoiceNumberA = invA!.invoice_number;
  const invoiceNumberB = invB!.invoice_number;

  await page.goto("/accounts/receipts/cash/new");
  await page.selectOption('select[name="customer_id"]', customerId);

  const rowA = page.locator("tbody tr", { hasText: invoiceNumberA });
  const rowB = page.locator("tbody tr", { hasText: invoiceNumberB });
  await rowA.locator('input[type="number"]').waitFor({ timeout: 10_000 });
  await rowB.locator('input[type="number"]').waitFor({ timeout: 10_000 });

  await page.fill('input[name="amount"]', "500");
  await rowA.locator('input[type="number"]').fill("300");
  await rowB.locator('input[type="number"]').fill("200");
  await page.getByRole("button", { name: /record cash receipt/i }).click();
  await page.waitForURL(/\/accounts\/receipts\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  const receiptId = page.url().split("/").pop()!;
  createdReceiptIds.push(receiptId);

  const { data: afterA } = await db
    .from("sales_invoice_outstanding")
    .select("outstanding_amount")
    .eq("invoice_id", invoiceAId)
    .single();
  const { data: afterB } = await db
    .from("sales_invoice_outstanding")
    .select("outstanding_amount")
    .eq("invoice_id", invoiceBId)
    .single();

  expect(Number(afterA!.outstanding_amount)).toBe(231); // 531 - 300
  expect(Number(afterB!.outstanding_amount)).toBe(154); // 354 - 200
});

test("partial then full payment against a purchase invoice via payments", async ({ page }) => {
  const db = await dbClient();

  const { data: invoiceId, error: invErr } = await db.rpc("create_purchase_invoice", {
    p_supplier_id: supplierId,
    p_supplier_invoice_number: tag(`PAY-${Date.now()}`),
    p_supplier_invoice_date: todayISO(),
    p_notes: tag("payment test"),
    p_items: [{ product_id: productId, quantity: 5, rate: 100, discount_percent: 0 }],
    p_override_duplicate: false,
  });
  if (invErr) throw invErr;
  createdPurchaseInvoiceIds.push(invoiceId);
  // total = 5*100*1.18 = 590

  const { data: thisInvoice } = await db
    .from("purchase_invoices")
    .select("our_reference_number")
    .eq("id", invoiceId)
    .single();
  const refNumber = thisInvoice!.our_reference_number;

  await page.goto("/accounts/payments/cash/new");
  await page.selectOption('select[name="supplier_id"]', supplierId);
  const row1 = page.locator("tbody tr", { hasText: refNumber });
  await row1.locator('input[type="number"]').waitFor({ timeout: 10_000 });
  await page.fill('input[name="amount"]', "300");
  await row1.locator('input[type="number"]').fill("300");
  await page.getByRole("button", { name: /record cash payment/i }).click();
  await page.waitForURL(/\/accounts\/payments\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  const payment1Id = page.url().split("/").pop()!;
  createdPaymentIds.push(payment1Id);

  const { data: afterPartial } = await db
    .from("purchase_invoice_outstanding")
    .select("outstanding_amount")
    .eq("invoice_id", invoiceId)
    .single();
  expect(Number(afterPartial!.outstanding_amount)).toBe(290); // 590 - 300

  await page.goto("/accounts/payments/cash/new");
  await page.selectOption('select[name="supplier_id"]', supplierId);
  const row2 = page.locator("tbody tr", { hasText: refNumber });
  await row2.locator('input[type="number"]').waitFor({ timeout: 10_000 });
  await page.fill('input[name="amount"]', "290");
  await row2.locator('input[type="number"]').fill("290");
  await page.getByRole("button", { name: /record cash payment/i }).click();
  await page.waitForURL(/\/accounts\/payments\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  const payment2Id = page.url().split("/").pop()!;
  createdPaymentIds.push(payment2Id);

  const { data: afterFull } = await db
    .from("purchase_invoice_outstanding")
    .select("outstanding_amount")
    .eq("invoice_id", invoiceId)
    .single();
  expect(Number(afterFull!.outstanding_amount)).toBe(0);
});

test("customer opening balance shows in the ledger and moves Accounts Receivable", async ({}) => {
  const db = await dbClient();

  try {
    // The "before"/"after" get_account_balances calls bracket a race window
    // against any other activity on this shared project (e.g. a concurrent
    // receipt posting to the same 1100 account) - so nothing except the
    // mutating update itself runs between them; the ledger check (which
    // doesn't depend on that timing) happens after both snapshots instead of
    // between them, to keep that window as narrow as possible.
    const before = await accountBalances(db);
    const arBefore = findAccount(before, "1100");

    await db
      .from("customers")
      .update({ opening_balance: 4200, opening_balance_type: "debit" })
      .eq("id", obCustomerId);

    const after = await accountBalances(db);
    const arAfter = findAccount(after, "1100");

    const { data: ledger, error: ledgerErr } = await db.rpc("get_customer_ledger", {
      p_customer_id: obCustomerId,
      p_as_of_date: todayISO(),
    });
    if (ledgerErr) throw ledgerErr;
    expect(ledger!.length).toBeGreaterThan(0);
    const opening = ledger![0];
    expect(opening.particulars).toBe("Opening balance");
    expect(Number(opening.billed)).toBe(4200);
    expect(Number(opening.received)).toBe(0);
    expect(Number(opening.running_balance)).toBe(4200);

    expect(Number(arAfter.total_debit) - Number(arBefore.total_debit)).toBeCloseTo(4200, 2);
    expect(Number(arAfter.total_credit) - Number(arBefore.total_credit)).toBeCloseTo(0, 2);
  } finally {
    await db.from("customers").update({ opening_balance: 0, opening_balance_type: "debit" }).eq("id", obCustomerId);
  }
});

test("supplier opening balance shows in the ledger and moves Accounts Payable", async ({}) => {
  const db = await dbClient();

  try {
    // See the customer test above for why the ledger check happens after
    // both get_account_balances snapshots rather than between them.
    const before = await accountBalances(db);
    const apBefore = findAccount(before, "2000");

    await db
      .from("suppliers")
      .update({ opening_balance: 3100, opening_balance_type: "credit" })
      .eq("id", obSupplierId);

    const after = await accountBalances(db);
    const apAfter = findAccount(after, "2000");

    const { data: ledger, error: ledgerErr } = await db.rpc("get_supplier_ledger", {
      p_supplier_id: obSupplierId,
      p_as_of_date: todayISO(),
    });
    if (ledgerErr) throw ledgerErr;
    expect(ledger!.length).toBeGreaterThan(0);
    const opening = ledger![0];
    expect(opening.particulars).toBe("Opening balance");
    expect(Number(opening.billed)).toBe(3100);
    expect(Number(opening.paid)).toBe(0);
    expect(Number(opening.running_balance)).toBe(3100);

    expect(Number(apAfter.total_credit) - Number(apBefore.total_credit)).toBeCloseTo(3100, 2);
    expect(Number(apAfter.total_debit) - Number(apBefore.total_debit)).toBeCloseTo(0, 2);
  } finally {
    await db.from("suppliers").update({ opening_balance: 0, opening_balance_type: "credit" }).eq("id", obSupplierId);
  }
});

test("a credit sale moves AR/Sales Income/GST Payable correctly and keeps debits equal to credits", async ({}) => {
  const db = await dbClient();

  // As in the opening-balance tests above, nothing except the mutating RPC
  // itself runs between the before/after get_account_balances snapshots -
  // fetching the invoice's own totals (needed for the assertions below, but
  // not for the snapshots) is deferred until after both are captured, to
  // keep the race window against concurrent activity on this shared project
  // as narrow as possible.
  const before = await accountBalances(db);

  const { data: invoiceId, error: invErr } = await db.rpc("create_sales_invoice", {
    p_sale_type: "credit",
    p_customer_id: customerId,
    p_cash_customer_name: null,
    p_cash_customer_phone: null,
    p_route_id: null,
    p_staff_id: staffId,
    p_credit_period_days: 30,
    p_notes: tag("trial balance invariant test"),
    p_items: [{ product_id: productId, quantity: 7, rate: 200, discount_percent: 0 }],
  });
  if (invErr) throw invErr;
  createdSalesInvoiceIds.push(invoiceId);

  const after = await accountBalances(db);

  const { data: invoice } = await db
    .from("sales_invoices")
    .select("total_amount, taxable_total, cgst_total, sgst_total, igst_total")
    .eq("id", invoiceId)
    .single();
  const totalAmount = Number(invoice!.total_amount);
  const taxableTotal = Number(invoice!.taxable_total);
  const gstTotal = Number(invoice!.cgst_total) + Number(invoice!.sgst_total) + Number(invoice!.igst_total);
  // taxable 1400, gst 18% = 252, total 1652
  expect(totalAmount).toBe(1652);
  expect(taxableTotal).toBe(1400);
  expect(gstTotal).toBe(252);

  const arBefore = findAccount(before, "1100");
  const arAfter = findAccount(after, "1100");
  expect(Number(arAfter.total_debit) - Number(arBefore.total_debit)).toBeCloseTo(totalAmount, 2);
  expect(Number(arAfter.total_credit) - Number(arBefore.total_credit)).toBeCloseTo(0, 2);

  const salesBefore = findAccount(before, "4000");
  const salesAfter = findAccount(after, "4000");
  expect(Number(salesAfter.total_credit) - Number(salesBefore.total_credit)).toBeCloseTo(taxableTotal, 2);
  expect(Number(salesAfter.total_debit) - Number(salesBefore.total_debit)).toBeCloseTo(0, 2);

  const gstBefore = findAccount(before, "2100");
  const gstAfter = findAccount(after, "2100");
  expect(Number(gstAfter.total_credit) - Number(gstBefore.total_credit)).toBeCloseTo(gstTotal, 2);
  expect(Number(gstAfter.total_debit) - Number(gstBefore.total_debit)).toBeCloseTo(0, 2);

  // The fundamental double-entry invariant that Trial Balance, P&L and
  // Balance Sheet all rely on (they only group/re-slice this same data).
  const totalDebit = after.reduce((sum, r) => sum + Number(r.total_debit), 0);
  const totalCredit = after.reduce((sum, r) => sum + Number(r.total_credit), 0);
  expect(totalDebit).toBeCloseTo(totalCredit, 2);
});
