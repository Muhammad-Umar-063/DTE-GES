# Supabase Edge Functions — Where the logic actually lives

The SRS (Section 9) calls for the governance logic to ship as Supabase Edge
Functions at `/functions/v1/transition`, `/functions/v1/grant-approval`, and
`/functions/v1/generate-packet`. For this build we made an **intentional
deviation**: the same contracts are implemented as **Next.js Route Handlers**
so the entire system deploys as a single Vercel artifact and there's no
separate edge-function deployment step.

**Every behavioral requirement of §9 is preserved** — request/response shapes,
the §14 error codes and copy, the execution flow, the approval gate, role
verification, and atomicity.

## Mapping

| SRS endpoint                | Implemented as                              |
|-----------------------------|---------------------------------------------|
| `POST /functions/v1/transition`      | `POST /api/transition` — [app/api/transition/route.ts](../../app/api/transition/route.ts) |
| `POST /functions/v1/grant-approval`  | `POST /api/grant-approval` — [app/api/grant-approval/route.ts](../../app/api/grant-approval/route.ts) |
| `POST /functions/v1/generate-packet` | `POST /api/generate-packet` — [app/api/generate-packet/route.ts](../../app/api/generate-packet/route.ts) |

Atomic writes live in the SECURITY DEFINER Postgres functions
`public.apply_transition` and `public.grant_approval` (see
[supabase/migrations/20260524000001_governance_rpcs.sql](../migrations/20260524000001_governance_rpcs.sql)).
Both Route Handler and Edge Function paths would call the same RPCs.

## Porting to literal edge functions later

If the firm wants edge functions instead of Route Handlers, the port is
mechanical: copy each `route.ts` body into a Deno-flavored
`/functions/<name>/index.ts`, swap the `@supabase/ssr` server client for the
edge-function Supabase client, and re-host the helpers in `lib/engine.ts`,
`lib/packet.ts`, and `lib/integrations.ts` as shared modules. The RPCs and
audit-event semantics do not change.
