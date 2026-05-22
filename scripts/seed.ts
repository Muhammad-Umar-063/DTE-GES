/**
 * scripts/seed.ts — demo data for DTE GES Phase 1.
 *
 * Run with:   npx tsx scripts/seed.ts
 *
 * Idempotent: re-running deletes prior demo rows for the 8 ENG-IDs and the
 * 3 demo auth users, then recreates everything. The workflow_transitions
 * table is left alone (it's seeded by the migrations).
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local — bypasses RLS to create
 * auth users and write audit events as if from the seed user themselves.
 */

import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local" });

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------- env ----------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------- demo users ----------
type DemoUser = {
  email: string;
  password: string;
  fullName: string;
  role: "cpa" | "staff" | "admin";
};

const DEMO_USERS: DemoUser[] = [
  {
    email: "derek@peachstatecpa.com",
    password: "DemoPass123!",
    fullName: "Derek Holloway",
    role: "cpa",
  },
  {
    email: "staff@peachstatecpa.com",
    password: "DemoPass123!",
    fullName: "Jordan Ellis",
    role: "staff",
  },
  {
    email: "admin@peachstatecpa.com",
    password: "DemoPass123!",
    fullName: "Sarah Chen",
    role: "admin",
  },
];

// ---------- demo engagements ----------
type DemoEngagement = {
  engagementId: string;
  clientName: string;
  serviceLine: string; // 4A..4K
  state: string;
  phase: number;
  taxYear?: string;
  reportingPeriod?: string;
  hasApproval: boolean;
  escalationReason?: string;
  lastAction: string;
  documents: Array<{
    name: string;
    type: string;
    status: "received" | "missing" | "pending" | "flagged";
    receivedAt?: string;
    notes?: string;
  }>;
  events: Array<{
    actionType: string;
    fromState?: string;
    toState?: string;
    userKey: "cpa" | "staff" | "admin";
    aiAssisted?: boolean;
    promptRef?: string;
    metadata?: Record<string, unknown>;
    notes?: string;
    offsetMinutes: number; // minutes before "now"
  }>;
};

