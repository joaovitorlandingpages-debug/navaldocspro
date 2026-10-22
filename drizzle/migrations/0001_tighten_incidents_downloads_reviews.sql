DROP POLICY IF EXISTS "Authenticated users can read incidents" ON public.system_incidents;
CREATE POLICY "Admins can read incidents" ON public.system_incidents FOR SELECT TO authenticated USING (public.is_admin_master());

DROP POLICY IF EXISTS "anyone_read_downloads" ON public.template_downloads;
CREATE POLICY "company_read_downloads" ON public.template_downloads FOR SELECT TO authenticated
USING (public.is_admin_master() OR company_id = public.current_user_company_id() OR user_id = auth.uid());

DROP POLICY IF EXISTS "anyone_read_reviews" ON public.template_reviews;
CREATE POLICY "authenticated_read_reviews" ON public.template_reviews FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);