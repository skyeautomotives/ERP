"use client";

import { useMemo, useState, useTransition } from "react";
import { createSalesInvoice, type InvoiceLineInput } from "./actions";
import { LineItemRow, type LineItem, type ProductOption } from "@/components/line-item-row";
import { QuickAddButton } from "@/components/quick-add-button";
import { quickCreateCustomer } from "@/app/(app)/masters/customers/quick-create";

type CustomerOption = {
  id: string;
  name: string;
  route_id: string | null;
  assigned_user_id: string | null;
  credit_period_days: number;
};
type Option = { id: string; label: string };

const emptyItem = (): LineItem => ({ product_id: "", quantity: 0, rate: 0, discount_percent: 0 });

export function SalesInvoiceForm({
  saleType,
  customers,
  routes,
  staff,
  products,
}: {
  saleType: "credit" | "cash";
  customers: CustomerOption[];
  routes: Option[];
  staff: Option[];
  products: ProductOption[];
}) {
  const [customerId, setCustomerId] = useState<string>("");
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>(customers);
  const [productOptions, setProductOptions] = useState<ProductOption[]>(products);
  const [cashCustomerName, setCashCustomerName] = useState("");
  const [cashCustomerPhone, setCashCustomerPhone] = useState("");
  const [routeId, setRouteId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [creditPeriodDays, setCreditPeriodDays] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCustomerChange(id: string) {
    setCustomerId(id);
    const customer = customerOptions.find((c) => c.id === id);
    if (customer) {
      if (customer.route_id) setRouteId(customer.route_id);
      if (customer.assigned_user_id) setStaffId(customer.assigned_user_id);
      if (saleType === "credit") setCreditPeriodDays(customer.credit_period_days);
    }
  }

  function handleProductCreated(product: ProductOption) {
    setProductOptions((prev) => [...prev, product]);
  }

  const totals = useMemo(() => {
    let subtotal = 0;
    let taxable = 0;
    let gst = 0;
    for (const item of items) {
      const product = productOptions.find((p) => p.id === item.product_id);
      if (!product || !item.quantity || !item.rate) continue;
      const lineSubtotal = item.quantity * item.rate;
      const lineTaxable = lineSubtotal * (1 - (item.discount_percent || 0) / 100);
      const lineGst = lineTaxable * (product.gst_percent / 100);
      subtotal += lineSubtotal;
      taxable += lineTaxable;
      gst += lineGst;
    }
    return { subtotal, taxable, gst, total: taxable + gst };
  }, [items, productOptions]);

  function updateItem(index: number, updated: LineItem) {
    setItems((prev) => prev.map((it, i) => (i === index ? updated : it)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!staffId) {
      setError("Please select the sales staff for this invoice.");
      return;
    }
    if (saleType === "credit" && !customerId) {
      setError("Credit sales require a customer.");
      return;
    }
    if (saleType === "cash" && !customerId && !cashCustomerName.trim()) {
      setError("Enter a customer or a walk-in name for this cash sale.");
      return;
    }
    const validItems: InvoiceLineInput[] = items
      .filter((it) => it.product_id && it.quantity > 0)
      .map((it) => ({
        product_id: it.product_id,
        quantity: it.quantity,
        rate: it.rate,
        discount_percent: it.discount_percent || 0,
      }));
    if (validItems.length === 0) {
      setError("Add at least one product line with a quantity.");
      return;
    }

    startTransition(async () => {
      const result = await createSalesInvoice({
        sale_type: saleType,
        customer_id: customerId || null,
        cash_customer_name: saleType === "cash" ? cashCustomerName || null : null,
        cash_customer_phone: saleType === "cash" ? cashCustomerPhone || null : null,
        route_id: routeId || null,
        staff_id: staffId || null,
        credit_period_days: saleType === "credit" ? creditPeriodDays : 0,
        notes: notes || null,
        items: validItems,
      });
      if (result?.error) setError(result.error);
    });
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
              <option value="">{saleType === "cash" ? "Walk-in (no customer record)" : "Select customer..."}</option>
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
                  credit_period_days: 0,
                };
                setCustomerOptions((prev) => [...prev, newCustomer]);
                setCustomerId(newCustomer.id);
              }}
            />
          </div>
        </div>

        {saleType === "cash" && !customerId && (
          <div className="grid grid-cols-2 gap-2">
            <input
              name="cash_customer_name"
              placeholder="Walk-in name"
              value={cashCustomerName}
              onChange={(e) => setCashCustomerName(e.target.value)}
              className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm"
            />
            <input
              name="cash_customer_phone"
              placeholder="Phone (optional)"
              value={cashCustomerPhone}
              onChange={(e) => setCashCustomerPhone(e.target.value)}
              className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm"
            />
          </div>
        )}

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

        {saleType === "credit" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Credit period (days)</label>
            <input
              name="credit_period_days"
              type="number"
              min="0"
              value={creditPeriodDays}
              onChange={(e) => setCreditPeriodDays(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm"
            />
          </div>
        )}
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

      <div className="rounded-md bg-gray-50 dark:bg-gray-950 p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
          <span>Rs.{totals.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Taxable value</span>
          <span>Rs.{totals.taxable.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">GST</span>
          <span>Rs.{totals.gst.toFixed(2)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-gray-200 dark:border-gray-800 pt-1 font-semibold">
          <span>Total</span>
          <span>Rs.{totals.total.toFixed(2)}</span>
        </div>
      </div>

      {error && <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Saving..." : `Create ${saleType === "credit" ? "credit" : "cash"} sale`}
      </button>
    </form>
  );
}
