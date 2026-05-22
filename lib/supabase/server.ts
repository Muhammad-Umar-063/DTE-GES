// Server-side Supabase client for App Router (Server Components, Route Handlers,
// Server Actions). Uses @supabase/ssr cookie handling so auth state survives
// across server -> browser round trips.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Server Components cannot set cookies — this throws by design and
          // is caught here. The middleware refreshes the session on every
          // request, so dropping these writes is safe.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // ignore — see comment above
          }
        },
      },
    },
  );
}
