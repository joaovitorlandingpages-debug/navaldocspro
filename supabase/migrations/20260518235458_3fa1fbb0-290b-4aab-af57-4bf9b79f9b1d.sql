-- Create process_types table
CREATE TABLE public.process_types (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    estimated_days INTEGER DEFAULT 15,
    category TEXT, -- e.g., 'Registro', 'Tripulação', 'Operações'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.process_types ENABLE ROW LEVEL SECURITY;

-- Policies for process_types
CREATE POLICY "Process types are viewable by everyone" 
ON public.process_types FOR SELECT USING (true);

-- Create process_document_packages (replacing/enhancing process_type_requirements)
CREATE TABLE public.process_document_packages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    process_type_id UUID REFERENCES public.process_types(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.document_templates(id) ON DELETE CASCADE,
    is_mandatory BOOLEAN DEFAULT true,
    document_role TEXT DEFAULT 'input', -- input, output, signature, etc.
    order_index INTEGER DEFAULT 0,
    conditional_rule JSONB, -- Logic for specific requirements
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.process_document_packages ENABLE ROW LEVEL SECURITY;

-- Policies for process_document_packages
CREATE POLICY "Process document packages are viewable by everyone" 
ON public.process_document_packages FOR SELECT USING (true);

-- Add process_type_id to processes
ALTER TABLE public.processes ADD COLUMN process_type_id UUID REFERENCES public.process_types(id);

-- Insert Official Process Types
INSERT INTO public.process_types (name, description, icon, estimated_days, category) VALUES
('Registro Inicial de Embarcação', 'Inscrição de embarcação nova nos registros da Marinha', 'ship', 20, 'Registro'),
('Transferência de Propriedade', 'Alteração de proprietário de embarcação já inscrita', 'repeat', 15, 'Registro'),
('Renovação TIE/TIEM', 'Renovação da validade do documento da embarcação', 'refresh-cw', 10, 'Regularização'),
('Segunda Via TIE/TIEM', 'Emissão de novo documento por perda ou extravio', 'copy', 5, 'Regularização'),
('Alteração de Dados da Embarcação', 'Mudança de nome, cor ou outras características', 'edit-3', 15, 'Engenharia'),
('Alteração de Motor', 'Atualização do motor principal ou auxiliar', 'zap', 15, 'Engenharia'),
('Vistoria Técnica', 'Inspeção para emissão de certificados de segurança', 'search', 7, 'Segurança'),
('Regularização Documental', 'Correção de pendências administrativas', 'check-square', 20, 'Administrativo'),
('Licença de Estação Anatel', 'Regularização de equipamentos de rádio', 'radio', 30, 'Telecomunicações'),
('Cadastro de Tripulante', 'Inscrição de novos marítimos ou amadores', 'user-plus', 10, 'Tripulação'),
('Rol de Equipagem', 'Atualização da lista de tripulantes em serviço', 'users', 2, 'Tripulação'),
('Alvará de Saída', 'Autorização para saída do porto', 'log-out', 1, 'Operações'),
('Memorial Técnico', 'Elaboração de documento técnico de engenharia', 'file-text', 15, 'Engenharia'),
('Termo de Responsabilidade Estrutural', 'Declaração de segurança da estrutura', 'shield', 10, 'Engenharia'),
('Renovação de Certificados', 'Atualização de CSN, CTS e outros', 'award', 15, 'Segurança'),
('Processo Aduaneiro', 'Trâmites junto à Receita Federal', 'package', 30, 'Aduaneiro'),
('Processo Sanitário', 'Vigilância sanitária e Anvisa', 'activity', 15, 'Saúde');

-- Insert initial document packages (Logic for some core processes)
-- We'll use the IDs found in document_templates earlier

-- Registro Inicial
WITH pt AS (SELECT id FROM public.process_types WHERE name = 'Registro Inicial de Embarcação')
INSERT INTO public.process_document_packages (process_type_id, template_id, is_mandatory, document_role, order_index)
SELECT pt.id, dt.id, true, 'input', 1 FROM pt, public.document_templates dt WHERE dt.name = 'CNH / RG'
UNION ALL
SELECT pt.id, dt.id, true, 'input', 2 FROM pt, public.document_templates dt WHERE dt.name = 'Requerimento DPC-2211'
UNION ALL
SELECT pt.id, dt.id, true, 'input', 3 FROM pt, public.document_templates dt WHERE dt.name = 'BCE (Boletim de Cadastro de Embarcação)'
UNION ALL
SELECT pt.id, dt.id, true, 'input', 4 FROM pt, public.document_templates dt WHERE dt.name = 'Memorial Descritivo Técnico'
UNION ALL
SELECT pt.id, dt.id, true, 'input', 5 FROM pt, public.document_templates dt WHERE dt.name = 'GRU (Guia de Recolhimento da União)';

-- Transferência de Propriedade
WITH pt AS (SELECT id FROM public.process_types WHERE name = 'Transferência de Propriedade')
INSERT INTO public.process_document_packages (process_type_id, template_id, is_mandatory, document_role, order_index)
SELECT pt.id, dt.id, true, 'input', 1 FROM pt, public.document_templates dt WHERE dt.name = 'CNH / RG'
UNION ALL
SELECT pt.id, dt.id, true, 'input', 2 FROM pt, public.document_templates dt WHERE dt.name = 'TIE / TIEM'
UNION ALL
SELECT pt.id, dt.id, true, 'input', 3 FROM pt, public.document_templates dt WHERE dt.name = 'Requerimento DPC-2211'
UNION ALL
SELECT pt.id, dt.id, true, 'input', 4 FROM pt, public.document_templates dt WHERE dt.name = 'GRU (Guia de Recolhimento da União)';

-- Renovação TIE
WITH pt AS (SELECT id FROM public.process_types WHERE name = 'Renovação TIE/TIEM')
INSERT INTO public.process_document_packages (process_type_id, template_id, is_mandatory, document_role, order_index)
SELECT pt.id, dt.id, true, 'input', 1 FROM pt, public.document_templates dt WHERE dt.name = 'CNH / RG'
UNION ALL
SELECT pt.id, dt.id, true, 'input', 2 FROM pt, public.document_templates dt WHERE dt.name = 'TIE / TIEM'
UNION ALL
SELECT pt.id, dt.id, true, 'input', 3 FROM pt, public.document_templates dt WHERE dt.name = 'Requerimento DPC-2211'
UNION ALL
SELECT pt.id, dt.id, true, 'input', 4 FROM pt, public.document_templates dt WHERE dt.name = 'GRU (Guia de Recolhimento da União)';

-- Trigger to update updated_at
CREATE TRIGGER update_process_types_updated_at
BEFORE UPDATE ON public.process_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
