"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can, getCurrentUser } from "@/lib/auth/permissions";
import type { InvoiceLineInput } from "../actions";
import type { Database } from "@/lib/supabase/database.types";

type CreateInvoiceArgs = Database["public"]["Functions"]["create_sales_invoice"]["Args"];
type CreateOrderArgs = Database["public"]["Functions"]["create_sales_order"]["Args"];

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
  const { data: orderId, error } = await supabase.rpc("create_sales_order", {
    p_customer_id: payload.customer_id,
    p_route_id: payload.route_id,
    p_staff_id: payload.staff_id,
    p_notes: payload.notes,
    p_items: payload.items,
    p_client_id: payload.client_id ?? null,
  } as CreateOrderArgs);

  if (error || !orderId) return { error: error?.message ?? "Failed to create order." };

  revalidatePath("/sales/orders");
  return { error: null, id: orderId };
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

export async function convertSalesOrder(
  orderId: string,
  saleType: "cash" | "credit" = "credit",
): Promise<{ error: string | null; invoiceId?: string }> {
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
    p_sale_type: saleType,
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

export type PendingOrderSummary = {
  id: string;
  order_number: string | null;
  customer_name: string;
  route_name: string | null;
  staff_name: string | null;
  created_at: string;
  subtotal: number;
  items: { product_code: string; product_name: string; quantity: number; rate: number }[];
};

export async function getPendingSalesOrders(): Promise<{ error: string | null; orders: PendingOrderSummary[] }> {
  const user = await getCurrentUser();
  if (!can(user, "sales", "view")) return { error: "Not authorized.", orders: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_orders")
    .select(
      "id, order_number, created_at, customers(name), routes(name), user_profiles(full_name), sales_order_items(quantity, rate, products(code, name))",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, orders: [] };

  const orders: PendingOrderSummary[] = (data ?? []).map((o) => ({
    id: o.id,
    order_number: o.order_number,
    customer_name: o.customers?.name ?? "Unknown customer",
    route_name: o.routes?.name ?? null,
    staff_name: o.user_profiles?.full_name ?? null,
    created_at: o.created_at,
    subtotal: o.sales_order_items.reduce((sum, it) => sum + Number(it.quantity) * Number(it.rate), 0),
    items: o.sales_order_items.map((it) => ({
      product_code: it.products?.code ?? "",
      product_name: it.products?.name ?? "",
      quantity: Number(it.quantity),
      rate: Number(it.rate),
    })),
  }));

  return { error: null, orders };
}

export async function convertSalesOrdersBulk(
  conversions: { orderId: string; saleType: "cash" | "credit" }[],
): Promise<{ orderId: string; invoiceId?: string; error?: string }[]> {
  const results: { orderId: string; invoiceId?: string; error?: string }[] = [];
  for (const { orderId, saleType } of conversions) {
    const result = await convertSalesOrder(orderId, saleType);
    results.push({ orderId, invoiceId: result.invoiceId, error: result.error ?? undefined });
  }
  return results;
}
