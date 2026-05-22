# DTE GES — Command Center

Internal operating system for **Peach State CPA Group**. Phase 1 (this codebase) is the foundation: design system, database schema, append-only audit log, authentication, and seeded demo data. Phases 2–4 add the governance engine, component library, and the six application screens.

## Stack

- **Next.js 14** (App Router) · TypeScript strict · Tailwind
- **Supabase** (Postgres + Auth + RLS) via `@supabase/ssr` cookie auth
- **Inter** + **JetBrains Mono** via `next/font/google`

## What's in Phase 1

| Area | Where |
|---|---|
| Design tokens (colors, type, spacing, radii, shadows) | [tailwind.config.ts](tailwind.config.ts), [app/globals.css](app/globals.css) |
| 7 tables + RLS + append-only `engagement_events` | [supabase/migrations/](supabase/migrations/) |
| 20-row workflow state machine | [supabase/migrations/20260523000003_workflow_transitions.sql](supabase/migrations/20260523000003_workflow_transitions.sql) |
| Custom Access Token Hook (`user_role` claim) | [supabase/migrations/20260523000008_access_token_hook.sql](supabase/migrations/20260523000008_access_token_hook.sql) |
| Supabase clients (browser / server / admin / middleware) | [lib/supabase/](lib/supabase/) |
| `getSession()` with JWT claim + table fallback | [lib/auth.ts](lib/auth.ts) |
| Login page | [app/login/](app/login/) |
| Route protection | [middleware.ts](middleware.ts) |
| Placeholder dashboard | [app/dashboard/page.tsx](app/dashboard/page.tsx) |
| Seed (3 users + 8 engagements + events + 2 approvals + Kessler packet) | [scripts/seed.ts](scripts/seed.ts) |

## Local setup

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

1. Sign in at [supabase.com](https://supabase.com) → **New project**.
2. Wait for it to provision (~2 minutes).
3. **Project Settings → API** — copy the **Project URL**, **anon public** key, and **service_role secret** key.

### 3. Configure env

```bash
cp .env.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres.YOUR-REF:YOUR-PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
ANTHROPIC_API_KEY=                # leave blank for Phase 1
```

The first three come from **Project Settings → API**. The `DATABASE_URL` comes from **Project Settings → Database → Connection string (URI tab)** — use the **Session pooler** (port 5432) or **Direct connection**. Do NOT use the transaction pooler (port 6543).

⚠️ Treat `SUPABASE_SERVICE_ROLE_KEY` like a database password — it bypasses RLS. `.env.local` is already gitignored.

### 4. Apply migrations

```bash
npm run db:push
```

This runs every `.sql` file in [supabase/migrations/](supabase/migrations/) against `DATABASE_URL` in filename order, wrapped in transactions, and tracks applied files in a `public._schema_migrations` ledger so re-runs only execute new files.

Verify in **Table Editor**: 7 application tables, `workflow_transitions` has 20 rows.

### 5. Enable the Custom Access Token hook

The hook injects each user's `role` from `public.users` into the JWT as a custom claim `user_role`, so later phases can authorise without a DB round-trip.

1. Supabase dashboard → **Authentication → Hooks**.
2. Under **Custom Access Token**, click **Enable hook**.
3. Choose **Postgres** as the source and select function `public.custom_access_token_hook`.
4. Save.

If you skip this step the app still works — [lib/auth.ts](lib/auth.ts) falls back to a one-row read from `public.users`.

### 6. Seed demo data

```bash
npm run seed
```

This creates 3 demo auth users (via the Admin API) and 8 engagements telling a complete governance story. Re-running cleanly resets prior demo data for the same engagement IDs.

### 7. Run the dev server

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
| ENG-4101 | Marcus & Webb Holdings LLC | 4A | REVIEW_REQUIRED | 3 | review gate blocked |
| ENG-4102 | Riverside Community Church | 4E | EVIDENCE_UNDER_REVIEW | 1 | |
| ENG-4103 | Thornton Family Office | 4C | APPROVED | 4 | approval record |
| ENG-4104 | Delray Medical Group | 4B | ESCALATED | 1 | missing doc + escalation reason |
| ENG-4105 | Patel Investment Partners | 4H | REVIEW_REQUIRED | 3 | review gate blocked |
| ENG-4106 | Greene County Housing Authority | 4G | EXECUTION_ACTIVE | 2 | |
| ENG-4107 | Kessler Family Trust | 4D | RELEASED | 7 | approval + runtime packet + AI event |
| ENG-4108 | Stonebridge Capital Group | 4F | INTAKE_ACTIVE | 0 | |

### Service line codes

4A Tax Preparation · 4B Financial Reconstruction · 4C CFO Reporting · 4D Advisory Execution · 4E Compliance Workflows · 4F Readiness Determination · 4G Institutional Financial Operations · 4H Planning Execution · 4K Operational Diagnostics

## Append-only audit guarantee

`engagement_events` has **only** `INSERT` and `SELECT` RLS policies. There is no `UPDATE` policy and no `DELETE` policy for any role. The append-only guarantee is enforced at the RLS layer because that is the last line of defense any client (server route, edge function, RPC) hits.

The seed script uses the service-role key to delete prior demo rows when re-run — the service role bypasses RLS, which is the only way to write to or delete from this table outside of inserts. Application code must never use the service-role client.

## Scripts

```bash
npm run dev         # start dev server
npm run build       # production build
npm run lint        # next lint
npm run typecheck   # tsc --noEmit
npm run db:push     # apply migrations in supabase/migrations/ to $DATABASE_URL
npm run seed        # (re)create demo data — needs .env.local with service-role key
```

## Phase 1 boundaries

Phase 1 deliberately does **not** include:

- The app shell, sidebar, or any screen beyond the `/dashboard` placeholder (Phases 2–4)
- The transition engine, approval logic, or escalation handlers (Phase 2)
- The shared component library (Phase 3)
- Production deployment (post-Phase 4)
