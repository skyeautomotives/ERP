"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { quickCreateProduct } from "@/app/(app)/masters/products/quick-create";
import { QuickAddButton, type QuickAddResult } from "@/components/quick-add-button";

export type ProductOption = {
  id: string;
  code: string;
  name: string;
  default_rate: number | null;
  gst_percent: number;
};

export type LineItem = {
  product_id: string;
  quantity: number;
  rate: number;
  discount_percent: number;
  gst_percent: number;
};

type LastPrice = {
  rate: number;
  discount_percent: number;
  quantity: number;
  invoice_date: string;
  invoice_number: string;
};

export function LineItemRow({
  item,
  products,
  customerId,
  onChange,
  onRemove,
  onProductCreated,
}: {
  item: LineItem;
  products: ProductOption[];
  /** Only sales invoices pass this - it powers the "last price sold to this
   * customer" lookup (section 11). Purchases pass null and the lookup is skipped. */
  customerId: string | null;
  onChange: (item: LineItem) => void;
  onRemove: () => void;
  /** Bubbles a quick-created product up to the parent form, which holds the
   * shared product list for every line row (so creating one from any single
   * row makes it available on all of them, not just this one). */
  onProductCreated?: (product: ProductOption) => void;
}) {
  const [lastPrice, setLastPrice] = useState<LastPrice | null>(null);
  const [loadingLastPrice, setLoadingLastPrice] = useState(false);
  const [stockQty, setStockQty] = useState<number | null>(null);

  useEffect(() => {
    if (!customerId || !item.product_id) {
      setLastPrice(null);
      return;
    }
    let cancelled = false;
    setLoadingLastPrice(true);
    const supabase = createClient();
    supabase
      .rpc("get_last_price", { p_customer_id: customerId, p_product_id: item.product_id })
      .then(({ data }) => {
        if (cancelled) return;
        setLastPrice(data && data.length > 0 ? data[0] : null);
        setLoadingLastPrice(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, item.product_id]);

  useEffect(() => {
    if (!item.product_id) {
      setStockQty(null);
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("product_stock_levels")
      .select("current_qty")
      .eq("product_id", item.product_id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        setStockQty(data ? Number(data.current_qty) : null);
      });
    return () => {
      cancelled = true;
    };
  }, [item.product_id]);

  const product = products.find((p) => p.id === item.product_id);

  function handleProductChange(productId: string) {
    const selected = products.find((p) => p.id === productId);
    onChange({
      ...item,
      product_id: productId,
      rate: selected?.default_rate ?? 0,
      gst_percent: selected?.gst_percent ?? 0,
    });
  }

  function handleProductCreated(result: QuickAddResult) {
    const newProduct: ProductOption = {
      id: result.id!,
      code: String(result.code ?? ""),
      name: String(result.name ?? ""),
      default_rate: (result.default_rate as number | null) ?? null,
      gst_percent: Number(result.gst_percent ?? 0),
    };
    onProductCreated?.(newProduct);
    onChange({
      ...item,
      product_id: newProduct.id,
      rate: newProduct.default_rate ?? 0,
      gst_percent: newProduct.gst_percent ?? 0,
    });
  }

  return (
    <div
      className="rounded-md border border-gray-200 dark:border-gray-800 p-3"
      onKeyDown={(e) => {
        // These fields live inside the invoice's <form> - pressing Enter
        // while quickly tabbing through qty/rate during billing would
        // otherwise submit (and finalize) the whole invoice immediately.
        if (e.key === "Enter") e.preventDefault();
      }}
    >
      <div className="mb-1 grid grid-cols-12 gap-2 text-[11px] font-medium text-gray-400 dark:text-gray-500">
        <span className="col-span-4">Product</span>
        <span className="col-span-2">Qty</span>
        <span className="col-span-2">Rate</span>
        <span className="col-span-2">Disc %</span>
        <span className="col-span-1">GST %</span>
      </div>
      <div className="grid grid-cols-12 gap-2">
        <select
          name="line_product_id"
          value={item.product_id}
          onChange={(e) => handleProductChange(e.target.value)}
          className="col-span-4 rounded-md border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-sm"
        >
          <option value="">Select product...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} - {p.name}
            </option>
          ))}
        </select>
        <input
          name="line_quantity"
          type="number"
          min="0"
          step="0.001"
          placeholder="Qty"
          value={item.quantity || ""}
          onChange={(e) => onChange({ ...item, quantity: Number(e.target.value) })}
          className="col-span-2 rounded-md border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-sm"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Rate"
          value={item.rate || ""}
          onChange={(e) => onChange({ ...item, rate: Number(e.target.value) })}
          className="col-span-2 rounded-md border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-sm"
        />
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          placeholder="Disc %"
          value={item.discount_percent || ""}
          onChange={(e) => onChange({ ...item, discount_percent: Number(e.target.value) })}
          className="col-span-2 rounded-md border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-sm"
        />
        <div className="col-span-1">
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            title="GST %"
            placeholder="GST %"
            value={item.gst_percent ?? ""}
            onChange={(e) => onChange({ ...item, gst_percent: Number(e.target.value) })}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="col-span-1 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
        >
          Remove
        </button>
      </div>
      {product && Number(item.gst_percent) !== Number(product.gst_percent) && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          Overridden from this product&apos;s usual {product.gst_percent}% GST.
        </p>
      )}

      <div className="mt-1 flex items-center gap-3">
        <QuickAddButton
          buttonLabel="+ New product"
          dialogTitle="New product"
          fields={[
            { name: "code", label: "Product code", required: true },
            { name: "name", label: "Product name", required: true },
            { name: "unit", label: "Unit (e.g. pcs, box)" },
            { name: "gst_percent", label: "GST %", type: "number" },
            { name: "rate", label: "Rate", type: "number" },
          ]}
          onSubmit={(values) =>
            quickCreateProduct({
              code: values.code,
              name: values.name,
              unit: values.unit,
              gst_percent: values.gst_percent ? Number(values.gst_percent) : undefined,
              rate: values.rate ? Number(values.rate) : undefined,
            })
          }
          onCreated={handleProductCreated}
        />
        {item.product_id && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            In stock: {stockQty === null ? "..." : stockQty}
          </span>
        )}
      </div>

      {customerId && item.product_id && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {loadingLastPrice
            ? "Checking last price..."
            : lastPrice
              ? `Last sold to this customer: Rs.${lastPrice.rate} on ${lastPrice.invoice_date} (${lastPrice.invoice_number}), qty ${lastPrice.quantity}, ${lastPrice.discount_percent}% off`
              : "No previous sale of this product to this customer."}
        </p>
      )}
    </div>
  );
}
