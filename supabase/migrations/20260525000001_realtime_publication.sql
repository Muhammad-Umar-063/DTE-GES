-- Phase 4 — Supabase Realtime configuration.
--
-- Adds the three governance tables to the `supabase_realtime` publication so
-- the client SDK's postgres_changes channel sees their INSERT/UPDATE/DELETE
-- events. Idempotent — re-running is a no-op.
--
-- Also sets REPLICA IDENTITY FULL on `engagements` so that postgres_changes
-- UPDATE payloads include the prior row state (we read `old.current_state` to
-- decide whether to trigger the blue row-flash animation).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'engagements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.engagements;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'engagement_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.engagement_events;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'engagement_approvals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.engagement_approvals;
  END IF;
END$$;

ALTER TABLE public.engagements REPLICA IDENTITY FULL;
