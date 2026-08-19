"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { SupplierFormState } from "./actions";
import type { Database } from "@/lib/supabase/database.types";

type Supplier = Database["public"]["Tables"]["suppliers"]["Row"];
const initialState: SupplierFormState = { error: null };

function Field({
  label,
  name,
  defaultValue,
  disabled,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  disabled: boolean;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        disabled={disabled}
        autoComplete="off"
        className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-500"
      />
    </div>
  );
}

export function SupplierForm({
  supplier,
  action,
  canEdit,
}: {
  supplier?: Supplier;
  action: (prevState: SupplierFormState, formData: FormData) => Promise<SupplierFormState>;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const isNew = !supplier;
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
      <Field label="Supplier name" name="name" defaultValue={supplier?.name} disabled={fieldsDisabled} required />
      <Field label="Address" name="address" defaultValue={supplier?.address} disabled={fieldsDisabled} />

      <div className="grid grid-cols-3 gap-4">
        <Field label="Phone" name="phone" defaultValue={supplier?.phone} disabled={fieldsDisabled} />
        <Field label="GSTIN" name="gstin" defaultValue={supplier?.gstin} disabled={fieldsDisabled} />
        <Field label="State" name="state" defaultValue={supplier?.state} disabled={fieldsDisabled} />
      </div>

      <Field label="Contact person" name="contact_person" defaultValue={supplier?.contact_person} disabled={fieldsDisabled} />

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Credit period (days)"
          name="credit_period_days"
          type="number"
          defaultValue={supplier?.credit_period_days}
          disabled={fieldsDisabled}
        />
        <Field
          label="Opening balance"
          name="opening_balance"
          type="number"
          defaultValue={supplier?.opening_balance}
          disabled={fieldsDisabled}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Opening balance type</label>
        <select
          name="opening_balance_type"
          defaultValue={supplier?.opening_balance_type ?? "credit"}
          disabled={fieldsDisabled}
          className="w-full max-w-xs rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm disabled:bg-gray-50 dark:disabled:bg-gray-800"
        >
          <option value="debit">Debit</option>
          <option value="credit">Credit</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Bank name" name="bank_name" defaultValue={supplier?.bank_name} disabled={fieldsDisabled} />
        <Field
          label="Account number"
          name="bank_account_number"
          defaultValue={supplier?.bank_account_number}
          disabled={fieldsDisabled}
        />
        <Field label="IFSC" name="bank_ifsc" defaultValue={supplier?.bank_ifsc} disabled={fieldsDisabled} />
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
