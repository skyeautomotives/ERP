"use client";

import { useActionState } from "react";
import type { CustomerFormState } from "./actions";
import type { Database } from "@/lib/supabase/database.types";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Option = { id: string; label: string };

const initialState: CustomerFormState = { error: null };

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

export function CustomerForm({
  customer,
  routes,
  staff,
  action,
  canEdit,
}: {
  customer?: Customer;
  routes: Option[];
  staff: Option[];
  action: (prevState: CustomerFormState, formData: FormData) => Promise<CustomerFormState>;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Customer name" name="name" defaultValue={customer?.name} disabled={!canEdit} required />
      <Field label="Address" name="address" defaultValue={customer?.address} disabled={!canEdit} />

      <div className="grid grid-cols-2 gap-4">
        <Field label="Phone" name="phone" defaultValue={customer?.phone} disabled={!canEdit} />
        <Field label="Email" name="email" type="email" defaultValue={customer?.email} disabled={!canEdit} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="GSTIN" name="gstin" defaultValue={customer?.gstin} disabled={!canEdit} />
        <Field label="State" name="state" defaultValue={customer?.state} disabled={!canEdit} />
        <Field label="District" name="district" defaultValue={customer?.district} disabled={!canEdit} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Route</label>
          <select
            name="route_id"
            defaultValue={customer?.route_id ?? ""}
            disabled={!canEdit}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm disabled:bg-gray-50 dark:disabled:bg-gray-800"
          >
            <option value="">None</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <Field label="Category" name="category" defaultValue={customer?.category} disabled={!canEdit} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Credit limit"
          name="credit_limit"
          type="number"
          defaultValue={customer?.credit_limit}
          disabled={!canEdit}
        />
        <Field
          label="Credit period (days)"
          name="credit_period_days"
          type="number"
          defaultValue={customer?.credit_period_days}
          disabled={!canEdit}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Opening balance"
          name="opening_balance"
          type="number"
          defaultValue={customer?.opening_balance}
          disabled={!canEdit}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Opening balance type</label>
          <select
            name="opening_balance_type"
            defaultValue={customer?.opening_balance_type ?? "debit"}
            disabled={!canEdit}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm disabled:bg-gray-50 dark:disabled:bg-gray-800"
          >
            <option value="debit">Debit</option>
            <option value="credit">Credit</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Assigned staff</label>
        <select
          name="assigned_user_id"
          defaultValue={customer?.assigned_user_id ?? ""}
          disabled={!canEdit}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm disabled:bg-gray-50 dark:disabled:bg-gray-800"
        >
          <option value="">Unassigned</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
        <textarea
          name="notes"
          defaultValue={customer?.notes ?? ""}
          disabled={!canEdit}
          autoComplete="off"
          rows={3}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-500"
        />
      </div>

      {state.error && <p className="rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400">{state.error}</p>}

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
