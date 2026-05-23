import PageHeader from "@/components/shell/PageHeader";
import { getSession } from "@/lib/auth";

export const metadata = {
  title: "Command Center — DTE GES",
};

export default async function DashboardPage() {
  const session = await getSession();

  return (
    <>
      <PageHeader
        title="Command Center"
        subtitle={`Welcome back, ${session?.fullName ?? session?.email ?? ""}.`}
      />
      <div className="card text-center">
        <p className="text-body">
          The dashboard surface — stat strip, engagement table, and feeds — is delivered in Phase 3.
        </p>
      </div>
    </>
  );
}
