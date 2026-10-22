DROP POLICY IF EXISTS "Users can manage their company documents" ON storage.objects;
CREATE POLICY "Users can manage their company documents" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'generated-documents' AND (public.is_admin_master() OR (storage.foldername(name))[1] = public.current_user_company_id()::text))
WITH CHECK (bucket_id = 'generated-documents' AND (public.is_admin_master() OR (storage.foldername(name))[1] = public.current_user_company_id()::text));

DROP POLICY IF EXISTS "Admin master can manage all templates" ON storage.objects;
CREATE POLICY "Admin master can manage all templates" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'document-templates' AND public.is_admin_master())
WITH CHECK (bucket_id = 'document-templates' AND public.is_admin_master());

DROP POLICY IF EXISTS "authenticated users can view documents" ON storage.objects;
CREATE POLICY "authenticated users can view documents" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'customer-documents' AND (public.is_admin_master() OR (storage.foldername(name))[1] = public.current_user_company_id()::text));

DROP POLICY IF EXISTS "authenticated users can upload documents" ON storage.objects;
CREATE POLICY "authenticated users can upload documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'customer-documents' AND auth.uid() IS NOT NULL AND (public.is_admin_master() OR (storage.foldername(name))[1] = public.current_user_company_id()::text));