-- Create storage buckets for documents if they don't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('document-templates', 'document-templates', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('generated-documents', 'generated-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for document-templates
CREATE POLICY "Admin master can manage all templates" 
ON storage.objects FOR ALL 
USING (bucket_id = 'document-templates' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin_master');

CREATE POLICY "Users can read templates" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'document-templates' AND auth.role() = 'authenticated');

-- Storage policies for generated-documents
CREATE POLICY "Users can manage their company documents" 
ON storage.objects FOR ALL 
USING (
  bucket_id = 'generated-documents' 
  AND (
    (storage.foldername(name))[1] = (SELECT company_id::text FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin_master'
  )
);

-- Ensure tables are robust
ALTER TABLE public.document_templates 
ADD COLUMN IF NOT EXISTS file_type TEXT DEFAULT 'pdf', -- 'pdf' or 'docx'
ADD COLUMN IF NOT EXISTS version_notes TEXT;

-- Update RLS for tables
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

-- Policies for document_templates
DROP POLICY IF EXISTS "Templates visible to all authenticated" ON public.document_templates;
CREATE POLICY "Templates visible to all authenticated" 
ON public.document_templates FOR SELECT 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin master manages templates" ON public.document_templates;
CREATE POLICY "Admin master manages templates" 
ON public.document_templates FOR ALL 
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin_master');

-- Policies for generated_documents
DROP POLICY IF EXISTS "Users can view company documents" ON public.generated_documents;
CREATE POLICY "Users can view company documents" 
ON public.generated_documents FOR SELECT 
USING (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin_master'
);

DROP POLICY IF EXISTS "Users can insert company documents" ON public.generated_documents;
CREATE POLICY "Users can insert company documents" 
ON public.generated_documents FOR INSERT 
WITH CHECK (
  company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin_master'
);
