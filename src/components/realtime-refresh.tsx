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
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function setup() {
      // Every table this component subscribes to has RLS enabled, so Realtime
      // only broadcasts a postgres_changes event to this socket if it can
      // verify the caller's identity - it needs the user's JWT, not just the
      // anon key on the connection URL. supabase-js is supposed to sync this
      // automatically via onAuthStateChange, but on a session that was
      // hydrated from cookies (the @supabase/ssr browser client used here,
      // rather than an in-page sign-in call) that auto-sync can race this
      // effect's channel.subscribe() below and lose - the channel joins
      // before the token is attached, and nothing ever retries it. Setting
      // it explicitly before subscribing closes that race.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }

      channel = supabase.channel(`realtime-refresh-${tables.join("-")}`);
      for (const table of tables) {
        channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => router.refresh(), 500);
        });
      }
      channel.subscribe();
    }

    setup();

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(",")]);

  return null;
}
