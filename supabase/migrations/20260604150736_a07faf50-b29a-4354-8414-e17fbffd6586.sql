
-- 1. Storage: scope document-templates SELECT to user's company folder prefix
DROP POLICY IF EXISTS "Users can read templates" ON storage.objects;
CREATE POLICY "Users can read templates in own company"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'document-templates'
  AND (storage.foldername(name))[1] = (current_user_company_id())::text
);

-- 2. profiles: enforce column-level immutability on critical fields via UPDATE policy
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  AND company_id IS NOT DISTINCT FROM (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  AND partner_id IS NOT DISTINCT FROM (SELECT partner_id FROM public.profiles WHERE id = auth.uid())
  AND is_pilot IS NOT DISTINCT FROM (SELECT is_pilot FROM public.profiles WHERE id = auth.uid())
  AND is_demo_user IS NOT DISTINCT FROM (SELECT is_demo_user FROM public.profiles WHERE id = auth.uid())
);

-- 3. operational_feedback: allow admins to view all feedback
CREATE POLICY "Admins can view all operational feedback"
ON public.operational_feedback FOR SELECT TO authenticated
USING (is_admin_master());

-- 4. ux_usability_metrics: allow users to insert their own metrics
CREATE POLICY "Users can insert their own UX metrics"
ON public.ux_usability_metrics FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own UX metrics"
ON public.ux_usability_metrics FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 5. Revoke EXECUTE from public on internal SECURITY DEFINER trigger-only functions
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_automation_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_process_stage_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_process_automation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_ocr_timeline_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_document_version() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.initialize_company_usage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_activity_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_enterprise_audit_log() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_demo_data(uuid) FROM PUBLIC, anon, authenticated;
