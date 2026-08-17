"use client";

import { useActionState } from "react";
import { createStockAdjustment, type AdjustmentFormState } from "./actions";

type Option = { id: string; label: string };
const initialState: AdjustmentFormState = { error: null, success: false };

export function AdjustmentForm({ products }: { products: Option[] }) {
  const [state, formAction, pending] = useActionState(createStockAdjustment, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Product</label>
        <select
          name="product_id"
          required
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm"
        >
          <option value="">Select product...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Direction</label>
          <select
            name="direction"
            defaultValue="increase"
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm"
          >
            <option value="increase">Increase stock (found extra, correction up)</option>
            <option value="decrease">Decrease stock (damage, loss, correction down)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
          <input
            name="quantity"
            type="number"
            min="0"
            step="0.001"
            required
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Reason</label>
        <input
          name="reason"
          required
          autoComplete="off"
          placeholder="e.g. Damaged in warehouse, physical count correction"
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
        <textarea
          name="notes"
          rows={2}
          autoComplete="off"
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
        />
      </div>

      {state.error && <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      {state.success && (
        <p className="rounded-md bg-green-50 dark:bg-green-950/40 px-3 py-2 text-sm text-green-700 dark:text-green-400">
          Adjustment recorded.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Record adjustment"}
      </button>
    </form>
  );
}
