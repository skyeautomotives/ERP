"use client";

import { useMemo, useState, useTransition } from "react";
import { createPurchaseInvoice, type PurchaseLineInput } from "./actions";
import { LineItemRow, type LineItem, type ProductOption } from "@/components/line-item-row";
import { QuickAddButton } from "@/components/quick-add-button";
import { quickCreateSupplier } from "@/app/(app)/masters/suppliers/quick-create";

type Option = { id: string; label: string };
const emptyItem = (): LineItem => ({ product_id: "", quantity: 0, rate: 0, discount_percent: 0, gst_percent: 0 });
const todayISO = () => new Date().toISOString().slice(0, 10);

export function PurchaseInvoiceForm({
  suppliers,
  products,
}: {
  suppliers: Option[];
  products: ProductOption[];
}) {
  const [supplierId, setSupplierId] = useState("");
  const [supplierOptions, setSupplierOptions] = useState<Option[]>(suppliers);
  const [productOptions, setProductOptions] = useState<ProductOption[]>(products);
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState("");
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleProductCreated(product: ProductOption) {
    setProductOptions((prev) => [...prev, product]);
  }

  const totals = useMemo(() => {
    let subtotal = 0;
    let taxable = 0;
    let gst = 0;
    for (const item of items) {
      if (!item.product_id || !item.quantity || !item.rate) continue;
      const lineSubtotal = item.quantity * item.rate;
      const lineTaxable = lineSubtotal * (1 - (item.discount_percent || 0) / 100);
      const lineGst = lineTaxable * ((item.gst_percent || 0) / 100);
      subtotal += lineSubtotal;
      taxable += lineTaxable;
      gst += lineGst;
    }
    return { subtotal, taxable, gst, total: taxable + gst };
  }, [items]);

  function updateItem(index: number, updated: LineItem) {
    setItems((prev) => {
      const next = prev.map((it, i) => (i === index ? updated : it));
      const isLastRow = index === prev.length - 1;
      const justPickedProduct = !prev[index].product_id && updated.product_id;
      if (isLastRow && justPickedProduct) next.push(emptyItem());
      return next;
    });
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function buildValidItems(): PurchaseLineInput[] {
    return items
      .filter((it) => it.product_id && it.quantity > 0)
      .map((it) => ({
        product_id: it.product_id,
        quantity: it.quantity,
        rate: it.rate,
        discount_percent: it.discount_percent || 0,
        gst_percent: it.gst_percent || 0,
      }));
  }

  function submit(overrideDuplicate: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await createPurchaseInvoice({
        supplier_id: supplierId || null,
        supplier_invoice_number: supplierInvoiceNumber,
        supplier_invoice_date: supplierInvoiceDate,
        notes: notes || null,
        items: buildValidItems(),
        overrideDuplicate,
      });
      if (result?.duplicate) {
        setDuplicateWarning(true);
        return;
      }
      if (result?.error) setError(result.error);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDuplicateWarning(false);

    if (!supplierId) {
      setError("Please select a supplier.");
      return;
    }
    if (!supplierInvoiceNumber.trim()) {
      setError("Enter the supplier's invoice number.");
      return;
    }
    if (buildValidItems().length === 0) {
      setError("Add at least one product line with a quantity.");
      return;
    }

    submit(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Supplier</label>
          <div className="flex items-center gap-2">
            <select
              name="supplier_id"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm"
            >
              <option value="">Select supplier...</option>
              {supplierOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <QuickAddButton
              buttonLabel="+ New"
              dialogTitle="New supplier"
              fields={[
                { name: "name", label: "Supplier name", required: true },
                { name: "phone", label: "Phone" },
              ]}
              onSubmit={(values) => quickCreateSupplier({ name: values.name, phone: values.phone })}
              onCreated={(result) => {
                const newSupplier: Option = { id: result.id!, label: result.label ?? "" };
                setSupplierOptions((prev) => [...prev, newSupplier]);
                setSupplierId(newSupplier.id);
              }}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Supplier invoice number
          </label>
          <input
            name="supplier_invoice_number"
            value={supplierInvoiceNumber}
            onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
            autoComplete="off"
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Supplier invoice date
          </label>
          <input
            name="supplier_invoice_date"
            type="date"
            value={supplierInvoiceDate}
            onChange={(e) => setSupplierInvoiceDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
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
              customerId={null}
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
          autoComplete="off"
          rows={2}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
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

      {duplicateWarning && (
        <div className="rounded-md bg-yellow-50 dark:bg-yellow-950/40 px-3 py-2 text-sm text-yellow-800 dark:text-yellow-400">
          <p className="font-medium">
            This supplier already has an active invoice with number &quot;{supplierInvoiceNumber}&quot;.
          </p>
          <p className="mt-1">
            If you&apos;ve checked this is genuinely a new bill (not a duplicate entry), you can proceed anyway.
            This requires elevated permission and is recorded.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => submit(true)}
            className="mt-2 rounded-md border border-yellow-400 dark:border-yellow-700 px-3 py-1.5 text-sm font-medium text-yellow-800 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 disabled:opacity-60"
          >
            {pending ? "Saving..." : "I've checked - proceed anyway"}
          </button>
        </div>
      )}

      {error && <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Create purchase"}
      </button>
    </form>
  );
}
