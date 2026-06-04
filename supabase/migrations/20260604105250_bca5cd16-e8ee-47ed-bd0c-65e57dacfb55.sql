
-- 1. Fix document_audit_logs policy: use profiles join via auth.uid()
DROP POLICY IF EXISTS "Empresas veem seus próprios logs" ON public.document_audit_logs;
CREATE POLICY "Empresas veem seus próprios logs"
  ON public.document_audit_logs FOR SELECT
  USING (company_id = (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()));

-- 2. Remove overly-permissive OCR storage policies
DROP POLICY IF EXISTS "Users can upload OCR documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own OCR documents" ON storage.objects;

-- 3. Fix ocr_usage tautology policy
DROP POLICY IF EXISTS "Empresas podem ver seu próprio uso de OCR" ON public.ocr_usage;
-- "OCR usage visible to own company" policy already enforces proper isolation

-- 4. Partners: remove company_id IS NULL public exposure
DROP POLICY IF EXISTS "Partners viewable by company" ON public.partners;
CREATE POLICY "Partners viewable by company"
  ON public.partners FOR SELECT
  USING (company_id = (SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()));

-- 5. profiles: prevent privilege escalation via self-update
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role and global admins to change role/company_id/partner_id
  IF auth.uid() IS NULL OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin_master_global','admin_master')
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Not allowed to change role';
  END IF;
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'Not allowed to change company_id';
  END IF;
  IF NEW.partner_id IS DISTINCT FROM OLD.partner_id THEN
    RAISE EXCEPTION 'Not allowed to change partner_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 6. Restrict system_* public read to authenticated
DROP POLICY IF EXISTS "Everyone can view changelog" ON public.system_changelog;
CREATE POLICY "Authenticated users can view changelog"
  ON public.system_changelog FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Everyone can read health metrics" ON public.system_health_metrics;
CREATE POLICY "Admins can read health metrics"
  ON public.system_health_metrics FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin_master','admin_master_global')));

DROP POLICY IF EXISTS "Everyone can read incidents" ON public.system_incidents;
CREATE POLICY "Authenticated users can read incidents"
  ON public.system_incidents FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view readiness scores" ON public.system_readiness_scores;
CREATE POLICY "Admins can view readiness scores"
  ON public.system_readiness_scores FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin_master','admin_master_global')));

-- 7. Vessel documents: add explicit DELETE/UPDATE policies scoped by company
CREATE POLICY "Users can update vessel documents in own company"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vessel-documents' AND (storage.foldername(name))[1] IN (
    SELECT (profiles.company_id)::text FROM profiles WHERE profiles.id = auth.uid()
  ))
  WITH CHECK (bucket_id = 'vessel-documents' AND (storage.foldername(name))[1] IN (
    SELECT (profiles.company_id)::text FROM profiles WHERE profiles.id = auth.uid()
  ));

CREATE POLICY "Users can delete vessel documents in own company"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vessel-documents' AND (storage.foldername(name))[1] IN (
    SELECT (profiles.company_id)::text FROM profiles WHERE profiles.id = auth.uid()
  ));
