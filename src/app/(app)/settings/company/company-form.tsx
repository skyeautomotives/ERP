"use client";

import { useActionState } from "react";
import Image from "next/image";
import { updateCompanySettings, type CompanyFormState } from "./actions";
import type { Database } from "@/lib/supabase/database.types";

type Company = Database["public"]["Tables"]["company_settings"]["Row"];

const initialState: CompanyFormState = { error: null, success: false };

function Field({
  label,
  name,
  defaultValue,
  disabled,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  disabled: boolean;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        disabled={disabled}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500"
      />
    </div>
  );
}

export function CompanyForm({ company, canEdit }: { company: Company | null; canEdit: boolean }) {
  const [state, formAction, pending] = useActionState(updateCompanySettings, initialState);

  if (!company) {
    return <p className="text-sm text-gray-500">No company record found.</p>;
  }

  return (
    <form action={formAction} className="space-y-4">
      {company.logo_url && (
        <Image
          src={company.logo_url}
          alt="Company logo"
          width={96}
          height={96}
          className="h-24 w-24 rounded object-contain"
          unoptimized
        />
      )}

      {canEdit && (
        <div>
          <label htmlFor="logo" className="mb-1 block text-sm font-medium text-gray-700">
            Logo
          </label>
          <input id="logo" name="logo" type="file" accept="image/*" className="text-sm" />
        </div>
      )}

      <Field label="Company name" name="name" defaultValue={company.name} disabled={!canEdit} />
      <Field label="Address" name="address" defaultValue={company.address} disabled={!canEdit} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="GSTIN" name="gstin" defaultValue={company.gstin} disabled={!canEdit} />
        <Field label="Phone" name="phone" defaultValue={company.phone} disabled={!canEdit} />
      </div>
      <Field label="Email" name="email" type="email" defaultValue={company.email} disabled={!canEdit} />

      <div className="grid grid-cols-3 gap-4">
        <Field label="Bank name" name="bank_name" defaultValue={company.bank_name} disabled={!canEdit} />
        <Field
          label="Account number"
          name="bank_account_number"
          defaultValue={company.bank_account_number}
          disabled={!canEdit}
        />
        <Field label="IFSC" name="bank_ifsc" defaultValue={company.bank_ifsc} disabled={!canEdit} />
      </div>

      <div>
        <label htmlFor="invoice_terms" className="mb-1 block text-sm font-medium text-gray-700">
          Invoice terms
        </label>
        <textarea
          id="invoice_terms"
          name="invoice_terms"
          defaultValue={company.invoice_terms ?? ""}
          disabled={!canEdit}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500"
        />
      </div>

      <Field
        label="Invoice number prefix"
        name="invoice_prefix"
        defaultValue={company.invoice_prefix}
        disabled={!canEdit}
      />

      {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Saved.</p>
      )}

      {canEdit && (
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save changes"}
        </button>
      )}
    </form>
  );
}
