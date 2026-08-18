"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { list, updateStatus, type QueueItem } from "@/lib/offline-queue";
import type { Database } from "@/lib/supabase/database.types";

type CreateReceiptArgs = Database["public"]["Functions"]["create_receipt"]["Args"];

type SalesOrderPayload = {
  customer_id: string | null;
  route_id: string | null;
  staff_id: string | null;
  notes: string | null;
  items: { product_id: string; quantity: number; rate: number; discount_percent: number }[];
};

type ReceiptPayload = {
  method: "cash" | "bank";
  customer_id: string;
  mode: "bill" | "on_account";
  amount: number;
  receipt_date: string;
  reference_number: string | null;
  notes: string | null;
  allocations: { sales_invoice_id: string; amount_allocated: number }[];
};

/** Phase 13: flushes this device's offline queue (Sales Orders, Cash/Bank
 * Receipts - spec section 46) on mount and whenever the browser comes back
 * online. Writes directly via supabase-js rather than the page's server
 * actions, since this runs headless in the background, not as part of a
 * form submission that navigates anywhere. Never drops a failed item - it
 * stays queued (status 'failed') for the next flush attempt. */
export function OfflineSyncManager({ userId }: { userId: string }) {
  const flushingRef = useRef(false);

  useEffect(() => {
    async function flushItem(item: QueueItem, supabase: ReturnType<typeof createClient>) {
      updateStatus(userId, item.localId, "uploading");
      try {
        if (item.type === "sales_order") {
          const payload = item.payload as SalesOrderPayload;
          const { data: order, error: orderError } = await supabase
            .from("sales_orders")
            .insert({
              id: item.localId,
              customer_id: payload.customer_id,
              route_id: payload.route_id,
              staff_id: payload.staff_id,
              notes: payload.notes,
            })
            .select("id")
            .single();

          if (orderError && orderError.code !== "23505") throw new Error(orderError.message);

          if (!orderError) {
            const { error: itemsError } = await supabase.from("sales_order_items").insert(
              payload.items.map((it) => ({
                order_id: order!.id,
                product_id: it.product_id,
                quantity: it.quantity,
                rate: it.rate,
                discount_percent: it.discount_percent,
              })),
            );
            if (itemsError) throw new Error(itemsError.message);
          }
        } else if (item.type === "receipt") {
          const payload = item.payload as ReceiptPayload;
          const { error } = await supabase.rpc("create_receipt", {
            p_method: payload.method,
            p_customer_id: payload.customer_id,
            p_mode: payload.mode,
            p_amount: payload.amount,
            p_receipt_date: payload.receipt_date,
            p_reference_number: payload.reference_number,
            p_notes: payload.notes,
            p_allocations: payload.mode === "bill" ? payload.allocations : [],
            p_client_id: item.localId,
          } as CreateReceiptArgs);
          if (error) throw new Error(error.message);
        }
        updateStatus(userId, item.localId, "synced");
      } catch (err) {
        updateStatus(userId, item.localId, "failed", err instanceof Error ? err.message : "Sync failed");
      }
    }

    async function flush() {
      if (flushingRef.current) return;
      flushingRef.current = true;
      try {
        const items = list(userId).filter((i) => i.status === "pending" || i.status === "failed");
        if (items.length === 0) return;
        const supabase = createClient();
        for (const item of items) {
          await flushItem(item, supabase);
        }
      } finally {
        flushingRef.current = false;
      }
    }

    flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [userId]);

  return null;
}
