import { test, expect } from "@playwright/test";
import { dbClient, tag, safely, findOrCreate, todayISO } from "./helpers";

// Covers spec section 58's GST checklist: CGST, SGST, IGST, sales GST, purchase
// GST, credit notes. Tagged master data is reused across runs via findOrCreate;
// transactional records (invoices/credit notes) are cancelled afterward, never
// deleted - the app's real "undo", matching this project's "cancel, never
// delete" convention for anything that isn't master data.
//
// Pre-existing condition this file works around: create_sales_invoice/
// create_purchase_invoice compute
//   v_is_interstate := customer_state is not null and company_state is not null
//                       and lower(trim(customer_state)) <> lower(trim(company_state))
// so whenever company_settings.state is null (true of the live database as of
// this writing - Settings > Company was never filled in), v_is_interstate is
// always false and every sale/purchase comes out intrastate (CGST+SGST) no
// matter what state the customer/supplier is in - IGST can never actually
// trigger. To exercise IGST for real rather than just trusting the code,
// beforeAll below reads the current company_settings.state, fills it in only
// if it was null, runs the suite against that, and afterAll restores exactly
// what it found (even if that's null again) - this is live production config,
// not disposable test data.

const SAME_STATE_CUSTOMER = tag("GST Customer Same-State");
const DIFF_STATE_CUSTOMER = tag("GST Customer Diff-State");
const SUPPLIER_NAME = tag("GST Supplier");
const PRODUCT_CODE = tag("GSTSKU1");
const GST_PERCENT = 18;

// Fallback pair used only if company_settings.state was null to begin with.
const FALLBACK_STATE = "Kerala";
const FALLBACK_OTHER_STATE = "Karnataka";

let companySettingsId: string;
let originalCompanyState: string | null;
let companyState: string; // state actually in effect for the "same state" case
let otherState: string; // a state guaranteed different from companyState

let sameStateCustomerId: string;
let diffStateCustomerId: string;
let supplierId: string;
let productId: string;
let staffId: string;

const createdInvoiceIds: string[] = [];
const createdPurchaseInvoiceIds: string[] = [];
const createdCreditNoteIds: string[] = [];

test.beforeAll(async () => {
  const db = await dbClient();

  const { data: me } = await db.auth.getUser();
  staffId = me.user!.id;

  const { data: settings, error: settingsErr } = await db
    .from("company_settings")
    .select("id, state")
    .single();
  if (settingsErr) throw settingsErr;
  companySettingsId = settings!.id;
  originalCompanyState = settings!.state;

  if (originalCompanyState === null || originalCompanyState.trim() === "") {
    // Real gap in the live setup - only touch it because it was empty to begin with.
    companyState = FALLBACK_STATE;
    otherState = FALLBACK_OTHER_STATE;
    const { error } = await db
      .from("company_settings")
      .update({ state: companyState })
      .eq("id", companySettingsId);
    if (error) throw error;
  } else {
    // Already configured - don't overwrite it, just pick a genuinely different
    // state for the interstate case.
    companyState = originalCompanyState;
    otherState =
      originalCompanyState.trim().toLowerCase() === FALLBACK_STATE.toLowerCase()
        ? FALLBACK_OTHER_STATE
        : FALLBACK_STATE;
  }

  sameStateCustomerId = await findOrCreate(db, "customers", "name", SAME_STATE_CUSTOMER, {
    name: SAME_STATE_CUSTOMER,
    state: companyState,
    district: "Test District",
    gstin: "32AAAAA0000A1Z5",
    credit_limit: 100000,
    credit_period_days: 30,
  });
  // findOrCreate only reactivates an existing row - force the state fields to
  // match this run's companyState/otherState in case a prior run picked the
  // other pairing (e.g. company_settings.state has since been filled in for real).
  await db.from("customers").update({ state: companyState }).eq("id", sameStateCustomerId);

  diffStateCustomerId = await findOrCreate(db, "customers", "name", DIFF_STATE_CUSTOMER, {
    name: DIFF_STATE_CUSTOMER,
    state: otherState,
    district: "Test District",
    gstin: "29BBBBB0000B1Z3",
    credit_limit: 100000,
    credit_period_days: 30,
  });
  await db.from("customers").update({ state: otherState }).eq("id", diffStateCustomerId);

  supplierId = await findOrCreate(db, "suppliers", "name", SUPPLIER_NAME, {
    name: SUPPLIER_NAME,
    state: companyState,
    gstin: "32CCCCC0000C1Z1",
    credit_period_days: 30,
  });
  await db.from("suppliers").update({ state: companyState }).eq("id", supplierId);

  productId = await findOrCreate(db, "products", "code", PRODUCT_CODE, {
    code: PRODUCT_CODE,
    name: tag("GST Test Product"),
    unit: "pcs",
    hsn_code: tag("HSN9999"),
    mrp: 200,
    purchase_rate: 100,
    selling_rate: 150,
    landing_cost: 100,
    gst_percent: GST_PERCENT,
    opening_qty: 1000,
    min_stock_level: 0,
    max_stock_level: 10000,
  });
});

