import * as XLSX from "xlsx";
import { test, expect } from "@playwright/test";
import { dbClient, tag, safely, todayISO } from "./helpers";

// Covers the Settings > Data Import / Export feature: uploading a legacy-
// system export creates customers/products/routes and sets opening stock,
// and re-uploading the same file upserts instead of duplicating. Builds the
// test workbook in memory (via the same `xlsx` library the feature itself
// uses) rather than committing a binary fixture file to the repo.

const SHOP_CODE_A = tag(`ImportShopA-${Date.now()}`);
const SHOP_CODE_B = tag(`ImportShopB-${Date.now()}`);
const PRODUCT_CODE_A = tag(`ImportProdA-${Date.now()}`);
const PRODUCT_CODE_B = tag(`ImportProdB-${Date.now()}`);
const ROUTE_NAME = tag(`Import Route ${Date.now()}`);

function buildWorkbookBuffer(): Buffer {
  const shop = [
    {
      Name: tag("Import Customer A"),
      Address: "Addr A",
      District: "Ernakulam",
      State: "KERALA",
      ThirdPartyShopCode: SHOP_CODE_A,
      Route: ROUTE_NAME,
    },
    {
      Name: tag("Import Customer B"),
      Address: "Addr B",
      District: "Kottayam",
      State: "KERALA",
      ThirdPartyShopCode: SHOP_CODE_B,
      Route: null,
    },
  ];
  const product = [
    {
      "Product Code": tag("Import Product A"),
      ProductName: tag("Import Product A"),
      "Base Unit": "NOS",
      ProdCategory: "TESTCAT",
      ProdClassification: "TESTCLASS",
      "Third Party Product Code": PRODUCT_CODE_A,
    },
    {
      "Product Code": tag("Import Product B"),
      ProductName: tag("Import Product B"),
      "Base Unit": "NOS",
      ProdCategory: "TESTCAT",
      ProdClassification: "TESTCLASS",
      "Third Party Product Code": PRODUCT_CODE_B,
    },
  ];
  const receivables = [{ "Bill Date": todayISO(), "Bill No": "BILL-1", ThirdPartyShopCode: SHOP_CODE_A, Amount: "500", "Due Date": todayISO() }];
  const stock = [
    { ProductCode: PRODUCT_CODE_A, StoreCode: "Main Store", Unit: "NOS", Quantity: "25", StockDate: todayISO() },
    { ProductCode: PRODUCT_CODE_B, StoreCode: "Main Store", Unit: "NOS", Quantity: "10", StockDate: todayISO() },
  ];
  const productPrice = [
    { ProductCode: PRODUCT_CODE_A, PriceType: "Wprice", PriceDate: todayISO(), Value: "150" },
    { ProductCode: PRODUCT_CODE_B, PriceType: "Wprice", PriceDate: todayISO(), Value: "0" },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(shop), "Shop");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(product), "Product");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(receivables), "Receivables");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stock), "Stock");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productPrice), "ProductPrice");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

test.afterAll(async () => {
  const db = await dbClient();
  // Nothing else references these test-created rows, so a real delete (not
  // deactivate) is safe here, unlike the findOrCreate pattern other spec
  // files use for master data that later tests' transactions build on.
  await safely(() => db.from("customers").delete().in("external_code", [SHOP_CODE_A, SHOP_CODE_B]));
  await safely(() => db.from("products").delete().in("code", [PRODUCT_CODE_A, PRODUCT_CODE_B]));
  await safely(() => db.from("routes").delete().eq("name", ROUTE_NAME));
});

test("importing a legacy export creates customers, products, a route, and opening stock; re-importing upserts instead of duplicating", async ({ page }) => {
  const buffer = buildWorkbookBuffer();

  await page.goto("/settings/import");
  await page.setInputFiles('input[type="file"]', {
    name: "test-import.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer,
  });
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByText("1 created", { exact: false }).first()).toBeVisible({ timeout: 20_000 });

  const db = await dbClient();
  const { data: route } = await db.from("routes").select("id").eq("name", ROUTE_NAME).single();
  expect(route).not.toBeNull();

  const { data: customerA } = await db
    .from("customers")
    .select("name, route_id, opening_balance, opening_balance_type")
    .eq("external_code", SHOP_CODE_A)
    .single();
  expect(customerA!.route_id).toBe(route!.id);
  expect(Number(customerA!.opening_balance)).toBe(500);
  expect(customerA!.opening_balance_type).toBe("debit");

  const { data: customerB } = await db.from("customers").select("route_id").eq("external_code", SHOP_CODE_B).single();
  expect(customerB!.route_id).toBeNull();

  const { data: productA } = await db
    .from("products")
    .select("opening_qty, purchase_rate")
    .eq("code", PRODUCT_CODE_A)
    .single();
  expect(Number(productA!.opening_qty)).toBe(25);
  expect(Number(productA!.purchase_rate)).toBe(150);

  const { data: productB } = await db.from("products").select("purchase_rate").eq("code", PRODUCT_CODE_B).single();
  expect(productB!.purchase_rate).toBeNull(); // source Value was 0 - left unset, not set to 0

  const { data: stockA } = await db.from("product_stock_levels").select("current_qty").eq("code", PRODUCT_CODE_A).single();
  expect(Number(stockA!.current_qty)).toBe(25);

  // Re-import the exact same file - must upsert (0 created), never duplicate,
  // and must NOT reset opening_qty/opening_balance on the now-existing rows.
  await page.goto("/settings/import");
  await page.setInputFiles('input[type="file"]', {
    name: "test-import.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer,
  });
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByText("0 created, 2 updated", { exact: false }).first()).toBeVisible({ timeout: 20_000 });

  const { count: customerCount } = await db
    .from("customers")
    .select("id", { count: "exact", head: true })
    .in("external_code", [SHOP_CODE_A, SHOP_CODE_B]);
  expect(customerCount).toBe(2);

  const { count: productCount } = await db
    .from("products")
    .select("id", { count: "exact", head: true })
    .in("code", [PRODUCT_CODE_A, PRODUCT_CODE_B]);
  expect(productCount).toBe(2);

  const { data: productAAfterReimport } = await db
    .from("products")
    .select("opening_qty")
    .eq("code", PRODUCT_CODE_A)
    .single();
  expect(Number(productAAfterReimport!.opening_qty)).toBe(25); // untouched, not reset
});
