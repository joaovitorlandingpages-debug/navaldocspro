DROP POLICY IF EXISTS "Feature flags readable by authenticated" ON public.feature_flags;
CREATE POLICY "Feature flags readable by admins" ON public.feature_flags FOR SELECT TO authenticated USING (public.is_admin_master());
DROP POLICY IF EXISTS "Authenticated users can view system health" ON public.system_health;
CREATE POLICY "Admins can view system health" ON public.system_health FOR SELECT TO authenticated USING (public.is_admin_master());
DROP POLICY IF EXISTS "Monitoramento visível para todos os autenticados" ON public.system_health_status;
CREATE POLICY "Monitoramento visível para admins" ON public.system_health_status FOR SELECT TO authenticated USING (public.is_admin_master());
DROP POLICY IF EXISTS "Authenticated users can view changelog" ON public.system_changelog;
CREATE POLICY "Users can view published changelog" ON public.system_changelog FOR SELECT TO authenticated USING (is_published = true OR public.is_admin_master());