test.afterAll(async () => {
  const db = await dbClient();
  for (const id of createdCreditNoteIds) {
    await safely(() => db.rpc("cancel_credit_note", { p_credit_note_id: id }));
  }
  for (const id of createdInvoiceIds) {
    await safely(() => db.rpc("cancel_sales_invoice", { p_invoice_id: id }));
  }
  for (const id of createdPurchaseInvoiceIds) {
    await safely(() => db.rpc("cancel_purchase_invoice", { p_invoice_id: id }));
  }
  // Restore company_settings.state to exactly what it was before this file ran.
  await safely(() =>
    db.from("company_settings").update({ state: originalCompanyState }).eq("id", companySettingsId),
  );
});

test("CGST + SGST split for an intrastate sale", async () => {
  const db = await dbClient();
  const { data: invoiceId, error } = await db.rpc("create_sales_invoice", {
    p_sale_type: "credit",
    p_customer_id: sameStateCustomerId,
    p_cash_customer_name: null,
    p_cash_customer_phone: null,
    p_route_id: null,
    p_staff_id: staffId,
    p_credit_period_days: 30,
    p_notes: tag("intrastate sale"),
    p_items: [{ product_id: productId, quantity: 5, rate: 100, discount_percent: 0 }],
  });
  if (error) throw error;
  createdInvoiceIds.push(invoiceId);

  const { data: invoice } = await db
    .from("sales_invoices")
    .select("taxable_total, cgst_total, sgst_total, igst_total")
    .eq("id", invoiceId)
    .single();

  const taxable = Number(invoice!.taxable_total);
  expect(taxable).toBe(500); // 5 * 100
  const expectedGst = Math.round(((taxable * GST_PERCENT) / 100) * 100) / 100; // 90
  expect(Number(invoice!.igst_total)).toBe(0);
  expect(Number(invoice!.cgst_total)).toBe(expectedGst / 2);
  expect(Number(invoice!.sgst_total)).toBe(expectedGst / 2);
  expect(Number(invoice!.cgst_total)).toBe(Number(invoice!.sgst_total));
});

test("IGST for an interstate sale", async () => {
  const db = await dbClient();
  const { data: invoiceId, error } = await db.rpc("create_sales_invoice", {
    p_sale_type: "credit",
    p_customer_id: diffStateCustomerId,
    p_cash_customer_name: null,
    p_cash_customer_phone: null,
    p_route_id: null,
    p_staff_id: staffId,
    p_credit_period_days: 30,
    p_notes: tag("interstate sale"),
    p_items: [{ product_id: productId, quantity: 5, rate: 100, discount_percent: 0 }],
  });
  if (error) throw error;
  createdInvoiceIds.push(invoiceId);

  const { data: invoice } = await db
    .from("sales_invoices")
    .select("taxable_total, cgst_total, sgst_total, igst_total")
    .eq("id", invoiceId)
    .single();

  const taxable = Number(invoice!.taxable_total);
  expect(taxable).toBe(500);
  const expectedGst = Math.round(((taxable * GST_PERCENT) / 100) * 100) / 100; // 90
  expect(Number(invoice!.cgst_total)).toBe(0);
  expect(Number(invoice!.sgst_total)).toBe(0);
  expect(Number(invoice!.igst_total)).toBe(expectedGst);
});

