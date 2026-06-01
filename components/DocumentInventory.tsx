import { createClient } from "@/lib/supabase/server";
import type { DocumentRow } from "@/lib/db-types";
import type { DocumentStatus } from "@/lib/supabase/database.types";

const STATUS_DOT: Record<DocumentStatus, string> = {
  received: "bg-green",
  pending: "bg-amber",
  missing: "bg-red",
  flagged: "bg-amber",
};

const STATUS_LABEL: Record<DocumentStatus, string> = {
  received: "Received",
  pending: "Pending",
  missing: "Missing",
  flagged: "Flagged",
};

export type DocumentInventoryProps = {
  engagementId: string;
  className?: string;
};

export default async function DocumentInventory({
  engagementId,
  className,
}: DocumentInventoryProps) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("engagement_id", engagementId)
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <div className={"card " + (className ?? "")}>
        <p className="text-body text-red">Failed to load documents.</p>
      </div>
    );
  }

  const docs = (data ?? []) as DocumentRow[];
  const counts = docs.reduce<Record<DocumentStatus, number>>(
    (acc, d) => {
      acc[d.status] = (acc[d.status] ?? 0) + 1;
      return acc;
    },
    { received: 0, pending: 0, missing: 0, flagged: 0 },
  );

  const totalNonMissing = counts.received + counts.pending + counts.flagged;
  const total = totalNonMissing + counts.missing;
  return (
    <div className={"card " + (className ?? "")}>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div>
          <h3 className="text-card-title">Documents</h3>
          {total > 0 && (
            <p className="text-label mt-0.5">
              {counts.received} of {total} received
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 text-label">
          <CountChip color="bg-green" label="Received" count={counts.received} />
          <CountChip color="bg-amber" label="Pending" count={counts.pending} />
          <CountChip color="bg-red" label="Missing" count={counts.missing} />
          <CountChip color="bg-amber" label="Flagged" count={counts.flagged} />
        </div>
      </div>
      {docs.length === 0 ? (
        <p className="text-body text-text-muted text-center py-4">
          No documents on file yet.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  aria-hidden
                  className={"w-2 h-2 rounded-full flex-shrink-0 " + STATUS_DOT[d.status]}
                />
                <div className="min-w-0">
                  <div className="text-body text-text-primary truncate">
                    {d.document_name}
                  </div>
                  <div className="text-label">{d.document_type}</div>
                </div>
              </div>
              <span className="text-label flex-shrink-0">
                {STATUS_LABEL[d.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CountChip({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span aria-hidden className={"w-2 h-2 rounded-full " + color} />
      <span className="text-label">
        {count} {label}
      </span>
    </span>
  );
}
