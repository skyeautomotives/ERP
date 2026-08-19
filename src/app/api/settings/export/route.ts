import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/permissions";

// PostgREST enforces a hard 1000-row cap per request regardless of an
// explicit .limit()/.range() - a plain single-shot query silently truncates
// once a table crosses that count. Loops in pages until exhausted so the
// export stays complete as the catalog grows past 1000 rows.
async function fetchAllRows<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const all: T[] = [];
  let from = 0;
  while (true) {
    const { data } = await query(from, from + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

// Exports current customers/products/stock/prices in the exact same 5-sheet
// shape Settings > Data Import expects (same column headers) - round-trips
// with it, and doubles as a plain backup of the master data.
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.roleName !== "Admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: customers }, products, stockLevels, { data: outstanding }] = await Promise.all([
    supabase.from("customers").select("*, routes(name)").order("name"),
    fetchAllRows((from, to) => supabase.from("products").select("*").order("name").range(from, to)),
    fetchAllRows((from, to) => supabase.from("product_stock_levels").select("*").range(from, to)),
    supabase.from("sales_invoice_outstanding").select("*").eq("status", "active").gt("outstanding_amount", 0),
  ]);

  const shopSheet = (customers ?? []).map((c) => ({
    Name: c.name,
    ShortName: c.name,
    Address: c.address ?? "",
    ShopType: "",
    ShopClass: "",
    Location: c.district ?? "",
    City: c.district ?? "",
    District: c.district ?? "",
    State: c.state ?? "",
    Country: "INDIA",
    Continent: "ASIA",
    Distributor: "",
    CustomerGroup: c.category ?? "",
    ContactPerson: "",
    ContactNo: c.phone ?? "",
    MobileNo: "",
    Email: c.email ?? "",
    PINCode: "",
    TINNo: "",
    CSTNo: "",
    ThirdPartyShopCode: c.external_code ?? "",
    Route: c.routes?.name ?? "",
    Beat: "Beat Master",
    SalesPerson: "",
    PriceType: "",
  }));

  const productSheet = products.map((p) => ({
    "Product Code": p.name,
    ProductName: p.name,
    Description: "",
    "Base Unit": p.unit ?? "",
    "Sales Unit(Unit in Mobile)": p.unit ?? "",
    "One Sales Unit": "1",
    "Noof Base Unit": "1",
    ProdCategory: p.product_group ?? "",
    ProdClassification: p.product_sub_group ?? "",
    "Third Party Product Code": p.code,
    ReorderLevel: p.min_stock_level ?? "",
    TriggerLevel: "",
    MinimumOrderQuantity: "",
  }));

  const receivablesSheet = (outstanding ?? []).map((o) => ({
    "Bill Date": o.invoice_date,
    "Bill No": o.invoice_number,
    ThirdPartyShopCode: customers?.find((c) => c.id === o.customer_id)?.external_code ?? "",
    Amount: Number(o.outstanding_amount),
    "Due Date": o.due_date ?? "",
    "OverDue Days": "",
  }));

  const stockSheet = stockLevels.map((s) => ({
    ProductCode: s.code,
    StoreCode: "Main Store",
    Unit: s.unit ?? "",
    Quantity: Number(s.current_qty),
    StockDate: today,
  }));

  const priceSheet = products.map((p) => ({
    ProductCode: p.code,
    PriceType: "Wprice",
    PriceDate: today,
    Value: p.purchase_rate ?? 0,
    Tax: "",
    UnitDescription: p.unit ?? "",
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(shopSheet), "Shop");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(productSheet), "Product");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(receivablesSheet), "Receivables");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(stockSheet), "Stock");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(priceSheet), "ProductPrice");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="skye-erp-export-${today}.xlsx"`,
    },
  });
}