test("sales GST posts to the GST Payable ledger account", async () => {
  const db = await dbClient();
  const { data: invoiceId, error } = await db.rpc("create_sales_invoice", {
    p_sale_type: "credit",
    p_customer_id: sameStateCustomerId,
    p_cash_customer_name: null,
    p_cash_customer_phone: null,
    p_route_id: null,
    p_staff_id: staffId,
    p_credit_period_days: 30,
    p_notes: tag("sales journal test"),
    p_items: [{ product_id: productId, quantity: 3, rate: 200, discount_percent: 0 }],
  });
  if (error) throw error;
  createdInvoiceIds.push(invoiceId);

  const { data: invoice } = await db
    .from("sales_invoices")
    .select("cgst_total, sgst_total, igst_total")
    .eq("id", invoiceId)
    .single();
  const invoiceGstTotal =
    Number(invoice!.cgst_total) + Number(invoice!.sgst_total) + Number(invoice!.igst_total);
  expect(invoiceGstTotal).toBe(108); // 3*200=600 taxable, 18% = 108

  const { data: coa } = await db.from("chart_of_accounts").select("id").eq("code", "2100").single();
  const { data: entries } = await db
    .from("journal_entries")
    .select("id")
    .eq("source_table", "sales_invoices")
    .eq("source_id", invoiceId);
  const entryIds = (entries ?? []).map((e) => e.id);
  const { data: lines } = await db
    .from("journal_entry_lines")
    .select("debit_amount, credit_amount")
    .in("entry_id", entryIds)
    .eq("account_id", coa!.id);
  const journalGst = (lines ?? []).reduce(
    (s, l) => s + Number(l.credit_amount) - Number(l.debit_amount),
    0,
  );
  expect(journalGst).toBe(invoiceGstTotal);
});

test("purchase GST posts to the GST Input Credit ledger account", async () => {
  const db = await dbClient();
  const { data: invoiceId, error } = await db.rpc("create_purchase_invoice", {
    p_supplier_id: supplierId,
    p_supplier_invoice_number: tag(`PB-${Date.now()}`),
    p_supplier_invoice_date: todayISO(),
    p_notes: tag("purchase journal test"),
    p_items: [{ product_id: productId, quantity: 4, rate: 100, discount_percent: 0 }],
    p_override_duplicate: false,
  });
  if (error) throw error;
  createdPurchaseInvoiceIds.push(invoiceId);

  const { data: invoice } = await db
    .from("purchase_invoices")
    .select("taxable_total, cgst_total, sgst_total, igst_total")
    .eq("id", invoiceId)
    .single();
  const taxable = Number(invoice!.taxable_total);
  expect(taxable).toBe(400); // 4 * 100
  const expectedGst = Math.round(((taxable * GST_PERCENT) / 100) * 100) / 100; // 72
  expect(Number(invoice!.igst_total)).toBe(0); // supplier is same state as company
  expect(Number(invoice!.cgst_total)).toBe(expectedGst / 2);
  expect(Number(invoice!.sgst_total)).toBe(expectedGst / 2);

  const invoiceGstTotal =
    Number(invoice!.cgst_total) + Number(invoice!.sgst_total) + Number(invoice!.igst_total);

  const { data: coa } = await db.from("chart_of_accounts").select("id").eq("code", "1300").single();
  const { data: entries } = await db
    .from("journal_entries")
    .select("id")
    .eq("source_table", "purchase_invoices")
    .eq("source_id", invoiceId);
  const entryIds = (entries ?? []).map((e) => e.id);
  const { data: lines } = await db
    .from("journal_entry_lines")
    .select("debit_amount, credit_amount")
    .in("entry_id", entryIds)
    .eq("account_id", coa!.id);
  const journalGst = (lines ?? []).reduce(
    (s, l) => s + Number(l.debit_amount) - Number(l.credit_amount),
    0,
  );
  expect(journalGst).toBe(invoiceGstTotal);
});

test("credit note reverses GST proportionally to the returned quantity", async () => {
  const db = await dbClient();
  const { data: invoiceId, error } = await db.rpc("create_sales_invoice", {
    p_sale_type: "credit",
    p_customer_id: sameStateCustomerId,
    p_cash_customer_name: null,
    p_cash_customer_phone: null,
    p_route_id: null,
    p_staff_id: staffId,
    p_credit_period_days: 30,
    p_notes: tag("credit note gst test"),
    p_items: [{ product_id: productId, quantity: 5, rate: 100, discount_percent: 0 }],
  });
  if (error) throw error;
  createdInvoiceIds.push(invoiceId);

  const { data: invoiceItem } = await db
    .from("sales_invoice_items")
    .select("id, quantity, cgst, sgst, igst")
    .eq("invoice_id", invoiceId)
    .single();
  expect(Number(invoiceItem!.quantity)).toBe(5);
  expect(Number(invoiceItem!.cgst)).toBe(45); // 500 taxable * 18% / 2
  expect(Number(invoiceItem!.sgst)).toBe(45);

  const { data: creditNoteId, error: cnErr } = await db.rpc("create_credit_note", {
    p_sales_invoice_id: invoiceId,
    p_reason: tag("gst proportional return test"),
    p_items: [{ sales_invoice_item_id: invoiceItem!.id, quantity: 2 }],
  });
  if (cnErr) throw cnErr;
  createdCreditNoteIds.push(creditNoteId);

  const { data: creditNote } = await db
    .from("credit_notes")
    .select("cgst_total, sgst_total, igst_total")
    .eq("id", creditNoteId)
    .single();

  // 2 of 5 units returned -> exactly 2/5 of the original LINE's GST, not the
  // full invoice's GST (the invoice here only has one line, but the math is
  // done per-line by create_credit_note, not off the invoice total).
  const fraction = 2 / Number(invoiceItem!.quantity);
  const expectedCgst = Math.round(Number(invoiceItem!.cgst) * fraction * 100) / 100;
  const expectedSgst = Math.round(Number(invoiceItem!.sgst) * fraction * 100) / 100;
  expect(Number(creditNote!.cgst_total)).toBe(expectedCgst);
  expect(Number(creditNote!.sgst_total)).toBe(expectedSgst);
  expect(Number(creditNote!.igst_total)).toBe(0);
  expect(Number(creditNote!.cgst_total) + Number(creditNote!.sgst_total)).toBe(36); // 90 * 2/5
  expect(Number(creditNote!.cgst_total) + Number(creditNote!.sgst_total)).not.toBe(90); // not the full line's GST
});

