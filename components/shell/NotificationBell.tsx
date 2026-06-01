"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Sparkles } from "lucide-react";
import { useRealtimeChannel } from "@/lib/hooks/useRealtimeChannel";
import { createClient } from "@/lib/supabase/client";
import { relativeTime } from "@/lib/time";

const STORAGE_KEY = "dte-ges-last-seen-events";

type RecentItem = {
  eventId: string;
  ts: string;
  actionType: string;
  engagementId: string;
};

const NOTIFY_ACTIONS = new Set([
  "escalation_created",
  "approval_granted",
  "gate_blocked",
  "stage_transition",
]);

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [unread, setUnread] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("engagement_events")
      .select("event_id, timestamp, action_type, engagement_id")
      .in("action_type", Array.from(NOTIFY_ACTIONS))
      .order("timestamp", { ascending: false })
      .limit(10);
    const items: RecentItem[] = (data ?? []).map((r) => ({
      eventId: r.event_id as string,
      ts: r.timestamp as string,
      actionType: r.action_type as string,
      engagementId: r.engagement_id as string,
    }));
    setRecents(items);

    const lastSeen = (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) || "1970-01-01";
    const unreadCount = items.filter((i) => i.ts > lastSeen).length;
    setUnread(unreadCount);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useRealtimeChannel({
    table: "engagement_events",
    event: "INSERT",
    onChange: () => {
      void refresh();
    },
  });

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, [open]);

  function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      // Mark as read.
      const now = new Date().toISOString();
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, now);
      }
      setUnread(0);
    }
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative w-8 h-8 inline-flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-button transition"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-pill bg-red text-white text-badge">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 card shadow-card-hover z-40 p-0 overflow-hidden">
          <div className="px-card py-3 border-b border-border">
            <h3 className="text-card-title">Recent activity in your firm</h3>
            <p className="text-label mt-0.5">
              Approvals, flags, and status changes
            </p>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {recents.length === 0 ? (
              <p className="text-body text-text-muted text-center py-6">
                All caught up.
              </p>
            ) : (
              <ul>
                {recents.map((r) => (
                  <li
                    key={r.eventId}
                    className="border-b border-border last:border-b-0"
                  >
                    <Link
                      href={`/engagements/${r.engagementId}`}
                      onClick={() => setOpen(false)}
                      className="block px-card py-2.5 hover:bg-surface-2 transition"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          aria-hidden
                          className={
                            "mt-1.5 w-2 h-2 rounded-full flex-shrink-0 " +
                            (r.actionType === "escalation_created"
                              ? "bg-red"
                              : r.actionType === "approval_granted"
                                ? "bg-green"
                                : r.actionType === "gate_blocked"
                                  ? "bg-amber"
                                  : "bg-primary")
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-card-title text-text-primary">
                            {LABELS[r.actionType] ?? r.actionType}
                          </div>
                          <div className="text-label mt-0.5">
                            {relativeTime(r.ts)}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link
            href="/audit"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1 px-card py-2.5 border-t border-border text-body text-primary hover:bg-surface-2 transition"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden /> See all in Audit Trail
          </Link>
        </div>
      )}
    </div>
  );
}

const LABELS: Record<string, string> = {
  stage_transition: "Status changed",
  approval_granted: "Approval given",
  escalation_created: "Marked as needing attention",
  gate_blocked: "Action blocked — approval needed first",
};
