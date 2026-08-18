import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";

const TYPE_LABELS: Record<string, string> = {
  purchase: "Purchase",
  purchase_cancel: "Purchase cancelled",
  sale: "Sale",
  sale_cancel: "Sale cancelled",
  adjustment: "Adjustment",
};

export default async function StockMovementPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const user = await getCurrentUser();
  if (!can(user, "inventory", "view")) redirect("/unauthorized");

  const supabase = await createClient();
  const [{ data: product }, { data: transactions }] = await Promise.all([
    supabase.from("products").select("id, code, name, opening_qty").eq("id", productId).single(),
    supabase
      .from("stock_transactions")
      .select("id, quantity_change, transaction_type, reference_table, created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: true }),
  ]);

  if (!product) notFound();

  let running = Number(product.opening_qty) || 0;
  const rows = (transactions ?? []).map((t) => {
    running += Number(t.quantity_change);
    return { ...t, balance: running };
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {product.code} - {product.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Stock movement history</p>
        </div>
        <div className="flex gap-2">
          {can(user, "masters", "view") && (
            <Link
              href={`/masters/products/${product.id}`}
              className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Edit product details
            </Link>
          )}
          {can(user, "inventory", "create") && (
            <Link
              href="/inventory/adjustments"
              className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Record adjustment
            </Link>
          )}
        </div>
      </div>
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Stock quantity isn&apos;t edited directly - it&apos;s the running total of opening stock plus every
        purchase, sale, and adjustment below. To correct a wrong count, record an adjustment instead of
        editing history.
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Change</th>
              <th className="px-4 py-2 font-medium">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            <tr>
              <td className="px-4 py-2 text-gray-500 dark:text-gray-400">-</td>
              <td className="px-4 py-2 text-gray-500 dark:text-gray-400">Opening stock</td>
              <td className="px-4 py-2 text-gray-500 dark:text-gray-400">-</td>
              <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{product.opening_qty}</td>
            </tr>
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                  {new Date(t.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                  {TYPE_LABELS[t.transaction_type] ?? t.transaction_type}
                </td>
                <td
                  className={
                    Number(t.quantity_change) < 0
                      ? "px-4 py-2 text-red-600 dark:text-red-400"
                      : "px-4 py-2 text-green-600 dark:text-green-400"
                  }
                >
                  {Number(t.quantity_change) > 0 ? "+" : ""}
                  {t.quantity_change}
                </td>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{t.balance}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                  No stock movement recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
