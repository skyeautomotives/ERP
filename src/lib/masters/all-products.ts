import { createClient } from "@/lib/supabase/server";

// Supabase's PostgREST layer enforces a hard server-side row cap (1000 here)
// that .limit()/.range() cannot raise past - a single-shot query silently
// truncates once the catalog crosses that count, which is exactly what
// happened the day the product count passed 1000: every "pick a product"
// dropdown in the app started silently missing roughly a third of the
// catalog with no error anywhere. This loops in pages of 1000 until the
// catalog is exhausted, so it keeps working correctly regardless of how
// large the catalog grows.
const PAGE_SIZE = 1000;

export type ActiveProductOption = {
  id: string;
  code: string;
  name: string;
  default_rate: number | null;
  gst_percent: number;
};

export async function getAllActiveProducts(
  rateColumn: "selling_rate" | "purchase_rate" = "selling_rate",
): Promise<ActiveProductOption[]> {
  const supabase = await createClient();
  const all: ActiveProductOption[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select(`id, code, name, default_rate:${rateColumn}, gst_percent`)
      .eq("is_active", true)
      .order("name")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    all.push(...(data as unknown as ActiveProductOption[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}