test("GST reports reconcile against the ledger for the period, including credit notes", async () => {
  // Same computation /gst/reconciliation performs (see get_gstr1_b2b,
  // get_gstr1_b2c_summary, get_purchase_register, get_account_balances +
  // the credit_notes/debit_notes tables it reads directly). Recomputing it
  // here and asserting it matches is a spot-check that the report layer -
  // not just the invoice/credit-note rows this file already asserted on
  // directly - actually reflects everything posted today, including this
  // file's own interstate/intrastate sales, purchase, and proportional
  // credit note. This is a whole-period invariant (GSTR-1 net of credit
  // notes must equal what landed in GST Payable; Purchase Register net of
  // debit notes must equal GST Input Credit), so it holds regardless of
  // what else happened today - a mismatch here would mean the reports and
  // the ledger have drifted apart, a real bug either way.
  const db = await dbClient();
  const from = todayISO();
  const to = todayISO();

  const [{ data: b2b }, { data: b2c }, { data: purchaseReg }, { data: balances }, { data: creditNotes }, { data: debitNotes }] =
    await Promise.all([
      db.rpc("get_gstr1_b2b", { p_from: from, p_to: to }),
      db.rpc("get_gstr1_b2c_summary", { p_from: from, p_to: to }),
      db.rpc("get_purchase_register", { p_from: from, p_to: to }),
      db.rpc("get_account_balances", { p_from_date: from, p_to_date: to }),
      db
        .from("credit_notes")
        .select("cgst_total, sgst_total, igst_total")
        .eq("status", "active")
        .gte("credit_note_date", from)
        .lte("credit_note_date", to),
      db
        .from("debit_notes")
        .select("cgst_total, sgst_total, igst_total")
        .eq("status", "active")
        .gte("debit_note_date", from)
        .lte("debit_note_date", to),
    ]);

  type TaxRow = { cgst_total: number; sgst_total: number; igst_total: number };
  const sumTax = (rows: TaxRow[] | null) =>
    (rows ?? []).reduce((s, r) => s + Number(r.cgst_total) + Number(r.sgst_total) + Number(r.igst_total), 0);

  const outputTaxGross = sumTax((b2b ?? []) as TaxRow[]) + sumTax((b2c ?? []) as TaxRow[]);
  const creditNoteTax = sumTax(creditNotes as TaxRow[] | null);
  const outputTaxNet = outputTaxGross - creditNoteTax;

  const inputTaxGross = sumTax((purchaseReg ?? []) as TaxRow[]);
  const debitNoteTax = sumTax(debitNotes as TaxRow[] | null);
  const inputTaxNet = inputTaxGross - debitNoteTax;

  const balanceRows = (balances ?? []) as { code: string; total_debit: number; total_credit: number }[];
  const gstPayable = balanceRows.find((b) => b.code === "2100");
  const gstPayableNet = gstPayable ? Number(gstPayable.total_credit) - Number(gstPayable.total_debit) : 0;
  const gstInputCredit = balanceRows.find((b) => b.code === "1300");
  const gstInputCreditNet = gstInputCredit
    ? Number(gstInputCredit.total_debit) - Number(gstInputCredit.total_credit)
    : 0;

  expect(Math.abs(outputTaxNet - gstPayableNet)).toBeLessThan(0.01);
  expect(Math.abs(inputTaxNet - gstInputCreditNet)).toBeLessThan(0.01);
});
