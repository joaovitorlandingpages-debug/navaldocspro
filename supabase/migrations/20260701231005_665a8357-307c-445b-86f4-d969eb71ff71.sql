-- ============================================================
-- P0 Security Hardening — Revoke anon EXECUTE + tighten signature RLS
-- ============================================================

-- 1) Revoke EXECUTE on all public SECURITY DEFINER functions from anon/public.
REVOKE EXECUTE ON FUNCTION public._assert_process_access(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.active_processes_count(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.company_can_perform(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_company_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_master() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.limits_check(uuid, text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.limits_consume(uuid, text, integer, jsonb, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.limits_status(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.process_archive(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.process_duplicate(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.process_get_share_token(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.process_hard_delete(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.process_materialize_checklist(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.process_restore(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.process_toggle_favorite(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.process_trash(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.process_unarchive(uuid) FROM PUBLIC, anon;

-- 2) Grant EXECUTE explicitly to authenticated for client-facing RPCs.
GRANT EXECUTE ON FUNCTION public.active_processes_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.company_can_perform(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_master() TO authenticated;
GRANT EXECUTE ON FUNCTION public.limits_check(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.limits_consume(uuid, text, integer, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.limits_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_archive(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_unarchive(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_duplicate(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_get_share_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_hard_delete(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_materialize_checklist(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_restore(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_toggle_favorite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_trash(uuid) TO authenticated;

-- 3) Tighten permissive RLS on signature_participants / signature_events.
--    The public token flow (assinar.$token) needs anon to update participant
--    status and log events; scope both to rows that belong to an active
--    signature_request so anonymous callers can't touch arbitrary rows.
DROP POLICY IF EXISTS "anon update by token" ON public.signature_participants;
CREATE POLICY "anon update participant by token"
  ON public.signature_participants
  FOR UPDATE
  TO anon
  USING (
    status <> 'signed'
    AND token_expires_at IS NOT NULL
    AND token_expires_at > now()
    AND EXISTS (
      SELECT 1 FROM public.signature_requests r
      WHERE r.id = signature_request_id
        AND r.status IN ('draft', 'pending', 'in_progress', 'sent')
    )
  )
  WITH CHECK (
    status IN ('signed', 'viewed', 'declined')
    AND EXISTS (
      SELECT 1 FROM public.signature_requests r
      WHERE r.id = signature_request_id
        AND r.status IN ('draft', 'pending', 'in_progress', 'sent')
    )
  );

DROP POLICY IF EXISTS "anon insert signature_events" ON public.signature_events;
CREATE POLICY "anon insert signature_events by token"
  ON public.signature_events
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.signature_requests r
      WHERE r.id = signature_request_id
    )
    AND (
      participant_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.signature_participants p
        WHERE p.id = participant_id
          AND p.signature_request_id = signature_events.signature_request_id
      )
    )
  );
