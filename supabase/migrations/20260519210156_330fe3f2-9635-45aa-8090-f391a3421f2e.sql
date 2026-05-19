-- Tabela de Pacotes Documentais
CREATE TABLE IF NOT EXISTS public.document_process_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    process_type TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Itens do Pacote (Vínculo com Templates)
CREATE TABLE IF NOT EXISTS public.document_process_package_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES public.document_process_packages(id) ON DELETE CASCADE,
    document_template_id UUID REFERENCES public.document_templates(id) ON DELETE CASCADE,
    document_role TEXT NOT NULL, -- 'entrada', 'gerado', 'anexo'
    is_required BOOLEAN DEFAULT true,
    requires_ocr BOOLEAN DEFAULT false,
    requires_signature BOOLEAN DEFAULT false,
    has_expiration BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    validation_rules JSONB DEFAULT '[]'::jsonb,
    conditional_rule JSONB, -- Ex: {"field": "owner_type", "operator": "==", "value": "PJ"}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.document_process_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_process_package_items ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Read access for all authenticated users" ON public.document_process_packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Read access for all authenticated users" ON public.document_process_package_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin full access" ON public.document_process_packages FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_master'));
CREATE POLICY "Admin full access" ON public.document_process_package_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_master'));

-- Inserir Pacotes Iniciais
DO $$
DECLARE
    pkg_registro_id UUID;
    pkg_transf_id UUID;
    pkg_renov_id UUID;
    pkg_motor_id UUID;
    pkg_vistoria_id UUID;
    pkg_radio_id UUID;
    
    tmp_rg_id UUID;
    tmp_cpf_id UUID;
    tmp_res_id UUID;
    tmp_nf_id UUID;
    tmp_gru_id UUID;
    tmp_tie_id UUID;
    tmp_req_id UUID;
    tmp_proc_id UUID;
    tmp_mem_id UUID;
BEGIN
    -- Obter IDs de templates existentes ou criar placeholder
    SELECT id INTO tmp_rg_id FROM public.document_templates WHERE name = 'RG/CNH' LIMIT 1;
    IF tmp_rg_id IS NULL THEN INSERT INTO public.document_templates (name, category, ocr_enabled) VALUES ('RG/CNH', 'Pessoal', true) RETURNING id INTO tmp_rg_id; END IF;

    SELECT id INTO tmp_cpf_id FROM public.document_templates WHERE name = 'CPF/CNPJ' LIMIT 1;
    IF tmp_cpf_id IS NULL THEN INSERT INTO public.document_templates (name, category, ocr_enabled) VALUES ('CPF/CNPJ', 'Pessoal', true) RETURNING id INTO tmp_cpf_id; END IF;

    SELECT id INTO tmp_nf_id FROM public.document_templates WHERE name = 'Nota Fiscal' LIMIT 1;
    SELECT id INTO tmp_gru_id FROM public.document_templates WHERE name = 'GRU' LIMIT 1;
    SELECT id INTO tmp_tie_id FROM public.document_templates WHERE name = 'TIE/TIEM' LIMIT 1;
    SELECT id INTO tmp_req_id FROM public.document_templates WHERE name = 'Requerimento DPC-2211' LIMIT 1;
    SELECT id INTO tmp_mem_id FROM public.document_templates WHERE name = 'Memorial Descritivo' LIMIT 1;

    -- 1. Registro Inicial
    INSERT INTO public.document_process_packages (name, process_type, description)
    VALUES ('Registro Inicial de Embarcação', 'registro_inicial', 'Pacote completo para primeiro registro na Marinha')
    RETURNING id INTO pkg_registro_id;

    INSERT INTO public.document_process_package_items (package_id, document_template_id, document_role, is_required, requires_ocr)
    VALUES 
        (pkg_registro_id, tmp_rg_id, 'entrada', true, true),
        (pkg_registro_id, tmp_nf_id, 'entrada', true, true),
        (pkg_registro_id, tmp_gru_id, 'entrada', true, true),
        (pkg_registro_id, tmp_req_id, 'gerado', true, false);

    -- 2. Transferência de Propriedade
    INSERT INTO public.document_process_packages (name, process_type, description)
    VALUES ('Transferência de Propriedade', 'transferencia', 'Mudança de proprietário de embarcação já inscrita')
    RETURNING id INTO pkg_transf_id;

    INSERT INTO public.document_process_package_items (package_id, document_template_id, document_role, is_required, requires_ocr)
    VALUES 
        (pkg_transf_id, tmp_tie_id, 'entrada', true, true),
        (pkg_transf_id, tmp_rg_id, 'entrada', true, true),
        (pkg_transf_id, tmp_gru_id, 'entrada', true, true),
        (pkg_transf_id, tmp_req_id, 'gerado', true, false);

    -- 3. Renovação TIE/TIEM
    INSERT INTO public.document_process_packages (name, process_type, description)
    VALUES ('Renovação de TIE/TIEM', 'renovacao_tie', 'Renovação decenal de validade do título')
    RETURNING id INTO pkg_renov_id;

    -- 4. Alteração de Motor
    INSERT INTO public.document_process_packages (name, process_type, description)
    VALUES ('Alteração de Motor', 'alteracao_motor', 'Inclusão ou substituição de motorização')
    RETURNING id INTO pkg_motor_id;

    -- 5. Vistoria Técnica
    INSERT INTO public.document_process_packages (name, process_type, description)
    VALUES ('Vistoria Técnica', 'vistoria', 'Vistoria para emissão de CSN ou arqueação')
    RETURNING id INTO pkg_vistoria_id;

    INSERT INTO public.document_process_package_items (package_id, document_template_id, document_role, is_required)
    VALUES (pkg_vistoria_id, tmp_mem_id, 'gerado', true);

END $$;
