-- Create ocr_jobs table
CREATE TABLE public.ocr_jobs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    uploaded_file_id UUID REFERENCES public.uploaded_files(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'reviewed')),
    extracted_data JSONB DEFAULT '{}',
    confidence_score NUMERIC,
    processing_time INTEGER, -- in milliseconds
    reviewed_by UUID REFERENCES auth.users(id),
    document_type TEXT, -- e.g., 'CNH', 'RG', 'CPF', 'CRLV'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ocr_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own company's OCR jobs"
ON public.ocr_jobs FOR SELECT
USING (
    company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can insert OCR jobs for their company"
ON public.ocr_jobs FOR INSERT
WITH CHECK (
    company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can update their company's OCR jobs"
ON public.ocr_jobs FOR UPDATE
USING (
    company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
);

-- Trigger for updated_at
CREATE TRIGGER update_ocr_jobs_updated_at
BEFORE UPDATE ON public.ocr_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage Bucket for OCR documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ocr-documents', 'ocr-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Users can upload OCR documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ocr-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view their own OCR documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'ocr-documents' AND auth.role() = 'authenticated');
