-- 1. Categorias Documentais Oficiais
CREATE TABLE IF NOT EXISTS public.document_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Categorias visíveis por todos autenticados') THEN
        CREATE POLICY "Categorias visíveis por todos autenticados" ON public.document_categories
            FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Inserir Categorias CORE
INSERT INTO public.document_categories (name, description, icon, color) VALUES
('Propriedade e Registro', 'Documentos de posse e registro de embarcações junto à Marinha.', 'Ship', 'blue'),
('Financeiro e GRU', 'Comprovantes de pagamento, taxas e guias de recolhimento.', 'DollarSign', 'green'),
('Identificação Pessoal', 'Documentos de identidade de proprietários e prepostos.', 'User', 'purple'),
('Engenharia e Vistoria', 'Laudos, memoriais, ARTs e termos técnicos.', 'Settings', 'orange'),
('Procurações e Declarações', 'Instrumentos de representação legal e termos de responsabilidade.', 'FileSignature', 'red'),
('Processos Administrativos', 'Requerimentos e formulários internos da DPC.', 'ClipboardList', 'slate')
ON CONFLICT (name) DO NOTHING;

-- 2. Atualizar document_templates
ALTER TABLE public.document_templates ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.document_categories(id);
ALTER TABLE public.document_templates ADD COLUMN IF NOT EXISTS document_type_io TEXT DEFAULT 'in' CHECK (document_type_io IN ('in', 'out'));
ALTER TABLE public.document_templates ADD COLUMN IF NOT EXISTS ocr_enabled BOOLEAN DEFAULT false;

-- Remover NOT NULL da coluna 'category' antiga se existir, para permitir migração suave
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_templates' AND column_name='category' AND is_nullable='NO') THEN
        ALTER TABLE public.document_templates ALTER COLUMN category DROP NOT NULL;
    END IF;
END $$;

-- Adicionar restrição de unicidade no nome se não existir para o ON CONFLICT funcionar
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_templates_name_unique') THEN
        ALTER TABLE public.document_templates ADD CONSTRAINT document_templates_name_unique UNIQUE (name);
    END IF;
END $$;

-- 3. Inserir Documentos CORE Iniciais
-- Entrada (IN / OCR)
INSERT INTO public.document_templates (name, category, category_id, document_type_io, ocr_enabled, is_active, fields_config) 
SELECT 
    'TIE / TIEM', 
    'Propriedade e Registro',
    (SELECT id FROM public.document_categories WHERE name = 'Propriedade e Registro'), 
    'in', 
    true, 
    true,
    '{"mapping": {"vessel.name": "nome_embarcacao", "vessel.registration_number": "inscricao", "customer.name": "proprietario"}}'::jsonb
ON CONFLICT (name) DO UPDATE SET 
    category = EXCLUDED.category,
    category_id = EXCLUDED.category_id,
    document_type_io = EXCLUDED.document_type_io,
    ocr_enabled = EXCLUDED.ocr_enabled,
    fields_config = EXCLUDED.fields_config;

INSERT INTO public.document_templates (name, category, category_id, document_type_io, ocr_enabled, is_active, fields_config) 
SELECT 
    'GRU (Guia de Recolhimento da União)', 
    'Financeiro e GRU',
    (SELECT id FROM public.document_categories WHERE name = 'Financeiro e GRU'), 
    'in', 
    true, 
    true,
    '{"mapping": {"finance.amount": "valor", "finance.reference": "referencia"}}'::jsonb
ON CONFLICT (name) DO UPDATE SET 
    category = EXCLUDED.category,
    category_id = EXCLUDED.category_id,
    document_type_io = EXCLUDED.document_type_io,
    ocr_enabled = EXCLUDED.ocr_enabled,
    fields_config = EXCLUDED.fields_config;

INSERT INTO public.document_templates (name, category, category_id, document_type_io, ocr_enabled, is_active, fields_config) 
SELECT 
    'CNH / RG', 
    'Identificação Pessoal',
    (SELECT id FROM public.document_categories WHERE name = 'Identificação Pessoal'), 
    'in', 
    true, 
    true,
    '{"mapping": {"customer.name": "nome", "customer.cpf": "cpf", "customer.rg": "rg"}}'::jsonb
ON CONFLICT (name) DO UPDATE SET 
    category = EXCLUDED.category,
    category_id = EXCLUDED.category_id,
    document_type_io = EXCLUDED.document_type_io,
    ocr_enabled = EXCLUDED.ocr_enabled,
    fields_config = EXCLUDED.fields_config;

-- Saída (OUT / Gerados)
INSERT INTO public.document_templates (name, category, category_id, document_type_io, ocr_enabled, is_active, fields_config) 
SELECT 
    'Requerimento DPC-2211', 
    'Processos Administrativos',
    (SELECT id FROM public.document_categories WHERE name = 'Processos Administrativos'), 
    'out', 
    false, 
    true,
    '{"required_fields": ["customer.name", "customer.cpf", "vessel.name"]}'::jsonb
ON CONFLICT (name) DO UPDATE SET 
    category = EXCLUDED.category,
    category_id = EXCLUDED.category_id,
    document_type_io = EXCLUDED.document_type_io,
    ocr_enabled = EXCLUDED.ocr_enabled,
    fields_config = EXCLUDED.fields_config;

INSERT INTO public.document_templates (name, category, category_id, document_type_io, ocr_enabled, is_active, fields_config) 
SELECT 
    'BCE (Boletim de Cadastro de Embarcação)', 
    'Propriedade e Registro',
    (SELECT id FROM public.document_categories WHERE name = 'Propriedade e Registro'), 
    'out', 
    false, 
    true,
    '{"required_fields": ["vessel.name", "vessel.type", "vessel.engine"]}'::jsonb
ON CONFLICT (name) DO UPDATE SET 
    category = EXCLUDED.category,
    category_id = EXCLUDED.category_id,
    document_type_io = EXCLUDED.document_type_io,
    ocr_enabled = EXCLUDED.ocr_enabled,
    fields_config = EXCLUDED.fields_config;

-- 4. Tabela de Sugestões de Checklist por Tipo de Processo
CREATE TABLE IF NOT EXISTS public.process_type_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_type TEXT NOT NULL,
    template_id UUID REFERENCES public.document_templates(id),
    is_mandatory BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.process_type_requirements ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Requisitos visíveis por todos autenticados') THEN
        CREATE POLICY "Requisitos visíveis por todos autenticados" ON public.process_type_requirements
            FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Inserir sugestões iniciais
DELETE FROM public.process_type_requirements WHERE process_type = 'Inscrição Inicial';
INSERT INTO public.process_type_requirements (process_type, template_id, is_mandatory)
SELECT 'Inscrição Inicial', id, true FROM public.document_templates WHERE name IN ('TIE / TIEM', 'CNH / RG', 'Requerimento DPC-2211');

-- 5. Melhoria nos Logs de Auditoria
CREATE TABLE IF NOT EXISTS public.document_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    document_id UUID,
    action TEXT NOT NULL, -- 'upload', 'ocr', 'generation', 'download', 'edit'
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.document_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Empresas veem seus próprios logs') THEN
        CREATE POLICY "Empresas veem seus próprios logs" ON public.document_audit_logs
            FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
    END IF;
END $$;
