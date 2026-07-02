
INSERT INTO public.process_types (name, category, description)
VALUES
  ('Cancelamento de Inscrição', 'Administrativo', 'Baixa/cancelamento de inscrição da embarcação.'),
  ('BSADE Avulso', 'Técnico', 'Emissão isolada do BSADE.')
ON CONFLICT DO NOTHING;

-- Renomeia process_type dos pacotes para casar com process_types.name
UPDATE public.document_process_packages SET process_type = 'Inscrição de Embarcação'   WHERE process_type = 'inscricao_embarcacao';
UPDATE public.document_process_packages SET process_type = 'Renovação de TIE/TIEM'      WHERE process_type = 'renovacao_tie';
UPDATE public.document_process_packages SET process_type = 'Transferência de Propriedade' WHERE process_type = 'transferencia_propriedade';
UPDATE public.document_process_packages SET process_type = 'Alteração de Dados da Embarcação' WHERE process_type = 'alteracao_caracteristicas';
UPDATE public.document_process_packages SET process_type = 'Segunda Via TIE/TIEM'         WHERE process_type = 'segunda_via_tie';
UPDATE public.document_process_packages SET process_type = 'Cancelamento de Inscrição'  WHERE process_type = 'cancelamento_inscricao';
UPDATE public.document_process_packages SET process_type = 'Regularização Documental'   WHERE process_type = 'regularizacao_documental';
UPDATE public.document_process_packages SET process_type = 'BSADE Avulso'                 WHERE process_type = 'bsade_avulso';

-- Remove duplicidade legada: package "transferencia" antigo (8 itens) que virou órfão
DELETE FROM public.document_process_packages
 WHERE process_type IN ('transferencia','alteracao_motor')
   AND id NOT IN (SELECT DISTINCT package_id FROM public.document_process_package_items WHERE package_id IS NOT NULL);
