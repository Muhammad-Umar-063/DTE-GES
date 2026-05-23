import { redirect } from "next/navigation";
import Header from "@/components/shell/Header";
import Sidebar from "@/components/shell/Sidebar";
import RealtimeRefresher from "@/components/RealtimeRefresher";
import { ToastProvider } from "@/components/toast/ToastProvider";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = createClient();
  const [{ count: approvalsCount }, { count: escalationsCount }] = await Promise.all([
    supabase
      .from("engagements")
      .select("*", { count: "exact", head: true })
      .eq("current_state", "REVIEW_REQUIRED"),
    supabase
      .from("engagements")
      .select("*", { count: "exact", head: true })
      .eq("current_state", "ESCALATED"),
  ]);

  return (
    <ToastProvider>
      <RealtimeRefresher table="engagements" />
      <div className="min-h-screen flex flex-col bg-surface-2">
        <Header session={session} />
        <div className="flex flex-1 min-h-0">
          <Sidebar
            approvalsCount={approvalsCount ?? 0}
            escalationsCount={escalationsCount ?? 0}
          />
          <main className="flex-1 overflow-y-auto">
            <div className="px-page-x py-page-y">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
