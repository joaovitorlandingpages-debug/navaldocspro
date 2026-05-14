-- Fix Function Search Path Mutable and Public Execution issues
-- 1. For is_admin_master function
ALTER FUNCTION public.is_admin_master() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.is_admin_master() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_master() TO authenticated;

-- 2. For handle_new_user function
ALTER FUNCTION public.handle_new_user() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
-- This function is called by the trigger (running as service role/superuser typically), 
-- but we don't want direct public/authenticated access.
-- GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role; -- Not usually needed as owner/superuser can execute.

-- Add Storage Policies (assuming buckets will be created)
-- Note: These policies allow authenticated users to access their company-prefixed files
-- or if they are admin_master they can access everything.

-- We assume buckets: 'customer-documents', 'vessel-documents', 'generated-documents', 'company-logos'
-- Creating them first
INSERT INTO storage.buckets (id, name, public) VALUES ('customer-documents', 'customer-documents', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('vessel-documents', 'vessel-documents', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-documents', 'generated-documents', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true) ON CONFLICT DO NOTHING;

-- Storage Policies for 'customer-documents'
CREATE POLICY "authenticated users can view documents" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'customer-documents' AND (
    public.is_admin_master() OR 
    (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "authenticated users can upload documents" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'customer-documents' AND (
    public.is_admin_master() OR 
    (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid())
  )
);

-- (Repeat similar policies for other buckets as needed)
