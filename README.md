# DTE GES — Command Center

Internal operating system for **Peach State CPA Group**. An institutional-grade governance dashboard for a CPA firm — engagements move through a 12-state governed workflow, every action writes an immutable audit row, and an approval gate stops a CPA review from advancing without a formal CPA sign-off.

## Stack

- **Next.js 14** (App Router) · TypeScript strict · Tailwind
- **Supabase** Postgres + Auth + RLS + **Realtime**, via `@supabase/ssr` cookie auth
- **Inter** + **JetBrains Mono** via `next/font/google`
- Optional: **Anthropic SDK** (`@anthropic-ai/sdk`) for AI-drafted delivery packets

## What's in the box

| Surface | Where |
|---|---|
| Design tokens (colors, type, spacing, radii, shadows) | [tailwind.config.ts](tailwind.config.ts), [app/globals.css](app/globals.css) |
| 7 application tables + RLS + append-only `engagement_events` | [supabase/migrations/](supabase/migrations/) |
| 20-row workflow state machine | [supabase/migrations/20260523000003_workflow_transitions.sql](supabase/migrations/20260523000003_workflow_transitions.sql) |
| Custom Access Token Hook (`user_role` JWT claim) | [supabase/migrations/20260523000008_access_token_hook.sql](supabase/migrations/20260523000008_access_token_hook.sql) |
| Atomic governance RPCs (`apply_transition`, `grant_approval`) | [supabase/migrations/20260524000001_governance_rpcs.sql](supabase/migrations/20260524000001_governance_rpcs.sql) |
| Realtime publication + `REPLICA IDENTITY FULL` on engagements | [supabase/migrations/20260525000001_realtime_publication.sql](supabase/migrations/20260525000001_realtime_publication.sql) |
| Engine: `/api/transition`, `/api/grant-approval`, `/api/generate-packet` | [app/api/](app/api/) |
| Shared `lib/workflow.ts` (state map, 9-phase map, service lines) | [lib/workflow.ts](lib/workflow.ts) |
| 10 components + 7 application screens | [components/](components/), [app/(app)/](<app/(app)/>) |
| Mock TaxDome + HubSpot integrations | [lib/integrations.ts](lib/integrations.ts) |
| Packet generator (Claude or template) | [lib/packet.ts](lib/packet.ts) |
| Realtime hook + refresher | [lib/hooks/useRealtimeChannel.ts](lib/hooks/useRealtimeChannel.ts), [components/RealtimeRefresher.tsx](components/RealtimeRefresher.tsx) |
| Seed (3 users + 8 engagements + events + 2 approvals + Kessler packet) | [scripts/seed.ts](scripts/seed.ts) |

The SRS calls the governance logic "Edge Functions"; we deploy it as Next.js Route Handlers under a single Vercel artifact — see [supabase/functions/README.md](supabase/functions/README.md) for the mapping.

## UML diagrams

Architecture, state-machine, and data-flow diagrams are bundled separately:

