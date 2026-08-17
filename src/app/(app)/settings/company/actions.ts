"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";

export type CompanyFormState = { error: string | null; success: boolean };

export async function updateCompanySettings(
  _prevState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const user = await getCurrentUser();
  if (!can(user, "settings", "edit")) {
    return { error: "You don't have permission to edit company settings.", success: false };
  }

  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Company name is required.", success: false };
  }

  const logoFile = formData.get("logo");
  let logoUrl: string | undefined;

  if (logoFile instanceof File && logoFile.size > 0) {
    const ext = logoFile.name.split(".").pop() ?? "png";
    const path = `logo-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(path, logoFile, { upsert: true });

    if (uploadError) {
      return { error: `Logo upload failed: ${uploadError.message}`, success: false };
    }

    logoUrl = supabase.storage.from("company-assets").getPublicUrl(path).data.publicUrl;
  }

  const { data: existing, error: fetchError } = await supabase
    .from("company_settings")
    .select("id")
    .single();

  if (fetchError || !existing) {
    return { error: "Company settings record not found.", success: false };
  }

  const { error } = await supabase
    .from("company_settings")
    .update({
      name,
      address: String(formData.get("address") ?? "") || null,
      gstin: String(formData.get("gstin") ?? "") || null,
      state: String(formData.get("state") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      bank_name: String(formData.get("bank_name") ?? "") || null,
      bank_account_number: String(formData.get("bank_account_number") ?? "") || null,
      bank_ifsc: String(formData.get("bank_ifsc") ?? "") || null,
      invoice_terms: String(formData.get("invoice_terms") ?? "") || null,
      invoice_prefix: String(formData.get("invoice_prefix") ?? "INV"),
      purchase_ref_prefix: String(formData.get("purchase_ref_prefix") ?? "PUR"),
      receipt_prefix: String(formData.get("receipt_prefix") ?? "RCPT"),
      payment_prefix: String(formData.get("payment_prefix") ?? "PAY"),
      sales_incentive_rate: Number(formData.get("sales_incentive_rate") ?? 0) || 0,
      updated_by: user!.id,
      ...(logoUrl ? { logo_url: logoUrl } : {}),
    })
    .eq("id", existing.id);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/settings/company");
  return { error: null, success: true };
}
