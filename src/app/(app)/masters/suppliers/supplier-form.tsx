"use client";

import { useActionState } from "react";
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
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        disabled={disabled}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
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

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Supplier name" name="name" defaultValue={supplier?.name} disabled={!canEdit} required />
      <Field label="Address" name="address" defaultValue={supplier?.address} disabled={!canEdit} />

      <div className="grid grid-cols-3 gap-4">
        <Field label="Phone" name="phone" defaultValue={supplier?.phone} disabled={!canEdit} />
        <Field label="GSTIN" name="gstin" defaultValue={supplier?.gstin} disabled={!canEdit} />
        <Field label="State" name="state" defaultValue={supplier?.state} disabled={!canEdit} />
      </div>

      <Field label="Contact person" name="contact_person" defaultValue={supplier?.contact_person} disabled={!canEdit} />

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Credit period (days)"
          name="credit_period_days"
          type="number"
          defaultValue={supplier?.credit_period_days}
          disabled={!canEdit}
        />
        <Field
          label="Opening balance"
          name="opening_balance"
          type="number"
          defaultValue={supplier?.opening_balance}
          disabled={!canEdit}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Opening balance type</label>
        <select
          name="opening_balance_type"
          defaultValue={supplier?.opening_balance_type ?? "credit"}
          disabled={!canEdit}
          className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
        >
          <option value="debit">Debit</option>
          <option value="credit">Credit</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Bank name" name="bank_name" defaultValue={supplier?.bank_name} disabled={!canEdit} />
        <Field
          label="Account number"
          name="bank_account_number"
          defaultValue={supplier?.bank_account_number}
          disabled={!canEdit}
        />
        <Field label="IFSC" name="bank_ifsc" defaultValue={supplier?.bank_ifsc} disabled={!canEdit} />
      </div>

      {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      {canEdit && (
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
