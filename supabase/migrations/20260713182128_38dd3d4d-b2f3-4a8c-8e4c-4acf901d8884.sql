
-- process_automation_state: add write policies scoped by process → company
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_automation_state TO authenticated;
GRANT ALL ON public.process_automation_state TO service_role;

DROP POLICY IF EXISTS "Company users can insert automation state" ON public.process_automation_state;
CREATE POLICY "Company users can insert automation state"
  ON public.process_automation_state FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.processes p
      WHERE p.id = process_automation_state.process_id
        AND p.company_id = public.current_user_company_id()
    )
    OR public.is_admin_master()
  );

DROP POLICY IF EXISTS "Company users can update automation state" ON public.process_automation_state;
CREATE POLICY "Company users can update automation state"
  ON public.process_automation_state FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.processes p
      WHERE p.id = process_automation_state.process_id
        AND p.company_id = public.current_user_company_id()
    )
    OR public.is_admin_master()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.processes p
      WHERE p.id = process_automation_state.process_id
        AND p.company_id = public.current_user_company_id()
    )
    OR public.is_admin_master()
  );

DROP POLICY IF EXISTS "Company users can delete automation state" ON public.process_automation_state;
CREATE POLICY "Company users can delete automation state"
  ON public.process_automation_state FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.processes p
      WHERE p.id = process_automation_state.process_id
        AND p.company_id = public.current_user_company_id()
    )
    OR public.is_admin_master()
  );

-- operational_insights: add write policies scoped by company_id
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_insights TO authenticated;
GRANT ALL ON public.operational_insights TO service_role;

DROP POLICY IF EXISTS "Company users can insert operational insights" ON public.operational_insights;
CREATE POLICY "Company users can insert operational insights"
  ON public.operational_insights FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.current_user_company_id()
    OR public.is_admin_master()
  );

DROP POLICY IF EXISTS "Company users can update operational insights" ON public.operational_insights;
CREATE POLICY "Company users can update operational insights"
  ON public.operational_insights FOR UPDATE TO authenticated
  USING (
    company_id = public.current_user_company_id()
    OR public.is_admin_master()
  )
  WITH CHECK (
    company_id = public.current_user_company_id()
    OR public.is_admin_master()
  );

DROP POLICY IF EXISTS "Company users can delete operational insights" ON public.operational_insights;
CREATE POLICY "Company users can delete operational insights"
  ON public.operational_insights FOR DELETE TO authenticated
  USING (
    company_id = public.current_user_company_id()
    OR public.is_admin_master()
  );
