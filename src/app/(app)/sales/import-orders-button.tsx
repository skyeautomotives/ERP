"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  getPendingSalesOrders,
  convertSalesOrdersBulk,
  type PendingOrderSummary,
} from "./orders/actions";

type ConvertResult = { orderId: string; invoiceId?: string; error?: string };

export function ImportOrdersButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [orders, setOrders] = useState<PendingOrderSummary[] | null>(null);
  const [saleTypes, setSaleTypes] = useState<Record<string, "cash" | "credit">>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<ConvertResult[] | null>(null);
  const [pending, startTransition] = useTransition();

  async function open_() {
    setOpen(true);
    setResults(null);
    setLoadError(null);
    setLoading(true);
    const res = await getPendingSalesOrders();
    setLoading(false);
    if (res.error) {
      setLoadError(res.error);
      return;
    }
    setOrders(res.orders);
    setSaleTypes(Object.fromEntries(res.orders.map((o) => [o.id, "credit" as const])));
    setSelected(new Set());
  }

  function close() {
    setOpen(false);
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (!orders) return;
    setSelected((prev) => (prev.size === orders.length ? new Set() : new Set(orders.map((o) => o.id))));
  }

  function handleConvert() {
    const conversions = Array.from(selected).map((orderId) => ({
      orderId,
      saleType: saleTypes[orderId] ?? "credit",
    }));
    if (conversions.length === 0) return;
    startTransition(async () => {
      const res = await convertSalesOrdersBulk(conversions);
      setResults(res);
      const convertedIds = new Set(res.filter((r) => r.invoiceId).map((r) => r.orderId));
      setOrders((prev) => (prev ? prev.filter((o) => !convertedIds.has(o.id)) : prev));
      setSelected(new Set());
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open_}
        className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        Import from Sales Order
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={close}>
            <div
              className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white dark:bg-gray-900 p-5 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Import from Sales Order</h2>
                <button
                  type="button"
                  onClick={close}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Close
                </button>
              </div>

              {loading && <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading pending orders...</p>}
              {loadError && (
                <p className="mt-4 rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                  {loadError}
                </p>
              )}
              {!loading && !loadError && orders && orders.length === 0 && (
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">No pending sales orders to import.</p>
              )}

              {!loading && orders && orders.length > 0 && (
                <>
                  <div className="mt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {selected.size === orders.length ? "Deselect all" : "Select all"}
                    </button>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{selected.size} selected</span>
                  </div>

                  <ul className="mt-2 space-y-2">
                    {orders.map((o) => (
                      <li key={o.id} className="rounded-md border border-gray-200 dark:border-gray-800 p-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selected.has(o.id)}
                            onChange={() => toggleSelected(o.id)}
                            className="h-4 w-4"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {o.order_number ?? "-"} - {o.customer_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {o.route_name ?? "No route"} - {o.staff_name ?? "No staff"} - Rs.{o.subtotal.toFixed(2)}
                            </p>
                          </div>
                          <select
                            value={saleTypes[o.id] ?? "credit"}
                            onChange={(e) =>
                              setSaleTypes((prev) => ({ ...prev, [o.id]: e.target.value as "cash" | "credit" }))
                            }
                            className="rounded-md border border-gray-300 dark:border-gray-700 px-2 py-1 text-sm"
                          >
                            <option value="credit">Credit</option>
                            <option value="cash">Cash</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => toggleExpanded(o.id)}
                            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {expanded.has(o.id) ? "Hide" : "Preview"}
                          </button>
                        </div>
                        {expanded.has(o.id) && (
                          <ul className="mt-2 border-t border-gray-100 dark:border-gray-800 pt-2 text-xs text-gray-600 dark:text-gray-400">
                            {o.items.map((it, i) => (
                              <li key={i}>
                                {it.product_code} - {it.product_name}: {it.quantity} x Rs.{it.rate.toFixed(2)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    disabled={pending || selected.size === 0}
                    onClick={handleConvert}
                    className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {pending ? "Converting..." : `Convert ${selected.size} order${selected.size === 1 ? "" : "s"}`}
                  </button>
                </>
              )}

              {results && results.length > 0 && (
                <div className="mt-4 border-t border-gray-200 dark:border-gray-800 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Results</h3>
                  <ul className="mt-2 space-y-1 text-sm">
                    {results.map((r) => (
                      <li key={r.orderId}>
                        {r.invoiceId ? (
                          <a href={`/sales/${r.invoiceId}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                            Invoice created - view it
                          </a>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">{r.error ?? "Failed to convert"}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
