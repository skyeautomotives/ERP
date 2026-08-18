"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSalesOrder } from "./actions";
import type { InvoiceLineInput } from "../actions";
import { LineItemRow, type LineItem, type ProductOption } from "@/components/line-item-row";
import { enqueue } from "@/lib/offline-queue";
import { QuickAddButton } from "@/components/quick-add-button";
import { quickCreateCustomer } from "@/app/(app)/masters/customers/quick-create";

type CustomerOption = { id: string; name: string; route_id: string | null; assigned_user_id: string | null };
type Option = { id: string; label: string };

const emptyItem = (): LineItem => ({ product_id: "", quantity: 0, rate: 0, discount_percent: 0, gst_percent: 0 });

export function SalesOrderForm({
  customers,
  routes,
  staff,
  products,
  userId,
}: {
  customers: CustomerOption[];
  routes: Option[];
  staff: Option[];
  products: ProductOption[];
  userId: string;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>(customers);
  const [productOptions, setProductOptions] = useState<ProductOption[]>(products);
  const [routeId, setRouteId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [error, setError] = useState<string | null>(null);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleCustomerChange(id: string) {
    setCustomerId(id);
    const customer = customerOptions.find((c) => c.id === id);
    if (customer?.route_id) setRouteId(customer.route_id);
    if (customer?.assigned_user_id) setStaffId(customer.assigned_user_id);
  }

  function handleProductCreated(product: ProductOption) {
    setProductOptions((prev) => [...prev, product]);
  }

  function updateItem(index: number, updated: LineItem) {
    setItems((prev) => prev.map((it, i) => (i === index ? updated : it)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!customerId) {
      setError("Please select a customer.");
      return;
    }
    const validItems: InvoiceLineInput[] = items
      .filter((it) => it.product_id && it.quantity > 0)
      .map((it) => ({
        product_id: it.product_id,
        quantity: it.quantity,
        rate: it.rate,
        discount_percent: it.discount_percent || 0,
        gst_percent: it.gst_percent || 0,
      }));
    if (validItems.length === 0) {
      setError("Add at least one product line with a quantity.");
      return;
    }

    const payload = {
      customer_id: customerId,
      route_id: routeId || null,
      staff_id: staffId || null,
      notes: notes || null,
      items: validItems,
    };

    startTransition(async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        enqueue(userId, "sales_order", payload);
        setOfflineSaved(true);
        return;
      }
      try {
        const clientId = crypto.randomUUID();
        const result = await createSalesOrder({ ...payload, client_id: clientId });
        if (result?.error) {
          setError(result.error);
          return;
        }
        router.push(`/sales/orders/${result.id}`);
      } catch {
        enqueue(userId, "sales_order", payload);
        setOfflineSaved(true);
      }
    });
  }

  if (offlineSaved) {
    return (
      <div className="rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm text-amber-800 dark:text-amber-300">
        <p className="font-medium">Saved offline</p>
        <p className="mt-1">
          No connection right now - this sales order is queued on this device and will sync automatically once
          you&apos;re back online. You can check its status any time on My Workspace &gt; Sync Status.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Customer</label>
          <div className="flex items-center gap-2">
            <select
              name="customer_id"
              value={customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm"
            >
              <option value="">Select customer...</option>
              {customerOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <QuickAddButton
              buttonLabel="+ New"
              dialogTitle="New customer"
              fields={[
                { name: "name", label: "Customer name", required: true },
                { name: "phone", label: "Phone" },
              ]}
              onSubmit={(values) => quickCreateCustomer({ name: values.name, phone: values.phone })}
              onCreated={(result) => {
                const newCustomer: CustomerOption = {
                  id: result.id!,
                  name: result.label ?? "",
                  route_id: null,
                  assigned_user_id: null,
                };
                setCustomerOptions((prev) => [...prev, newCustomer]);
                setCustomerId(newCustomer.id);
              }}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Route</label>
          <select
            name="route_id"
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm"
          >
            <option value="">None</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Sales staff</label>
          <select
            name="staff_id"
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm"
          >
            <option value="">Select staff...</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Products</label>
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, emptyItem()])}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            + Add line
          </button>
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <LineItemRow
              key={i}
              item={item}
              products={productOptions}
              customerId={customerId || null}
              onChange={(updated) => updateItem(i, updated)}
              onRemove={() => removeItem(i)}
              onProductCreated={handleProductCreated}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Create sales order"}
      </button>
    </form>
  );
}
