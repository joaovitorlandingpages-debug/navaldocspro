-- Uploaded Files table
CREATE TABLE public.uploaded_files (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    vessel_id UUID REFERENCES public.vessels(id) ON DELETE CASCADE,
    process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES auth.users(id),
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    file_url TEXT NOT NULL,
    category TEXT NOT NULL, -- cnh, rg, cpf, address, contract, etc.
    status TEXT NOT NULL DEFAULT 'uploaded', -- uploaded, analyzing, validated, needs_correction, expired
    extracted_data JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for uploaded_files
CREATE POLICY "Users can view files from their company"
ON public.uploaded_files FOR SELECT
USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can manage files from their company"
ON public.uploaded_files FOR ALL
USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
));

-- Ensure process-attachments bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('process-attachments', 'process-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for customer-documents
CREATE POLICY "Customer documents are accessible by company members"
ON storage.objects FOR SELECT
USING (bucket_id = 'customer-documents' AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can upload customer documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'customer-documents' AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
));

-- Storage Policies for vessel-documents
CREATE POLICY "Vessel documents are accessible by company members"
ON storage.objects FOR SELECT
USING (bucket_id = 'vessel-documents' AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can upload vessel documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'vessel-documents' AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
));

-- Storage Policies for process-attachments
CREATE POLICY "Process attachments are accessible by company members"
ON storage.objects FOR SELECT
USING (bucket_id = 'process-attachments' AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can upload process attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'process-attachments' AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_uploaded_files_updated_at
    BEFORE UPDATE ON public.uploaded_files
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update storage path for public access if needed, though we prefer public URLs through getPublicUrl
-- But policies must allow SELECT
