import { Bell, LogOut } from "lucide-react";
import type { SessionContext } from "@/lib/auth";

function initials(name: string | null, fallback: string) {
  const src = name?.trim() || fallback;
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default function Header({ session }: { session: SessionContext }) {
  const unreadCount = 0; // Phase 4: real notifications

  return (
    <header className="h-[52px] flex-shrink-0 bg-surface border-b border-border flex items-center justify-between px-page-x">
      <div className="flex items-center gap-3">
        <span className="text-mono text-text-primary font-bold tracking-wider">DTE</span>
        <span className="h-4 w-px bg-border-strong" aria-hidden />
        <span className="text-card-title text-text-primary">Governed Execution System</span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-label">Peach State CPA Group</span>

        <button
          type="button"
          aria-label="Notifications"
          className="relative w-8 h-8 inline-flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-button transition"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-pill bg-red text-white text-badge">
              {unreadCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <span
            aria-hidden
            className="w-7 h-7 rounded-pill bg-primary text-white text-badge inline-flex items-center justify-center"
          >
            {initials(session.fullName, session.email)}
          </span>
          <span className="text-body text-text-primary hidden sm:inline">
            {session.fullName ?? session.email}
          </span>
        </div>

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            aria-label="Sign out"
            className="w-8 h-8 inline-flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-button transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
