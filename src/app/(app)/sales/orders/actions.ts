"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import type { InvoiceLineInput } from "../actions";
import type { Database } from "@/lib/supabase/database.types";

type CreateInvoiceArgs = Database["public"]["Functions"]["create_sales_invoice"]["Args"];

export type CreateOrderPayload = {
  customer_id: string | null;
  route_id: string | null;
  staff_id: string | null;
  notes: string | null;
  items: InvoiceLineInput[];
  /** Client-generated UUID (Phase 13 offline queue) - used as the row's real
   * id so a network-flaky retry hits the primary key constraint instead of
   * creating a duplicate order. */
  client_id?: string;
};

export async function createSalesOrder(
  payload: CreateOrderPayload,
): Promise<{ error: string | null; id?: string }> {
  const user = await getCurrentUser();
  if (!can(user, "sales", "create")) {
    return { error: "You don't have permission to create sales orders." };
  }
  if (payload.items.length === 0) {
    return { error: "Add at least one product line." };
  }

  const supabase = await createClient();
  const insertPayload: Record<string, unknown> = {
    customer_id: payload.customer_id,
    route_id: payload.route_id,
    staff_id: payload.staff_id,
    notes: payload.notes,
    created_by: user!.id,
  };
  if (payload.client_id) insertPayload.id = payload.client_id;

  const { data: order, error: orderError } = await supabase
    .from("sales_orders")
    .insert(insertPayload)
    .select("id")
    .single();

  if (orderError?.code === "23505" && payload.client_id) {
    // Already synced by an earlier attempt - idempotent no-op.
    revalidatePath("/sales/orders");
    return { error: null, id: payload.client_id };
  }
  if (orderError || !order) return { error: orderError?.message ?? "Failed to create order." };

  const { error: itemsError } = await supabase.from("sales_order_items").insert(
    payload.items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      rate: item.rate,
      discount_percent: item.discount_percent,
    })),
  );

  if (itemsError) {
    await supabase.from("sales_orders").delete().eq("id", order.id);
    return { error: itemsError.message };
  }

  revalidatePath("/sales/orders");
  return { error: null, id: order.id };
}

export async function cancelSalesOrder(orderId: string): Promise<{ error: string | null }> {
  const user = await getCurrentUser();
  if (!can(user, "sales", "edit")) return { error: "Not authorized." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sales_orders")
    .update({ status: "cancelled", updated_by: user!.id })
    .eq("id", orderId);

  if (error) return { error: error.message };
  revalidatePath(`/sales/orders/${orderId}`);
  return { error: null };
}

export async function convertSalesOrder(orderId: string): Promise<{ error: string | null; invoiceId?: string }> {
  const user = await getCurrentUser();
  if (!can(user, "sales", "create")) return { error: "Not authorized." };

  const supabase = await createClient();
  const { data: order, error: orderError } = await supabase
    .from("sales_orders")
    .select("*, sales_order_items(*)")
    .eq("id", orderId)
    .single();

  if (orderError || !order) return { error: orderError?.message ?? "Order not found." };
  if (order.status !== "pending") return { error: "Only pending orders can be converted." };
  if (!order.staff_id) return { error: "This order has no sales staff assigned." };

  const { data: invoiceId, error: rpcError } = await supabase.rpc("create_sales_invoice", {
    p_sale_type: "credit",
    p_customer_id: order.customer_id,
    p_cash_customer_name: null,
    p_cash_customer_phone: null,
    p_route_id: order.route_id,
    p_staff_id: order.staff_id,
    p_credit_period_days: 0,
    p_notes: order.notes,
    p_items: order.sales_order_items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      rate: item.rate,
      discount_percent: item.discount_percent,
    })),
  } as unknown as CreateInvoiceArgs);

  if (rpcError || !invoiceId) return { error: rpcError?.message ?? "Failed to create invoice." };

  await supabase
    .from("sales_orders")
    .update({ status: "converted", converted_invoice_id: invoiceId, updated_by: user!.id })
    .eq("id", orderId);

  revalidatePath("/sales/orders");
  revalidatePath(`/sales/orders/${orderId}`);
  return { error: null, invoiceId };
}
