"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Phase 13: subscribes to Postgres changes on the given tables and calls
 * router.refresh() so the enclosing Server Component re-fetches - satisfies
 * section 47's "within seconds" propagation without a manual reload.
 * Debounced so a burst of related writes (e.g. a receipt + its allocation)
 * only triggers one refresh. */
export function RealtimeRefresh({ tables }: { tables: string[] }) {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`realtime-refresh-${tables.join("-")}`);

    for (const table of tables) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => router.refresh(), 500);
      });
    }

    channel.subscribe();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(",")]);

  return null;
}
