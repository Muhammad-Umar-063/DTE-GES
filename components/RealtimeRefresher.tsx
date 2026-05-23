"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeChannel } from "@/lib/hooks/useRealtimeChannel";

// Drops a one-line client component into a server-rendered surface to give it
// realtime refresh. The handler debounces refresh calls so a burst of writes
// (e.g. RELEASED → packet_generated → taxdome_sent → hubspot_updated) only
// triggers one re-render at the end.
//
// Subscribes to a single table; compose multiple of these if you need several.

const REFRESH_DEBOUNCE_MS = 200;

export default function RealtimeRefresher({
  table,
  filter,
}: {
  table: "engagements" | "engagement_events" | "engagement_approvals";
  filter?: string;
}) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onChange = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      router.refresh();
      timerRef.current = null;
    }, REFRESH_DEBOUNCE_MS);
  }, [router]);

  useRealtimeChannel({ table, filter, onChange });

  return null;
}
