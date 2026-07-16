
-- document_categories
DROP POLICY IF EXISTS "Categorias visíveis por todos autenticados" ON public.document_categories;
CREATE POLICY "Categorias visíveis por todos autenticados"
  ON public.document_categories FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- process_type_requirements
DROP POLICY IF EXISTS "Requisitos visíveis por todos autenticados" ON public.process_type_requirements;
CREATE POLICY "Requisitos visíveis por todos autenticados"
  ON public.process_type_requirements FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- system_health
DROP POLICY IF EXISTS "Authenticated users can view system health" ON public.system_health;
CREATE POLICY "Authenticated users can view system health"
  ON public.system_health FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- telemetry_logs: enforce ownership on insert
DROP POLICY IF EXISTS "Telemetry insertable by authenticated" ON public.telemetry_logs;
CREATE POLICY "Telemetry insertable by authenticated"
  ON public.telemetry_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
