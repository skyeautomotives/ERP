"use server";

import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/permissions";
import type { Database } from "@/lib/supabase/database.types";

type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];
type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];

const REQUIRED_SHEETS = ["Shop", "Product", "Receivables", "Stock", "ProductPrice"];

export type ImportSkip = { row: number; reason: string };
export type ImportResult = {
  error: string | null;
  routes?: { created: number };
  customers?: { created: number; updated: number; skipped: ImportSkip[] };
  products?: { created: number; updated: number; skipped: ImportSkip[] };
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Imports a legacy-system export in this project's specific 5-sheet format
// (Shop/Product/Receivables/Stock/ProductPrice). Upserts customers (by
// external_code) and products (by code) so re-importing an updated file
// never creates duplicates. Deliberately never touches opening_qty or
// opening_balance on a row that already exists - those are one-time starting
// points, not resyncable "current" values, and real sales/purchases/receipts
// may have moved them since the last import (see docs/DEV_LOG.md for why).
export async function importLegacyData(formData: FormData): Promise<ImportResult> {
  const user = await getCurrentUser();
  if (!user || user.roleName !== "Admin") {
    return { error: "Only an Admin can import data." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }

  let workbook: XLSX.WorkBook;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    workbook = XLSX.read(buf, { type: "buffer" });
  } catch {
    return { error: "Could not read this file - make sure it's a valid .xls or .xlsx export." };
  }

  const missingSheets = REQUIRED_SHEETS.filter((s) => !workbook.SheetNames.includes(s));
  if (missingSheets.length > 0) {
    return { error: `This file is missing expected sheet(s): ${missingSheets.join(", ")}.` };
  }

  function rows(sheetName: string): Record<string, unknown>[] {
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null, raw: false });
  }

  const supabase = await createClient();
  const shopRows = rows("Shop");
  const productRows = rows("Product");
  const receivableRows = rows("Receivables");
  const stockRows = rows("Stock");
  const priceRows = rows("ProductPrice");

  // --- Routes: find-or-create by trimmed name ---
  const routeNames = [...new Set(shopRows.map((r) => str(r.Route)).filter((v): v is string => v !== null))];
  const routeIdByName = new Map<string, string>();
  let routesCreated = 0;
  for (const name of routeNames) {
    const { data: existing } = await supabase.from("routes").select("id").eq("name", name).maybeSingle();
    if (existing) {
      routeIdByName.set(name, existing.id);
      continue;
    }
    const { data: created, error } = await supabase
      .from("routes")
      .insert({ name, created_by: user!.id })
      .select("id")
      .single();
    if (error || !created) continue;
    routeIdByName.set(name, created.id);
    routesCreated++;
  }

  // --- Receivables: sum Amount per ThirdPartyShopCode ---
  const openingBalanceByShopCode = new Map<string, number>();
  for (const r of receivableRows) {
    const code = str(r.ThirdPartyShopCode);
    const amount = num(r.Amount);
    if (!code || amount === null) continue;
    openingBalanceByShopCode.set(code, (openingBalanceByShopCode.get(code) ?? 0) + amount);
  }

  // --- Customers ---
  const shopCodes = shopRows.map((r) => str(r.ThirdPartyShopCode)).filter((v): v is string => v !== null);
  const { data: existingCustomerRows } = await supabase
    .from("customers")
    .select("external_code")
    .in("external_code", shopCodes.length > 0 ? shopCodes : [""]);
  const existingCustomerCodes = new Set((existingCustomerRows ?? []).map((r) => r.external_code as string));

  const customerSkipped: ImportSkip[] = [];
  const newCustomers: CustomerInsert[] = [];
  const updatedCustomers: CustomerInsert[] = [];
  shopRows.forEach((r, i) => {
    const name = str(r.Name);
    const externalCode = str(r.ThirdPartyShopCode);
    if (!name || !externalCode) {
      customerSkipped.push({ row: i + 2, reason: !name ? "Missing Name" : "Missing ThirdPartyShopCode" });
      return;
    }
    const routeName = str(r.Route);
    const isNew = !existingCustomerCodes.has(externalCode);
    const base: CustomerInsert = {
      external_code: externalCode,
      name,
      address: str(r.Address),
      district: str(r.District),
      state: str(r.State),
      route_id: routeName ? (routeIdByName.get(routeName) ?? null) : null,
      created_by: user!.id,
    };
    // Opening balance only applies the first time a customer is created -
    // never overwrite it on a re-import (same reasoning as product stock).
    if (isNew) {
      const openingBalance = openingBalanceByShopCode.get(externalCode);
      if (openingBalance !== undefined) {
        base.opening_balance = openingBalance;
        base.opening_balance_type = "debit";
      }
      newCustomers.push(base);
    } else {
      updatedCustomers.push(base);
    }
  });

  let customersCreated = 0;
  let customersUpdated = 0;
  // New customers don't all have the same keys (opening_balance only on some) -
  // upsert requires a homogeneous column set per call, so split further by shape.
  const newCustomersWithBalance = newCustomers.filter((c) => "opening_balance" in c);
  const newCustomersWithoutBalance = newCustomers.filter((c) => !("opening_balance" in c));
  for (const group of [newCustomersWithBalance, newCustomersWithoutBalance, updatedCustomers]) {
    for (const batch of chunk(group, 200)) {
      if (batch.length === 0) continue;
      const { error } = await supabase.from("customers").upsert(batch, { onConflict: "external_code" });
      if (error) {
        for (const rec of batch) customerSkipped.push({ row: -1, reason: `${rec.name}: ${error.message}` });
      }
    }
  }
  customersCreated = newCustomers.length - customerSkipped.filter((s) => s.row === -1).length;
  customersUpdated = updatedCustomers.length;

  // --- Products (joined with Stock + ProductPrice) ---
  const stockByCode = new Map<string, number>();
  for (const r of stockRows) {
    const code = str(r.ProductCode);
    const qty = num(r.Quantity);
    if (code && qty !== null) stockByCode.set(code, (stockByCode.get(code) ?? 0) + qty);
  }
  const purchaseRateByCode = new Map<string, number>();
  for (const r of priceRows) {
    if (r.PriceType !== "Wprice") continue;
    const code = str(r.ProductCode);
    const value = num(r.Value);
    if (code && value !== null && value > 0) purchaseRateByCode.set(code, value);
  }

  const productCodes = productRows.map((r) => str(r["Third Party Product Code"])).filter((v): v is string => v !== null);
  const { data: existingProductRows } = await supabase
    .from("products")
    .select("code")
    .in("code", productCodes.length > 0 ? productCodes : [""]);
  const existingProductCodes = new Set((existingProductRows ?? []).map((r) => r.code as string));

  const productSkipped: ImportSkip[] = [];
  const newProducts: ProductInsert[] = [];
  const updatedProducts: ProductInsert[] = [];
  productRows.forEach((r, i) => {
    const code = str(r["Third Party Product Code"]);
    const name = str(r.ProductName) ?? str(r["Product Code"]);
    if (!code || !name) {
      productSkipped.push({ row: i + 2, reason: !code ? "Missing Third Party Product Code" : "Missing product name" });
      return;
    }
    const isNew = !existingProductCodes.has(code);
    const base: ProductInsert = {
      code,
      name,
      unit: str(r["Base Unit"]),
      product_group: str(r.ProdCategory),
      product_sub_group: str(r.ProdClassification),
      created_by: user!.id,
    };
    const purchaseRate = purchaseRateByCode.get(code);
    if (purchaseRate !== undefined) base.purchase_rate = purchaseRate;
    if (isNew) {
      base.opening_qty = stockByCode.get(code) ?? 0;
      newProducts.push(base);
    } else {
      updatedProducts.push(base);
    }
  });

  let productsCreated = 0;
  const newProductsWithRate = newProducts.filter((p) => "purchase_rate" in p);
  const newProductsWithoutRate = newProducts.filter((p) => !("purchase_rate" in p));
  const updatedProductsWithRate = updatedProducts.filter((p) => "purchase_rate" in p);
  const updatedProductsWithoutRate = updatedProducts.filter((p) => !("purchase_rate" in p));
  for (const group of [newProductsWithRate, newProductsWithoutRate, updatedProductsWithRate, updatedProductsWithoutRate]) {
    for (const batch of chunk(group, 200)) {
      if (batch.length === 0) continue;
      const { error } = await supabase.from("products").upsert(batch, { onConflict: "code" });
      if (error) {
        for (const rec of batch) productSkipped.push({ row: -1, reason: `${rec.name}: ${error.message}` });
      }
    }
  }
  productsCreated = newProducts.length - productSkipped.filter((s) => s.row === -1).length;

  revalidatePath("/masters/customers");
  revalidatePath("/masters/products");
  revalidatePath("/masters/routes");

  return {
    error: null,
    routes: { created: routesCreated },
    customers: { created: customersCreated, updated: customersUpdated, skipped: customerSkipped },
    products: { created: productsCreated, updated: updatedProducts.length, skipped: productSkipped },
  };
}
