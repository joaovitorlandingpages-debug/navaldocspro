
-- Promove templates naval-core a globais
UPDATE public.document_templates
   SET is_global = true, updated_at = now()
 WHERE code IN ('PROC_PART_NAVAL','BSADE_NAVAL','DECL_RES_NAVAL')
   AND is_global = false;

-- Reinsere itens faltantes (idempotente): usa NOT EXISTS por (package_id, document_template_id, sort_order)
WITH pkgs AS (
  SELECT id, process_type FROM public.document_process_packages
   WHERE process_type IN ('inscricao_embarcacao','renovacao_tie','transferencia_propriedade',
                          'alteracao_caracteristicas','segunda_via_tie','cancelamento_inscricao',
                          'regularizacao_documental','bsade_avulso')
),
data AS (
  SELECT 'inscricao_embarcacao'::text pt, 'PROC_PART_NAVAL'::text code, 'procuracao'::text role, 'Procuração ao Despachante'::text label, true req, true sig, false ocr, 20 ord, NULL::text rule
  UNION ALL SELECT 'inscricao_embarcacao','DECL_RES_NAVAL','declaracao','Declaração de Residência (subst. comprovante)',false,true,false,40,'{"missing":"customer.address_proof_url"}'
  UNION ALL SELECT 'inscricao_embarcacao','BSADE_NAVAL','formulario','BSADE — Boletim de Segurança',true,true,false,50,NULL
  UNION ALL SELECT 'renovacao_tie','PROC_PART_NAVAL','procuracao','Procuração ao Despachante',true,true,false,20,NULL
  UNION ALL SELECT 'transferencia_propriedade','PROC_PART_NAVAL','procuracao','Procuração do comprador ao despachante',true,true,false,40,NULL
  UNION ALL SELECT 'alteracao_caracteristicas','PROC_PART_NAVAL','procuracao','Procuração ao Despachante',true,true,false,20,NULL
  UNION ALL SELECT 'segunda_via_tie','PROC_PART_NAVAL','procuracao','Procuração ao Despachante',true,true,false,20,NULL
  UNION ALL SELECT 'cancelamento_inscricao','PROC_PART_NAVAL','procuracao','Procuração ao Despachante',true,true,false,20,NULL
  UNION ALL SELECT 'regularizacao_documental','PROC_PART_NAVAL','procuracao','Procuração ao Despachante',true,true,false,20,NULL
  UNION ALL SELECT 'bsade_avulso','BSADE_NAVAL','formulario','BSADE — Boletim de Segurança',true,true,false,10,NULL
  UNION ALL SELECT 'bsade_avulso','PROC_PART_NAVAL','procuracao','Procuração ao Despachante',false,true,false,20,NULL
)
INSERT INTO public.document_process_package_items
  (package_id, document_template_id, document_role, item_label, is_required, requires_signature, requires_ocr, sort_order, conditional_rule)
SELECT p.id, dt.id, d.role, d.label, d.req, d.sig, d.ocr, d.ord, d.rule::jsonb
  FROM data d
  JOIN pkgs p ON p.process_type = d.pt
  JOIN public.document_templates dt ON dt.code = d.code AND dt.is_global = true
 WHERE NOT EXISTS (
   SELECT 1 FROM public.document_process_package_items i
    WHERE i.package_id = p.id AND i.document_template_id = dt.id AND i.sort_order = d.ord
 );