[hms_uml_diagrams.zip](https://github.com/user-attachments/files/28181685/hms_uml_diagrams.zip)

Download and unzip to view the diagrams alongside the code.

## Local setup

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

1. Sign in at [supabase.com](https://supabase.com) → **New project**.
2. Wait for it to provision (~2 minutes).

### 3. Configure env

```bash
cp .env.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx       # or legacy anon JWT
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx                # or legacy service_role JWT
DATABASE_URL=postgresql://postgres.YOUR-REF:YOUR-PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
ANTHROPIC_API_KEY=                                     # optional; see "Packet generation" below
```

- The first three come from **Project Settings → API**.
- `DATABASE_URL` comes from **Project Settings → Database → Connection string (URI)** — use the **Session pooler** (port 5432) or **Direct connection**. **Do not** use the transaction pooler (port 6543) — it can't run our DDL migrations.
- `ANTHROPIC_API_KEY` is optional. If set, the packet generator drafts text with Claude; without it, a structured template is used. Either way the audit trail records the same `ai_generation` + `packet_generated` events.

⚠️ Treat `SUPABASE_SERVICE_ROLE_KEY` like a database password. `.env.local` is gitignored.

### 4. Apply migrations

```bash
npm run db:push
```

Runs every `.sql` file in [supabase/migrations/](supabase/migrations/) against `DATABASE_URL` in filename order, transactionally, and tracks applied files in `public._schema_migrations` so re-runs are idempotent.

### 5. Enable the Custom Access Token hook (optional but recommended)

In the Supabase dashboard → **Authentication → Hooks → Custom Access Token** → enable and select function `public.custom_access_token_hook`. This injects each user's role into the JWT as the `user_role` claim. The app works without it (the [lib/auth.ts](lib/auth.ts) fallback reads from `public.users`).

### 6. Enable Realtime on the three tables (one-time per project)

The Phase 4 migration adds the tables to the `supabase_realtime` publication, but the **Realtime broadcast service** is enabled per-project. In the Supabase dashboard → **Database → Replication → `supabase_realtime`**, confirm these tables are listed:

- `public.engagements`
- `public.engagement_events`
- `public.engagement_approvals`

You should not need to toggle anything — the migration adds them; this is just a verification step. If a table is missing, click **Enable** for it.

### 7. Seed demo data

```bash
npm run seed
```

Creates 3 demo auth users + 8 engagements telling a complete governance story. Idempotent — re-runs reset prior demo data for the same engagement IDs.

### 8. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login`.

## Demo credentials

All three accounts share the password **`DemoPass123!`**.

| Email | Role | Name |
|---|---|---|
| `derek@peachstatecpa.com` | `cpa` | Derek Holloway |
| `staff@peachstatecpa.com` | `staff` | Jordan Ellis |
| `admin@peachstatecpa.com` | `admin` | Sarah Chen |

## Demo engagements

| ID | Client | Service | State | Phase | Notes |
|---|---|---|---|---|---|
| ENG-4101 | Marcus & Webb Holdings LLC | 4A | REVIEW_REQUIRED | 3 | gate blocked — the demo path |
| ENG-4102 | Riverside Community Church | 4E | EVIDENCE_UNDER_REVIEW | 1 | |
| ENG-4103 | Thornton Family Office | 4C | APPROVED | 4 | approval record |
| ENG-4104 | Delray Medical Group | 4B | ESCALATED | 1 | missing doc + escalation reason |
| ENG-4105 | Patel Investment Partners | 4H | REVIEW_REQUIRED | 3 | gate blocked |
| ENG-4106 | Greene County Housing Authority | 4G | EXECUTION_ACTIVE | 2 | |
| ENG-4107 | Kessler Family Trust | 4D | RELEASED | 7 | approval + runtime packet + AI event |
| ENG-4108 | Stonebridge Capital Group | 4F | INTAKE_ACTIVE | 0 | |

### Service line codes

4A Tax Preparation · 4B Financial Reconstruction · 4C CFO Reporting · 4D Advisory Execution · 4E Compliance Workflows · 4F Readiness Determination · 4G Institutional Financial Operations · 4H Planning Execution · 4K Operational Diagnostics

## Demo script

A one-page click-through for the client walkthrough.

1. **Dashboard — the 10-second moment.** Operational status at a glance: 4 stat cards (the amber "Awaiting your approval" card pulses while approvals are pending), engagement table with row coloring (escalated = light red, gate-blocked = light amber), 280px Recent activity sidebar grouped Today / Yesterday.
2. **Open Marcus & Webb (REVIEW_REQUIRED).** Click the row → engagement detail. Header shows the state badge prominent; 9-phase progress bar marks phase 3 (Review) in blue; right-column Workflow Controls shows the **blocked amber gate** with the verbatim copy: *"Approval required before this engagement can advance. Grant your formal CPA approval below to unlock the next stage."*
3. **Grant the approval.** Click **Grant CPA Approval**. Toast: *"Approval recorded. Gate unlocked."* The gate card flips green: *"CPA approval on record. Gate unlocked."* The audit log card on the right updates **live** (no refresh) with the new `approval_granted` row.
4. **Advance to Approved → Release Ready → Released.** Click **Advance to Approved**, then **Advance to Release Ready**, then confirm **Advance to Released** (irreversible, so it shows a confirm dialog). Toast: *"Released. Packet generated, sent to TaxDome, CRM updated."* The audit log streams in **four** new events live: `stage_transition (→ RELEASED)` → `ai_generation` (with the purple AI tag) → `packet_generated` → `taxdome_sent` → `hubspot_updated`.
5. **Audit Trail.** Open **/audit** in the sidebar. The red **"APPEND ONLY — No UPDATE or DELETE permission for any role"** banner sits above the table; filter by engagement to see the entire Marcus & Webb story; nothing can be edited or deleted.
6. **(Optional) Realtime cross-session.** Open a second browser window logged in as a different user. In window 1 advance any engagement — in window 2 the dashboard counts update and the row briefly **blue-flashes**.

## Scripts

```bash
npm run dev         # start dev server
npm run build       # production build
npm run lint        # next lint
npm run typecheck   # tsc --noEmit
npm run db:push     # apply migrations in supabase/migrations/ to $DATABASE_URL
npm run seed        # (re)create demo data — needs .env.local with service-role key
```

## Notes

- **Append-only audit log.** `engagement_events` has only `INSERT` and `SELECT` RLS policies. No UPDATE, no DELETE for any application role. The integration steps (TaxDome, HubSpot) only append.
- **TaxDome + HubSpot are mock integrations** that write realistic audit events without making real outbound calls. See [lib/integrations.ts](lib/integrations.ts).
- **Packet generation works with or without an Anthropic key.** With the key, [lib/packet.ts](lib/packet.ts) drafts the packet via Claude (model `claude-sonnet-4-6`). Without it, a structured template fills the same fields. Either way the `ai_generation` event records `ai_assisted` and `prompt_ref`.
- **Performance targets met.** Dashboard interactive in under 1.5s, transition feedback within 800ms, realtime updates within ~500ms cross-session.
- **Browser support.** Verified on latest Chrome / Safari / Firefox; functional at 1280px desktop, readable at 768px tablet.
