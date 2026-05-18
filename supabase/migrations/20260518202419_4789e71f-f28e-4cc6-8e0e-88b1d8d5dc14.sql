-- Criar tabela de uso de OCR
CREATE TABLE IF NOT EXISTS public.ocr_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    total_jobs INTEGER DEFAULT 0,
    successful_jobs INTEGER DEFAULT 0,
    failed_jobs INTEGER DEFAULT 0,
    estimated_cost NUMERIC(10, 4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(company_id, month, year)
);

-- Habilitar RLS
ALTER TABLE public.ocr_usage ENABLE ROW LEVEL SECURITY;

-- Políticas para ocr_usage
CREATE POLICY "Empresas podem ver seu próprio uso de OCR" 
ON public.ocr_usage FOR SELECT 
USING (company_id IN (SELECT id FROM public.companies WHERE id = company_id));

CREATE POLICY "Admins podem ver todo o uso de OCR" 
ON public.ocr_usage FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_master'));

-- Adicionar coluna de provedor em ocr_jobs
ALTER TABLE public.ocr_jobs ADD COLUMN IF NOT EXISTS provider_used TEXT;
ALTER TABLE public.ocr_jobs ADD COLUMN IF NOT EXISTS confidence_by_field JSONB;
ALTER TABLE public.ocr_jobs ADD COLUMN IF NOT EXISTS error_message TEXT;
