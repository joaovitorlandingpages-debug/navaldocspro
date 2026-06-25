
CREATE POLICY "dossiers_select_own_company" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'process-dossiers'
    AND (storage.foldername(name))[1] = public.current_user_company_id()::text
  );

CREATE POLICY "dossiers_insert_own_company" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'process-dossiers'
    AND (storage.foldername(name))[1] = public.current_user_company_id()::text
  );

CREATE POLICY "dossiers_update_own_company" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'process-dossiers'
    AND (storage.foldername(name))[1] = public.current_user_company_id()::text
  );

CREATE POLICY "dossiers_delete_own_company" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'process-dossiers'
    AND (storage.foldername(name))[1] = public.current_user_company_id()::text
  );
