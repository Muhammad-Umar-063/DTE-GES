import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const metadata = {
  title: "Command Center — DTE GES",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <main className="min-h-screen flex items-center justify-center px-page-x py-page-y">
      <div className="card max-w-lg w-full text-center">
        <div className="text-label mb-2">DTE GES</div>
        <h1 className="text-page-title mb-2">Command Center</h1>
        <p className="text-body mb-4">
          Signed in as <span className="text-text-primary">{session.email}</span>{" "}
          ·{" "}
          <span className="inline-flex items-center px-2 py-0.5 bg-blue-light text-primary text-badge rounded-pill uppercase">
            {session.role}
          </span>
        </p>
        <p className="text-body">Command Center — coming in Phase 3.</p>
      </div>
    </main>
  );
}
