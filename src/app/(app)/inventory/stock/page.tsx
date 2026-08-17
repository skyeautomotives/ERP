import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { SearchInput } from "@/components/search-input";

const todayISO = () => new Date().toISOString().slice(0, 10);

export default async function StockReportPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; lowStock?: string; asOf?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user, "inventory", "view")) redirect("/unauthorized");

  const { q, lowStock, asOf } = await searchParams;
  const supabase = await createClient();
  const asOfDate = asOf || todayISO();
  const isToday = asOfDate === todayISO();

  const { data: rows } = isToday
    ? await supabase.from("product_stock_levels").select("*").eq("is_active", true).order("name")
    : await supabase.rpc("get_stock_as_of", { p_as_of_date: asOfDate });

  let filtered = rows ?? [];
  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter(
      (r) => r.name?.toLowerCase().includes(needle) || r.code?.toLowerCase().includes(needle),
    );
  }
  if (lowStock === "1") {
    filtered = filtered.filter((r) => (r.min_stock_level ?? 0) > 0 && (r.current_qty ?? 0) <= (r.min_stock_level ?? 0));
  }

  const totalValue = filtered.reduce((sum, r) => sum + (r.stock_value ?? 0), 0);

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Stock Report</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Live stock levels and valuation, computed from every purchase, sale, and adjustment recorded so far.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <SearchInput placeholder="Search by name or code..." />
        <form className="flex items-end gap-2">
          {q && <input type="hidden" name="q" value={q} />}
          {lowStock === "1" && <input type="hidden" name="lowStock" value="1" />}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">As of date</label>
            <input
              type="date"
              name="asOf"
              defaultValue={asOfDate}
              max={todayISO()}
              className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
            />
          </div>
          <button
            type="submit"
            className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Apply
          </button>
        </form>
        <Link
          href={`?${q ? `q=${q}&` : ""}${lowStock === "1" ? "" : "lowStock=1"}${asOf ? `&asOf=${asOf}` : ""}`}
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            lowStock === "1"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Low stock only
        </Link>
      </div>

      <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Total stock value{isToday ? "" : ` as of ${asOfDate}`}
        </p>
        <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">Rs.{totalValue.toFixed(2)}</p>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Code</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Group</th>
              <th className="px-4 py-2 font-medium">Brand</th>
              <th className="px-4 py-2 font-medium">Qty</th>
              <th className="px-4 py-2 font-medium">Unit cost</th>
              <th className="px-4 py-2 font-medium">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((r) => {
              const isLow = (r.min_stock_level ?? 0) > 0 && (r.current_qty ?? 0) <= (r.min_stock_level ?? 0);
              return (
                <tr key={r.product_id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.code}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/inventory/stock/${r.product_id}`}
                      className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.product_group ?? "-"}</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{r.brand ?? "-"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        isLow
                          ? "rounded bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-400"
                          : "text-gray-900 dark:text-gray-100"
                      }
                    >
                      {r.current_qty}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{Number(r.unit_cost ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{Number(r.stock_value ?? 0).toFixed(2)}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                  No products match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
