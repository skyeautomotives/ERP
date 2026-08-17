import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import { OrderActions } from "../order-actions";
import { HelpButton } from "@/components/help-button";
import { HELP_CONTENT } from "@/lib/help-content";

export default async function SalesOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user, "sales", "view")) redirect("/unauthorized");

  const supabase = await createClient();
  const [{ data: order }, { data: items }] = await Promise.all([
    supabase
      .from("sales_orders")
      .select("*, customers(name), routes(name), user_profiles(full_name)")
      .eq("id", id)
      .single(),
    supabase.from("sales_order_items").select("*, products(code, name)").eq("order_id", id),
  ]);

  if (!order) notFound();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{order.customers?.name ?? "Sales order"}</h1>
            <HelpButton content={HELP_CONTENT["sales-orders"]} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Status: {order.status}</p>
        </div>
        {order.status === "pending" && can(user, "sales", "create") && <OrderActions orderId={order.id} />}
        {order.status === "converted" && order.converted_invoice_id && (
          <Link
            href={`/sales/${order.converted_invoice_id}`}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            View invoice
          </Link>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Route</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">{order.routes?.name ?? "-"}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Sales staff</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">{order.user_profiles?.full_name ?? "-"}</p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Product</th>
              <th className="px-4 py-2 font-medium">Qty</th>
              <th className="px-4 py-2 font-medium">Rate</th>
              <th className="px-4 py-2 font-medium">Disc %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {(items ?? []).map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                  {item.products?.code} - {item.products?.name}
                </td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{item.quantity}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{Number(item.rate).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{item.discount_percent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {order.notes && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-700 dark:text-gray-300">Notes: </span>
          {order.notes}
        </p>
      )}
    </div>
  );
}