const ENGAGEMENTS: DemoEngagement[] = [
  {
    engagementId: "ENG-4101",
    clientName: "Marcus & Webb Holdings LLC",
    serviceLine: "4A",
    state: "REVIEW_REQUIRED",
    phase: 3,
    taxYear: "2025",
    hasApproval: false,
    lastAction: "CPA review gate opened — awaiting sign-off",
    documents: [
      { name: "Form 1120-S (Draft)", type: "Tax Return", status: "received" },
      { name: "K-1 Schedules", type: "Schedule", status: "received" },
      { name: "Year-End P&L", type: "Financial Statement", status: "received" },
      { name: "Depreciation Schedule", type: "Schedule", status: "pending" },
    ],
    events: [
      { actionType: "engagement_created", userKey: "staff", offsetMinutes: 60 * 24 * 7 },
      { actionType: "stage_transition", fromState: "INITIATED", toState: "INTAKE_ACTIVE", userKey: "staff", offsetMinutes: 60 * 24 * 7 - 30 },
      { actionType: "stage_transition", fromState: "INTAKE_ACTIVE", toState: "EVIDENCE_UNDER_REVIEW", userKey: "staff", offsetMinutes: 60 * 24 * 5 },
      { actionType: "stage_transition", fromState: "EVIDENCE_UNDER_REVIEW", toState: "READY_FOR_EXECUTION", userKey: "staff", offsetMinutes: 60 * 24 * 3 },
      { actionType: "stage_transition", fromState: "READY_FOR_EXECUTION", toState: "EXECUTION_ACTIVE", userKey: "cpa", offsetMinutes: 60 * 24 * 2 },
      { actionType: "stage_transition", fromState: "EXECUTION_ACTIVE", toState: "REVIEW_REQUIRED", userKey: "cpa", offsetMinutes: 60 * 6 },
    ],
  },
  {
    engagementId: "ENG-4102",
    clientName: "Riverside Community Church",
    serviceLine: "4E",
    state: "EVIDENCE_UNDER_REVIEW",
    phase: 1,
    reportingPeriod: "Q1 2026",
    hasApproval: false,
    lastAction: "Evidence collection in progress",
    documents: [
      { name: "Form 990 Schedule A", type: "Tax Return", status: "received" },
      { name: "Donor Receipts Log", type: "Ledger", status: "received" },
      { name: "Board Meeting Minutes", type: "Governance", status: "pending" },
      { name: "Bank Reconciliations", type: "Reconciliation", status: "pending" },
    ],
    events: [
      { actionType: "engagement_created", userKey: "staff", offsetMinutes: 60 * 24 * 4 },
      { actionType: "stage_transition", fromState: "INITIATED", toState: "INTAKE_ACTIVE", userKey: "staff", offsetMinutes: 60 * 24 * 4 - 15 },
      { actionType: "stage_transition", fromState: "INTAKE_ACTIVE", toState: "EVIDENCE_UNDER_REVIEW", userKey: "staff", offsetMinutes: 60 * 24 * 2 },
      { actionType: "document_uploaded", userKey: "staff", metadata: { document_name: "Donor Receipts Log" }, offsetMinutes: 60 * 18 },
    ],
  },
  {
    engagementId: "ENG-4103",
    clientName: "Thornton Family Office",
    serviceLine: "4C",
    state: "APPROVED",
    phase: 4,
    reportingPeriod: "April 2026",
    hasApproval: true,
    lastAction: "CPA approval granted by Derek Holloway",
    documents: [
      { name: "Consolidated Balance Sheet", type: "Financial Statement", status: "received" },
      { name: "Cash Flow Statement", type: "Financial Statement", status: "received" },
      { name: "Investment Portfolio Summary", type: "Report", status: "received" },
      { name: "Quarterly CFO Memo", type: "Memo", status: "received" },
    ],
    events: [
      { actionType: "engagement_created", userKey: "staff", offsetMinutes: 60 * 24 * 12 },
      { actionType: "stage_transition", fromState: "INITIATED", toState: "INTAKE_ACTIVE", userKey: "staff", offsetMinutes: 60 * 24 * 12 - 10 },
      { actionType: "stage_transition", fromState: "INTAKE_ACTIVE", toState: "EVIDENCE_UNDER_REVIEW", userKey: "staff", offsetMinutes: 60 * 24 * 10 },
      { actionType: "stage_transition", fromState: "EVIDENCE_UNDER_REVIEW", toState: "READY_FOR_EXECUTION", userKey: "staff", offsetMinutes: 60 * 24 * 7 },
      { actionType: "stage_transition", fromState: "READY_FOR_EXECUTION", toState: "EXECUTION_ACTIVE", userKey: "cpa", offsetMinutes: 60 * 24 * 5 },
      { actionType: "stage_transition", fromState: "EXECUTION_ACTIVE", toState: "REVIEW_REQUIRED", userKey: "cpa", offsetMinutes: 60 * 24 * 2 },
      { actionType: "approval_granted", userKey: "cpa", offsetMinutes: 60 * 24 },
      { actionType: "stage_transition", fromState: "REVIEW_REQUIRED", toState: "APPROVED", userKey: "cpa", offsetMinutes: 60 * 24 - 5 },
    ],
  },
  {
    engagementId: "ENG-4104",
    clientName: "Delray Medical Group",
    serviceLine: "4B",
    state: "ESCALATED",
    phase: 1,
    reportingPeriod: "2024 Reconstruction",
    hasApproval: false,
    escalationReason:
      "Missing 2024 Q3 bank statements and unreconciled $48,200 variance in accounts receivable — cannot proceed without source documents.",
    lastAction: "Engagement escalated: missing source documents",
    documents: [
      { name: "2024 General Ledger Export", type: "Ledger", status: "received" },
      { name: "Q1–Q2 Bank Statements", type: "Bank Statement", status: "received" },
      { name: "Q3 2024 Bank Statements", type: "Bank Statement", status: "missing", notes: "Client unable to retrieve from prior bank" },
      { name: "A/R Aging Report", type: "Report", status: "flagged", notes: "$48,200 variance vs. GL" },
    ],
    events: [
      { actionType: "engagement_created", userKey: "staff", offsetMinutes: 60 * 24 * 6 },
      { actionType: "stage_transition", fromState: "INITIATED", toState: "INTAKE_ACTIVE", userKey: "staff", offsetMinutes: 60 * 24 * 6 - 10 },
      { actionType: "stage_transition", fromState: "INTAKE_ACTIVE", toState: "EVIDENCE_UNDER_REVIEW", userKey: "staff", offsetMinutes: 60 * 24 * 4 },
      { actionType: "document_flagged", userKey: "staff", metadata: { document_name: "A/R Aging Report", variance_usd: 48200 }, offsetMinutes: 60 * 24 * 2 },
      { actionType: "escalation_created", fromState: "EVIDENCE_UNDER_REVIEW", toState: "ESCALATED", userKey: "staff", offsetMinutes: 60 * 12, notes: "Missing source documents" },
    ],
  },
  {
    engagementId: "ENG-4105",
    clientName: "Patel Investment Partners",
    serviceLine: "4H",
    state: "REVIEW_REQUIRED",
    phase: 3,
    taxYear: "2025",
    hasApproval: false,
    lastAction: "Planning execution complete — CPA review pending",
    documents: [
      { name: "Estate Planning Memo (Draft)", type: "Memo", status: "received" },
      { name: "Trust Allocation Schedule", type: "Schedule", status: "received" },
      { name: "Beneficiary Designations", type: "Legal Document", status: "received" },
    ],
    events: [
      { actionType: "engagement_created", userKey: "staff", offsetMinutes: 60 * 24 * 5 },
      { actionType: "stage_transition", fromState: "INITIATED", toState: "INTAKE_ACTIVE", userKey: "staff", offsetMinutes: 60 * 24 * 5 - 20 },
      { actionType: "stage_transition", fromState: "INTAKE_ACTIVE", toState: "EVIDENCE_UNDER_REVIEW", userKey: "staff", offsetMinutes: 60 * 24 * 3 },
      { actionType: "stage_transition", fromState: "EVIDENCE_UNDER_REVIEW", toState: "READY_FOR_EXECUTION", userKey: "staff", offsetMinutes: 60 * 24 * 2 },
      { actionType: "stage_transition", fromState: "READY_FOR_EXECUTION", toState: "EXECUTION_ACTIVE", userKey: "cpa", offsetMinutes: 60 * 24 },
      { actionType: "stage_transition", fromState: "EXECUTION_ACTIVE", toState: "REVIEW_REQUIRED", userKey: "cpa", offsetMinutes: 60 * 4 },
    ],
  },
  {
    engagementId: "ENG-4106",
    clientName: "Greene County Housing Authority",
    serviceLine: "4G",
    state: "EXECUTION_ACTIVE",
    phase: 2,
    reportingPeriod: "FY 2025-26",
    hasApproval: false,
    lastAction: "Execution active — institutional financial ops review",
    documents: [
      { name: "Audited Financial Statements", type: "Financial Statement", status: "received" },
      { name: "HUD Compliance Forms", type: "Compliance", status: "received" },
      { name: "Internal Controls Memo", type: "Memo", status: "received" },
      { name: "Vendor Payment Log", type: "Ledger", status: "pending" },
    ],
    events: [
      { actionType: "engagement_created", userKey: "staff", offsetMinutes: 60 * 24 * 8 },
      { actionType: "stage_transition", fromState: "INITIATED", toState: "INTAKE_ACTIVE", userKey: "staff", offsetMinutes: 60 * 24 * 8 - 15 },
      { actionType: "stage_transition", fromState: "INTAKE_ACTIVE", toState: "EVIDENCE_UNDER_REVIEW", userKey: "staff", offsetMinutes: 60 * 24 * 6 },
      { actionType: "stage_transition", fromState: "EVIDENCE_UNDER_REVIEW", toState: "READY_FOR_EXECUTION", userKey: "staff", offsetMinutes: 60 * 24 * 4 },
      { actionType: "stage_transition", fromState: "READY_FOR_EXECUTION", toState: "EXECUTION_ACTIVE", userKey: "cpa", offsetMinutes: 60 * 24 },
    ],
  },
  {
    engagementId: "ENG-4107",
    clientName: "Kessler Family Trust",
    serviceLine: "4D",
    state: "RELEASED",
    phase: 7,
    taxYear: "2025",
    hasApproval: true,
    lastAction: "Packet released to TaxDome — delivery confirmed",
    documents: [
      { name: "Form 1041 (Final)", type: "Tax Return", status: "received" },
      { name: "Trust Income Schedule", type: "Schedule", status: "received" },
      { name: "Beneficiary K-1s", type: "Schedule", status: "received" },
      { name: "Advisory Memo (AI-Drafted)", type: "Memo", status: "received" },
    ],
    events: [
      { actionType: "engagement_created", userKey: "staff", offsetMinutes: 60 * 24 * 21 },
      { actionType: "stage_transition", fromState: "INITIATED", toState: "INTAKE_ACTIVE", userKey: "staff", offsetMinutes: 60 * 24 * 21 - 10 },
      { actionType: "stage_transition", fromState: "INTAKE_ACTIVE", toState: "EVIDENCE_UNDER_REVIEW", userKey: "staff", offsetMinutes: 60 * 24 * 18 },
      { actionType: "stage_transition", fromState: "EVIDENCE_UNDER_REVIEW", toState: "READY_FOR_EXECUTION", userKey: "staff", offsetMinutes: 60 * 24 * 14 },
      { actionType: "stage_transition", fromState: "READY_FOR_EXECUTION", toState: "EXECUTION_ACTIVE", userKey: "cpa", offsetMinutes: 60 * 24 * 12 },
      { actionType: "ai_generation", userKey: "cpa", aiAssisted: true, promptRef: "advisory_memo_v1", metadata: { model: "claude-opus-4-7", tokens: 4280 }, offsetMinutes: 60 * 24 * 10 },
      { actionType: "stage_transition", fromState: "EXECUTION_ACTIVE", toState: "REVIEW_REQUIRED", userKey: "cpa", offsetMinutes: 60 * 24 * 8 },
      { actionType: "approval_granted", userKey: "cpa", offsetMinutes: 60 * 24 * 6 },
      { actionType: "stage_transition", fromState: "REVIEW_REQUIRED", toState: "APPROVED", userKey: "cpa", offsetMinutes: 60 * 24 * 6 - 5 },
      { actionType: "stage_transition", fromState: "APPROVED", toState: "RELEASE_READY", userKey: "cpa", offsetMinutes: 60 * 24 * 4 },
      { actionType: "packet_generated", userKey: "cpa", aiAssisted: true, metadata: { packet_id: "PKT-4107-001" }, offsetMinutes: 60 * 24 * 3 },
      { actionType: "stage_transition", fromState: "RELEASE_READY", toState: "RELEASED", userKey: "cpa", offsetMinutes: 60 * 24 * 2 },
      { actionType: "taxdome_sent", userKey: "cpa", metadata: { delivery_id: "td_kessler_2025" }, offsetMinutes: 60 * 24 * 2 - 30 },
    ],
  },
  {
    engagementId: "ENG-4108",
    clientName: "Stonebridge Capital Group",
    serviceLine: "4F",
    state: "INTAKE_ACTIVE",
    phase: 0,
    reportingPeriod: "Onboarding 2026",
    hasApproval: false,
    lastAction: "Intake checklist sent to client",
    documents: [
      { name: "Engagement Letter", type: "Contract", status: "received" },
      { name: "Prior-Year Tax Returns", type: "Tax Return", status: "pending" },
      { name: "Operating Agreement", type: "Legal Document", status: "pending" },
      { name: "Investor Roster", type: "Roster", status: "pending" },
    ],
    events: [
      { actionType: "engagement_created", userKey: "staff", offsetMinutes: 60 * 18 },
      { actionType: "stage_transition", fromState: "INITIATED", toState: "INTAKE_ACTIVE", userKey: "staff", offsetMinutes: 60 * 17 },
      { actionType: "document_uploaded", userKey: "staff", metadata: { document_name: "Engagement Letter" }, offsetMinutes: 60 * 16 },
      { actionType: "automation_triggered", userKey: "staff", metadata: { automation: "client_intake_email" }, offsetMinutes: 60 * 15 },
    ],
  },
];

