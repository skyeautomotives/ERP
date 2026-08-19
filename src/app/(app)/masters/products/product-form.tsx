"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ProductFormState } from "./actions";
import type { Database } from "@/lib/supabase/database.types";

type Product = Database["public"]["Tables"]["products"]["Row"];
const initialState: ProductFormState = { error: null };

function Field({
  label,
  name,
  defaultValue,
  disabled,
  type = "text",
  required = false,
  step,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  disabled: boolean;
  type?: string;
  required?: boolean;
  step?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <input
        name={name}
        type={type}
        step={step}
        required={required}
        defaultValue={defaultValue ?? ""}
        disabled={disabled}
        autoComplete="off"
        className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-500"
      />
    </div>
  );
}

export function ProductForm({
  product,
  action,
  canEdit,
}: {
  product?: Product;
  action: (prevState: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const isNew = !product;
  const [isEditing, setIsEditing] = useState(isNew);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (pending) wasSubmitting.current = true;
    if (!pending && wasSubmitting.current && !state.error) {
      wasSubmitting.current = false;
      if (!isNew) setIsEditing(false);
    }
  }, [pending, state, isNew]);

  const fieldsDisabled = !canEdit || (!isNew && !isEditing);

  return (
    <form key={isEditing ? "edit" : "view"} action={formAction} className="space-y-4">
      {!isNew && canEdit && (
        <div className="flex justify-end">
          {isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Edit
            </button>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Product code" name="code" defaultValue={product?.code} disabled={fieldsDisabled} required />
        <Field label="Product name" name="name" defaultValue={product?.name} disabled={fieldsDisabled} required />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Brand" name="brand" defaultValue={product?.brand} disabled={fieldsDisabled} />
        <Field label="Group" name="product_group" defaultValue={product?.product_group} disabled={fieldsDisabled} />
        <Field
          label="Sub-group"
          name="product_sub_group"
          defaultValue={product?.product_sub_group}
          disabled={fieldsDisabled}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="HSN code" name="hsn_code" defaultValue={product?.hsn_code} disabled={fieldsDisabled} />
        <Field label="Unit" name="unit" defaultValue={product?.unit} disabled={fieldsDisabled} />
        <Field label="Pack size" name="pack_size" defaultValue={product?.pack_size} disabled={fieldsDisabled} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Field label="MRP" name="mrp" type="number" step="0.01" defaultValue={product?.mrp} disabled={fieldsDisabled} />
        <Field
          label="Purchase rate"
          name="purchase_rate"
          type="number"
          step="0.01"
          defaultValue={product?.purchase_rate}
          disabled={fieldsDisabled}
        />
        <Field
          label="Selling rate"
          name="selling_rate"
          type="number"
          step="0.01"
          defaultValue={product?.selling_rate}
          disabled={fieldsDisabled}
        />
        <Field
          label="Landing cost"
          name="landing_cost"
          type="number"
          step="0.01"
          defaultValue={product?.landing_cost}
          disabled={fieldsDisabled}
        />
      </div>

      <Field
        label="GST %"
        name="gst_percent"
        type="number"
        step="0.01"
        defaultValue={product?.gst_percent}
        disabled={fieldsDisabled}
      />

      <div className="grid grid-cols-3 gap-4">
        <Field
          label="Opening quantity"
          name="opening_qty"
          type="number"
          step="0.001"
          defaultValue={product?.opening_qty}
          disabled={fieldsDisabled}
        />
        <Field
          label="Opening value"
          name="opening_value"
          type="number"
          step="0.01"
          defaultValue={product?.opening_value}
          disabled={fieldsDisabled}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Minimum stock level"
          name="min_stock_level"
          type="number"
          step="0.001"
          defaultValue={product?.min_stock_level}
          disabled={fieldsDisabled}
        />
        <Field
          label="Maximum stock level"
          name="max_stock_level"
          type="number"
          step="0.001"
          defaultValue={product?.max_stock_level}
          disabled={fieldsDisabled}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Batch number" name="batch_number" defaultValue={product?.batch_number} disabled={fieldsDisabled} />
        <Field
          label="Expiry date"
          name="expiry_date"
          type="date"
          defaultValue={product?.expiry_date}
          disabled={fieldsDisabled}
        />
      </div>

      {state.error && <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{state.error}</p>}

      {canEdit && (isNew || isEditing) && (
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save"}
        </button>
      )}
    </form>
  );
}
