"use client";

import { useEffect, useRef } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export type RealtimeOptions<T extends Record<string, unknown>> = {
  table: string;
  /** PostgREST-style filter, e.g. `engagement_id=eq.<uuid>`. */
  filter?: string;
  event?: RealtimeEvent;
  onChange: (payload: RealtimePostgresChangesPayload<T>) => void;
};

// Subscribes to a postgres_changes channel and unsubscribes on unmount.
// Uses a handler ref so the callback can close over fresh state without
// reattaching the channel on every render.
export function useRealtimeChannel<
  T extends Record<string, unknown> = Record<string, unknown>,
>({ table, filter, event = "*", onChange }: RealtimeOptions<T>): void {
  const handlerRef = useRef(onChange);
  handlerRef.current = onChange;

  useEffect(() => {
    const supabase = createClient();
    const channelName = `rt-${table}-${filter ?? "all"}-${Math.random()
      .toString(36)
      .slice(2)}`;

    // Supabase's typed `on` signature is awkward to satisfy via inference; the
    // payload is mapped to RealtimePostgresChangesPayload<T> at the boundary.
    const channel = supabase.channel(channelName);
    channel.on(
      "postgres_changes" as never,
      {
        event,
        schema: "public",
        table,
        ...(filter ? { filter } : {}),
      } as never,
      ((payload: RealtimePostgresChangesPayload<T>) => {
        handlerRef.current(payload);
      }) as never,
    );
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, filter, event]);
}