// ---------- helpers ----------
async function findUserByEmail(email: string): Promise<string | null> {
  // listUsers paginates; we have very few users so the first page is enough.
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => u.email === email)?.id ?? null;
}

async function upsertAuthUser(u: DemoUser): Promise<string> {
  const existingId = await findUserByEmail(u.email);
  if (existingId) {
    // Reset password so the demo creds are guaranteed to work.
    await admin.auth.admin.updateUserById(existingId, {
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.fullName, role: u.role },
    });
    return existingId;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { full_name: u.fullName, role: u.role },
  });
  if (error || !data.user) {
    throw new Error(`Failed to create user ${u.email}: ${error?.message}`);
  }
  return data.user.id;
}

async function upsertPublicUser(u: DemoUser, authId: string) {
  const { error } = await admin.from("users").upsert(
    {
      id: authId,
      email: u.email,
      full_name: u.fullName,
      role: u.role,
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(`upsert public.users ${u.email}: ${error.message}`);
}

async function deleteEngagementChildren(engagementUuid: string) {
  // Deleting from append-only engagement_events requires the service role,
  // which bypasses RLS. We only do this to make re-running the seed clean.
  await admin.from("engagement_events").delete().eq("engagement_id", engagementUuid);
  await admin.from("documents").delete().eq("engagement_id", engagementUuid);
  await admin.from("runtime_packets").delete().eq("engagement_id", engagementUuid);
  // Approvals are referenced by engagements.cpa_approval_id; null it first.
  await admin
    .from("engagements")
    .update({ cpa_approval_id: null })
    .eq("id", engagementUuid);
  await admin.from("engagement_approvals").delete().eq("engagement_id", engagementUuid);
}

async function resetExistingEngagement(engagementCode: string) {
  const { data: existing } = await admin
    .from("engagements")
    .select("id")
    .eq("engagement_id", engagementCode)
    .maybeSingle();
  if (existing?.id) {
    await deleteEngagementChildren(existing.id);
    await admin.from("engagements").delete().eq("id", existing.id);
  }
}

function isoFromOffset(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

// ---------- main ----------
async function main() {
  console.log("→ Creating / refreshing 3 demo auth users…");
  const userIds: Record<DemoUser["role"], string> = {} as never;
  for (const u of DEMO_USERS) {
    const id = await upsertAuthUser(u);
    await upsertPublicUser(u, id);
    userIds[u.role] = id;
    console.log(`   ✓ ${u.email}  (${u.role})`);
  }

  const cpaId = userIds.cpa;

  console.log("→ Resetting prior demo engagements…");
  for (const e of ENGAGEMENTS) await resetExistingEngagement(e.engagementId);

  console.log("→ Inserting 8 engagements + documents + events…");
  for (const e of ENGAGEMENTS) {
    const { data: engRow, error: engErr } = await admin
      .from("engagements")
      .insert({
        engagement_id: e.engagementId,
        client_name: e.clientName,
        service_line: e.serviceLine,
        current_state: e.state,
        current_phase: e.phase,
        tax_year: e.taxYear ?? null,
        reporting_period: e.reportingPeriod ?? null,
        cpa_id: cpaId,
        escalation_reason: e.escalationReason ?? null,
        last_action: e.lastAction,
      })
      .select("id")
      .single();

    if (engErr || !engRow) {
      throw new Error(`engagements ${e.engagementId}: ${engErr?.message}`);
    }
    const engagementUuid = engRow.id;

    // Documents
    if (e.documents.length > 0) {
      const docRows = e.documents.map((d) => ({
        engagement_id: engagementUuid,
        document_name: d.name,
        document_type: d.type,
        status: d.status,
        received_at: d.status === "received" ? d.receivedAt ?? new Date().toISOString() : null,
        notes: d.notes ?? null,
      }));
      const { error: docErr } = await admin.from("documents").insert(docRows);
      if (docErr) throw new Error(`documents ${e.engagementId}: ${docErr.message}`);
    }

    // Approval (if applicable). Order: approval row first, then patch
    // engagements.cpa_approval_id, then events reference the approval.
    let approvalId: string | null = null;
    if (e.hasApproval) {
      const { data: approvalRow, error: approvalErr } = await admin
        .from("engagement_approvals")
        .insert({
          engagement_id: engagementUuid,
          approved_by: cpaId,
          approval_type: "cpa_approval",
          approval_notes: `Approved by Derek Holloway — ${e.clientName}`,
        })
        .select("id")
        .single();
      if (approvalErr || !approvalRow) {
        throw new Error(`approvals ${e.engagementId}: ${approvalErr?.message}`);
      }
      approvalId = approvalRow.id;
      await admin
        .from("engagements")
        .update({ cpa_approval_id: approvalId })
        .eq("id", engagementUuid);
    }

    // Events. Insert in chronological order.
    const eventRows = [...e.events]
      .sort((a, b) => b.offsetMinutes - a.offsetMinutes)
      .map((ev) => ({
        engagement_id: engagementUuid,
        timestamp: isoFromOffset(ev.offsetMinutes),
        user_id: userIds[ev.userKey],
        user_role: ev.userKey,
        action_type: ev.actionType,
        from_state: ev.fromState ?? null,
        to_state: ev.toState ?? null,
        ai_assisted: ev.aiAssisted ?? false,
        prompt_ref: ev.promptRef ?? null,
        metadata: ev.metadata
          ? { ...ev.metadata, ...(approvalId && ev.actionType === "approval_granted" ? { approval_id: approvalId } : {}) }
          : approvalId && ev.actionType === "approval_granted"
            ? { approval_id: approvalId }
            : null,
        notes: ev.notes ?? null,
      }));
    const { error: evErr } = await admin.from("engagement_events").insert(eventRows);
    if (evErr) throw new Error(`events ${e.engagementId}: ${evErr.message}`);

    console.log(
      `   ✓ ${e.engagementId}  ${e.clientName.padEnd(36)}  ${e.state.padEnd(22)}  docs:${e.documents.length}  events:${e.events.length}`,
    );
  }

  // Kessler runtime packet
  console.log("→ Inserting runtime packet for Kessler…");
  const { data: kessler } = await admin
    .from("engagements")
    .select("id")
    .eq("engagement_id", "ENG-4107")
    .single();
  if (kessler?.id) {
    const { error: pktErr } = await admin.from("runtime_packets").insert({
      packet_id: "PKT-4107-001",
      engagement_id: kessler.id,
      service_line_id: "4D",
      workflow_state: "RELEASED",
      evidence_refs: {
        documents: [
          "Form 1041 (Final)",
          "Trust Income Schedule",
          "Beneficiary K-1s",
          "Advisory Memo (AI-Drafted)",
        ],
      },
      approval_history: [
        {
          approved_by: "Derek Holloway",
          approval_type: "cpa_approval",
          approved_at: isoFromOffset(60 * 24 * 6),
        },
      ],
      escalation_history: [],
      output_refs: {
        taxdome_delivery_id: "td_kessler_2025",
        delivered_at: isoFromOffset(60 * 24 * 2 - 30),
      },
      kpi_refs: {
        cycle_time_days: 19,
        ai_assist_count: 2,
        escalations: 0,
      },
      version_history: [{ version: 1, created_at: isoFromOffset(60 * 24 * 3) }],
      compression_state: "OPERATIONAL",
      replay_metadata: { last_replay_at: null },
      ai_assisted: true,
    });
    if (pktErr) throw new Error(`runtime_packets: ${pktErr.message}`);
    console.log("   ✓ PKT-4107-001");
  }

  console.log("\n✓ Seed complete.");
  console.log("  Sign in at /login as derek@peachstatecpa.com / DemoPass123!");
}

main().catch((err) => {
  console.error("\n✗ Seed failed:", err);
  process.exit(1);
});
