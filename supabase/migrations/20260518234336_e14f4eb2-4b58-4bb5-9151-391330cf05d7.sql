-- Add expiry and issue dates to document tables
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS issue_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.uploaded_files ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.uploaded_files ADD COLUMN IF NOT EXISTS issue_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.generated_documents ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.generated_documents ADD COLUMN IF NOT EXISTS issue_date TIMESTAMP WITH TIME ZONE;

-- Create vessel_engines table
CREATE TABLE IF NOT EXISTS public.vessel_engines (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vessel_id UUID NOT NULL REFERENCES public.vessels(id) ON DELETE CASCADE,
    engine_type TEXT, -- 'Main', 'Auxiliary', 'Emergency'
    brand TEXT,
    model TEXT,
    serial_number TEXT,
    power TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create crew_members table
CREATE TABLE IF NOT EXISTS public.crew_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vessel_id UUID REFERENCES public.vessels(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,
    cir_number TEXT,
    expiry_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vessel_engines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;

-- Policies for vessel_engines
CREATE POLICY "Users can view engines of their company vessels" 
ON public.vessel_engines FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.vessels v WHERE v.id = vessel_id AND v.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Users can insert engines for their company vessels" 
ON public.vessel_engines FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.vessels v WHERE v.id = vessel_id AND v.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Users can update engines for their company vessels" 
ON public.vessel_engines FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.vessels v WHERE v.id = vessel_id AND v.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())));

-- Policies for crew_members
CREATE POLICY "Users can view crew of their company" 
ON public.crew_members FOR SELECT 
USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert crew for their company" 
ON public.crew_members FOR INSERT 
WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update crew for their company" 
ON public.crew_members FOR UPDATE 
USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Insert new categories
INSERT INTO public.document_categories (name, icon, color, description)
VALUES 
('Certificados de Segurança', 'Shield', '#EF4444', 'Certificados técnicos de segurança e navegabilidade.'),
('Tripulação e Habilitação', 'Users', '#3B82F6', 'Documentação de tripulantes e CIRs.'),
('Operações Marítimas', 'Anchor', '#10B981', 'Alvarás, diários e registros de operação.'),
('Comércio Exterior e Aduana', 'Globe', '#8B5CF6', 'Documentos aduaneiros e de carga.'),
('Saúde e Controle Sanitário', 'HeartPulse', '#EC4899', 'Certificados sanitários e saúde a bordo.'),
('Contratos e Seguros', 'FileCheck', '#F59E0B', 'Apólices de seguro e contratos de afretamento.'),
('Engenharia Naval Avançada', 'Cpu', '#6366F1', 'Memoriais, cálculos e projetos técnicos.'),
('Controle Operacional', 'Zap', '#06B6D4', 'Licenças rádio, ANATEL e MMSI.')
ON CONFLICT (name) DO NOTHING;

-- Triggers for updated_at
CREATE TRIGGER update_vessel_engines_updated_at BEFORE UPDATE ON public.vessel_engines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crew_members_updated_at BEFORE UPDATE ON public.crew_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
