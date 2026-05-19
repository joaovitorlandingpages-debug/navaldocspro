-- Adicionar categorias oficiais
INSERT INTO public.document_categories (id, name, description, icon, color)
VALUES 
  (gen_random_uuid(), 'Propriedade e Registro', 'Documentos de posse e registro de embarcações', 'Anchor', '#3b82f6'),
  (gen_random_uuid(), 'Certificados de Segurança', 'Certificações de segurança e vistorias', 'ShieldCheck', '#10b981'),
  (gen_random_uuid(), 'Tripulação e Habilitação', 'Documentos de pessoal e qualificações', 'Users', '#f59e0b'),
  (gen_random_uuid(), 'Operações Marítimas', 'Registros diários e alvarás', 'Ship', '#8b5cf6'),
  (gen_random_uuid(), 'Financeiro e GRU', 'Documentos fiscais e taxas da Marinha', 'CreditCard', '#ef4444'),
  (gen_random_uuid(), 'Comércio Exterior e Aduana', 'Documentos de importação e exportação', 'Globe', '#06b6d4'),
  (gen_random_uuid(), 'Saúde e Controle Sanitário', 'Certificados médicos e vigilância sanitária', 'HeartPulse', '#ec4899'),
  (gen_random_uuid(), 'Engenharia Naval', 'Projetos, memoriais e vistorias técnicas', 'Wrench', '#6366f1'),
  (gen_random_uuid(), 'Contratos e Seguros', 'Seguros obrigatórios e contratos comerciais', 'FileText', '#64748b'),
  (gen_random_uuid(), 'Processos Administrativos', 'Requerimentos e procurações', 'Briefcase', '#475569')
ON CONFLICT (name) DO UPDATE SET 
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color;

-- Criar tabela de campos de template se não existir
CREATE TABLE IF NOT EXISTS public.document_template_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.document_templates(id) ON DELETE CASCADE,
    field_key TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT NOT NULL,
    is_required BOOLEAN DEFAULT false,
    mapping_path TEXT,
    validation_rules JSONB,
    position_config JSONB,
    options JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de regras de processo se não existir
CREATE TABLE IF NOT EXISTS public.document_process_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_type_id UUID REFERENCES public.process_types(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.document_templates(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL,
    trigger_condition JSONB,
    ocr_required BOOLEAN DEFAULT false,
    signature_required BOOLEAN DEFAULT false,
    expiry_monitoring BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de checklists se não existir
CREATE TABLE IF NOT EXISTS public.document_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    is_mandatory BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'pending',
    document_id UUID REFERENCES public.documents(id),
    notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de versões de documentos se não existir
CREATE TABLE IF NOT EXISTS public.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    change_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS se não habilitado
DO $$
BEGIN
    ALTER TABLE public.document_template_fields ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.document_process_rules ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.document_checklists ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Inserir alguns templates iniciais oficiais vinculados às categorias
DO $$
DECLARE
    cat_prop_id UUID;
    cat_fin_id UUID;
    cat_pes_id UUID;
    cat_eng_id UUID;
    cat_cert_id UUID;
    cat_ops_id UUID;
BEGIN
    SELECT id INTO cat_prop_id FROM public.document_categories WHERE name = 'Propriedade e Registro';
    SELECT id INTO cat_fin_id FROM public.document_categories WHERE name = 'Financeiro e GRU';
    SELECT id INTO cat_pes_id FROM public.document_categories WHERE name = 'Tripulação e Habilitação';
    SELECT id INTO cat_eng_id FROM public.document_categories WHERE name = 'Engenharia Naval';
    SELECT id INTO cat_cert_id FROM public.document_categories WHERE name = 'Certificados de Segurança';
    SELECT id INTO cat_ops_id FROM public.document_categories WHERE name = 'Operações Marítimas';

    -- PROPRIEDADE
    INSERT INTO public.document_templates (name, description, category_id, category, ocr_enabled, is_active)
    VALUES 
        ('TIE/TIEM', 'Título de Inscrição de Embarcação', cat_prop_id, 'Propriedade e Registro', true, true),
        ('PRPM', 'Provisório de Registro de Propriedade Marítima', cat_prop_id, 'Propriedade e Registro', true, true),
        ('Requerimento DPC-2211', 'Requerimento Geral para DPC', cat_prop_id, 'Propriedade e Registro', false, true)
    ON CONFLICT (name) DO UPDATE SET 
        category_id = EXCLUDED.category_id,
        category = EXCLUDED.category,
        ocr_enabled = EXCLUDED.ocr_enabled;

    -- FINANCEIRO
    INSERT INTO public.document_templates (name, description, category_id, category, ocr_enabled, is_active)
    VALUES 
        ('GRU', 'Guia de Recolhimento da União', cat_fin_id, 'Financeiro e GRU', true, true),
        ('Nota Fiscal', 'Nota Fiscal de Serviço ou Produto', cat_fin_id, 'Financeiro e GRU', true, true)
    ON CONFLICT (name) DO UPDATE SET 
        category_id = EXCLUDED.category_id,
        category = EXCLUDED.category;

    -- PESSOAL
    INSERT INTO public.document_templates (name, description, category_id, category, ocr_enabled, is_active)
    VALUES 
        ('CIR', 'Caderneta de Inscrição e Registro', cat_pes_id, 'Tripulação e Habilitação', true, true),
        ('Rol de Equipagem', 'Lista oficial de tripulantes', cat_pes_id, 'Tripulação e Habilitação', true, true)
    ON CONFLICT (name) DO UPDATE SET 
        category_id = EXCLUDED.category_id,
        category = EXCLUDED.category;

    -- ENGENHARIA
    INSERT INTO public.document_templates (name, description, category_id, category, ocr_enabled, is_active)
    VALUES 
        ('Memorial Descritivo', 'Memorial técnico da embarcação', cat_eng_id, 'Engenharia Naval', false, true)
    ON CONFLICT (name) DO UPDATE SET 
        category_id = EXCLUDED.category_id,
        category = EXCLUDED.category;

    -- CERTIFICADOS
    INSERT INTO public.document_templates (name, description, category_id, category, ocr_enabled, is_active)
    VALUES 
        ('CSN', 'Certificado de Segurança da Navegação', cat_cert_id, 'Certificados de Segurança', true, true),
        ('DPEM', 'Seguro de Danos Pessoais Causados por Embarcações', cat_cert_id, 'Certificados de Segurança', true, true)
    ON CONFLICT (name) DO UPDATE SET 
        category_id = EXCLUDED.category_id,
        category = EXCLUDED.category;

    -- OPERAÇÕES
    INSERT INTO public.document_templates (name, description, category_id, category, ocr_enabled, is_active)
    VALUES 
        ('Alvará de Saída', 'Autorização para saída do porto', cat_ops_id, 'Operações Marítimas', true, true)
    ON CONFLICT (name) DO UPDATE SET 
        category_id = EXCLUDED.category_id,
        category = EXCLUDED.category;
END $$;
