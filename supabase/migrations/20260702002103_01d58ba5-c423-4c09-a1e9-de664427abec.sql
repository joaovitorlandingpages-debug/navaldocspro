
-- =========================================================================
-- 1. Suporte a 2 partes (Transferência de Propriedade)
-- =========================================================================
ALTER TABLE public.processes
  ADD COLUMN IF NOT EXISTS secondary_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.processes.secondary_customer_id IS
  'Segunda parte do processo. Em Transferência de Propriedade: vendedor (customer_id = comprador).';

CREATE INDEX IF NOT EXISTS idx_processes_secondary_customer ON public.processes(secondary_customer_id);

-- =========================================================================
-- 2. Templates de ANEXO (document_type_io = 'in') — Biblioteca Nacional
--    Inseridos como is_global = true, sem company_id.
-- =========================================================================
INSERT INTO public.document_templates
  (name, code, category, document_type_io, is_global, is_active, source_origin, description, regional_scope)
VALUES
  ('Anexo — NF da Embarcação',          'ANX_NF_EMB',       'Anexo', 'in', true, true, 'fonte_oficial', 'Nota fiscal de aquisição da embarcação.',                'Nacional'),
  ('Anexo — NF do Motor',               'ANX_NF_MOTOR',     'Anexo', 'in', true, true, 'fonte_oficial', 'Nota fiscal de aquisição do motor (quando aplicável).',  'Nacional'),
  ('Anexo — Fotos da Embarcação',       'ANX_FOTOS_EMB',    'Anexo', 'in', true, true, 'fonte_oficial', 'Fotos obrigatórias: proa, popa, boreste, bombordo e placa/casco.', 'Nacional'),
  ('Anexo — GRU Paga',                  'ANX_GRU_PAGA',     'Anexo', 'in', true, true, 'fonte_oficial', 'Comprovante de pagamento da Guia de Recolhimento da União.', 'Nacional'),
  ('Anexo — ART (CREA)',                'ANX_ART',          'Anexo', 'in', true, true, 'fonte_oficial', 'Anotação de Responsabilidade Técnica emitida pelo CREA.','Nacional'),
  ('Anexo — Comprovante de Residência', 'ANX_COMP_RES',     'Anexo', 'in', true, true, 'fonte_oficial', 'Conta de luz/água/telefone dos últimos 90 dias.',        'Nacional'),
  ('Anexo — Contrato/NF de Transferência','ANX_CONTR_TRANSF','Anexo', 'in', true, true, 'fonte_oficial', 'Contrato de compra e venda ou NF de transferência entre as partes.', 'Nacional'),
  ('Anexo — Quitação de Débitos',       'ANX_QUIT_DEB',     'Anexo', 'in', true, true, 'fonte_oficial', 'Certidão de quitação de débitos (Marinha/Receita).',     'Nacional'),
  ('Anexo — TIE Original',              'ANX_TIE_ORIG',     'Anexo', 'in', true, true, 'fonte_oficial', 'Título de Inscrição de Embarcação original em vigor.',   'Nacional'),
  ('Anexo — Laudo de Vistoria',         'ANX_LAUDO_VIST',   'Anexo', 'in', true, true, 'fonte_oficial', 'Laudo de vistoria técnica assinado por profissional habilitado.', 'Nacional'),
  ('Anexo — Documento de Identidade (CNH/RG)', 'ANX_DOC_ID','Anexo', 'in', true, true, 'fonte_oficial', 'Cópia da CNH ou RG do proprietário.',                    'Nacional'),
  ('Anexo — Contrato Social / Cartão CNPJ','ANX_CNPJ',      'Anexo', 'in', true, true, 'fonte_oficial', 'Contrato social e cartão CNPJ da pessoa jurídica.',      'Nacional'),
  ('Anexo — Boletim de Ocorrência',     'ANX_BO',           'Anexo', 'in', true, true, 'fonte_oficial', 'BO de furto/roubo/perda do documento original.',         'Nacional'),
  ('Anexo — Termo de Cancelamento',     'ANX_TERMO_CANC',   'Anexo', 'in', true, true, 'fonte_oficial', 'Declaração assinada solicitando o cancelamento da inscrição.', 'Nacional')
ON CONFLICT (name) DO UPDATE
  SET code = EXCLUDED.code,
      is_global = true,
      is_active = true,
      updated_at = now();

-- =========================================================================
-- 3. Limpeza: manter apenas process_type canônicos (chaves lower_snake)
-- =========================================================================
-- Package duplicado com nome "Inscrição de Embarcação" (chave string longa): remover
DELETE FROM public.document_process_packages
 WHERE process_type = 'Inscrição de Embarcação';

-- =========================================================================
-- 4. Helpers locais (idempotentes) — via CTE por package
-- =========================================================================
-- Estratégia: para cada package, remover items existentes e reinserir do zero.
--             Assim garantimos consistência com o novo blueprint.

-- ---------- INSCR_EMB (inscricao_embarcacao) ----------
WITH pkg AS (
  INSERT INTO public.document_process_packages (process_type, name, description, category, default_deadline_days, default_priority, is_active)
  VALUES ('inscricao_embarcacao','Inscrição de Embarcação',
          'Inscrição inicial da embarcação junto à Marinha do Brasil (NORMAM-01).',
          'Registro', 30, 'normal', true)
  ON CONFLICT (process_type) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        updated_at = now()
  RETURNING id
),
_del AS (DELETE FROM public.document_process_package_items WHERE package_id IN (SELECT id FROM pkg))
INSERT INTO public.document_process_package_items
  (package_id, document_template_id, document_role, item_label, is_required, requires_signature, requires_ocr, sort_order, conditional_rule)
SELECT pkg.id, dt.id, role, label, req, sig, ocr, ord, rule::jsonb
FROM pkg,
  (VALUES
    ('REQ_INSCR',       'formulario',    'Requerimento de Inscrição',           true,  true,  false, 10, NULL),
    ('PROC_PART_NAVAL', 'procuracao',    'Procuração ao Despachante',           true,  true,  false, 20, NULL),
    ('DECL_PROP_NAVAL', 'declaracao',    'Declaração de Propriedade',           true,  true,  false, 30, NULL),
    ('DECL_RES_NAVAL',  'declaracao',    'Declaração de Residência (subst. comprovante)', false, true, false, 40,
       '{"missing":"customer.address_proof_url"}'),
    ('BSADE_NAVAL',     'formulario',    'BSADE — Boletim de Segurança',        true,  true,  false, 50, NULL),
    ('ANX_DOC_ID',      'anexo',         'CNH/RG do proprietário',              true,  false, true,  60,
       '{"not_equals":["customer.customer_type","juridica"]}'),
    ('ANX_CNPJ',        'anexo',         'Contrato social + Cartão CNPJ',       true,  false, true,  61,
       '{"equals":["customer.customer_type","juridica"]}'),
    ('ANX_COMP_RES',    'anexo',         'Comprovante de residência (≤ 90d)',   false, false, true,  70,
       '{"present":"customer.address_proof_url"}'),
    ('ANX_NF_EMB',      'anexo',         'NF de aquisição da embarcação',       true,  false, true,  80, NULL),
    ('ANX_NF_MOTOR',    'anexo',         'NF de aquisição do motor',            true,  false, true,  90,
       '{"truthy":"vessel.has_engine"}'),
    ('ANX_FOTOS_EMB',   'anexo',         'Fotos obrigatórias (proa/popa/laterais/casco)', true, false, false, 100, NULL),
    ('ANX_GRU_PAGA',    'anexo',         'GRU paga',                            true,  false, true,  110, NULL),
    ('ANX_ART',         'anexo',         'ART do CREA',                         false, false, true,  120,
       '{"gte":["vessel.gross_tonnage",20]}'),
    ('TRT_NAVAL',       'declaracao',    'Termo de Responsabilidade Técnica',   false, true,  false, 130,
       '{"gte":["vessel.gross_tonnage",20]}')
  ) AS s(code,role,label,req,sig,ocr,ord,rule)
JOIN public.document_templates dt ON dt.code = s.code AND dt.is_global = true;

-- ---------- RENOV_TIE ----------
WITH pkg AS (
  INSERT INTO public.document_process_packages (process_type, name, description, category, default_deadline_days, default_priority, is_active)
  VALUES ('renovacao_tie','Renovação de TIE/TIEM',
          'Renovação do Título de Inscrição de Embarcação/Miúda.',
          'Renovação', 20, 'normal', true)
  ON CONFLICT (process_type) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = now()
  RETURNING id
),
_del AS (DELETE FROM public.document_process_package_items WHERE package_id IN (SELECT id FROM pkg))
INSERT INTO public.document_process_package_items
  (package_id, document_template_id, document_role, item_label, is_required, requires_signature, requires_ocr, sort_order, conditional_rule)
SELECT pkg.id, dt.id, role, label, req, sig, ocr, ord, rule::jsonb
FROM pkg,
  (VALUES
    ('REQ_INSCR',       'formulario', 'Requerimento de Renovação',           true, true,  false, 10, NULL),
    ('PROC_PART_NAVAL', 'procuracao', 'Procuração ao Despachante',           true, true,  false, 20, NULL),
    ('ANX_TIE_ORIG',    'anexo',      'TIE/TIEM original em vigor',          true, false, true,  30, NULL),
    ('ANX_GRU_PAGA',    'anexo',      'GRU paga (renovação)',                true, false, true,  40, NULL),
    ('ANX_QUIT_DEB',    'anexo',      'Certidão de quitação de débitos',     true, false, true,  50, NULL),
    ('ANX_LAUDO_VIST',  'anexo',      'Laudo de vistoria (quando exigido)',  false,false, true,  60,
       '{"gte":["vessel.gross_tonnage",20]}')
  ) AS s(code,role,label,req,sig,ocr,ord,rule)
JOIN public.document_templates dt ON dt.code = s.code AND dt.is_global = true;

-- ---------- TRANSF_PROP ----------
WITH pkg AS (
  INSERT INTO public.document_process_packages (process_type, name, description, category, default_deadline_days, default_priority, is_active)
  VALUES ('transferencia_propriedade','Transferência de Propriedade',
          'Transferência de titularidade da embarcação entre comprador (cliente principal) e vendedor (secondary_customer_id).',
          'Transferência', 30, 'normal', true)
  ON CONFLICT (process_type) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = now()
  RETURNING id
),
_del AS (DELETE FROM public.document_process_package_items WHERE package_id IN (SELECT id FROM pkg))
INSERT INTO public.document_process_package_items
  (package_id, document_template_id, document_role, item_label, is_required, requires_signature, requires_ocr, sort_order, conditional_rule, responsible_role)
SELECT pkg.id, dt.id, role, label, req, sig, ocr, ord, rule::jsonb, resp
FROM pkg,
  (VALUES
    ('REQ_TRANSF',       'formulario', 'Requerimento de Transferência',                 true, true,  false, 10, NULL, 'comprador'),
    ('ANX_CONTR_TRANSF', 'anexo',      'Contrato/NF de transferência (comprador+vendedor)', true, true, true, 20, NULL, 'ambos'),
    ('ANX_TIE_ORIG',     'anexo',      'TIE original em vigor',                          true, false, true,  30, NULL, 'vendedor'),
    ('PROC_PART_NAVAL',  'procuracao', 'Procuração do comprador ao despachante',        true, true,  false, 40, NULL, 'comprador'),
    ('PROC_SIMPLES_NAVAL','procuracao','Procuração do vendedor (quando não comparece)', false, true, false, 45, NULL, 'vendedor'),
    ('DECL_PROP_NAVAL',  'declaracao', 'Declaração de propriedade do vendedor',         true, true,  false, 50, NULL, 'vendedor'),
    ('ANX_DOC_ID',       'anexo',      'CNH/RG do comprador',                            true, false, true,  60,
       '{"not_equals":["customer.customer_type","juridica"]}', 'comprador'),
    ('ANX_DOC_ID',       'anexo',      'CNH/RG do vendedor',                             true, false, true,  61, NULL, 'vendedor'),
    ('ANX_CNPJ',         'anexo',      'Contrato social + CNPJ do comprador (PJ)',      true, false, true,  62,
       '{"equals":["customer.customer_type","juridica"]}', 'comprador'),
    ('ANX_COMP_RES',     'anexo',      'Comprovante de residência do comprador',        false, false, true,  70, NULL, 'comprador'),
    ('ANX_QUIT_DEB',     'anexo',      'Quitação de débitos da embarcação',              true, false, true,  80, NULL, 'ambos'),
    ('ANX_GRU_PAGA',     'anexo',      'GRU paga (transferência)',                       true, false, true,  90, NULL, 'comprador')
  ) AS s(code,role,label,req,sig,ocr,ord,rule,resp)
JOIN public.document_templates dt ON dt.code = s.code AND dt.is_global = true;

-- ---------- ALT_CARACT ----------
WITH pkg AS (
  INSERT INTO public.document_process_packages (process_type, name, description, category, default_deadline_days, default_priority, is_active)
  VALUES ('alteracao_caracteristicas','Alteração de Características',
          'Alteração de características técnicas da embarcação (motor, propulsão, arqueação, atividade).',
          'Alteração', 20, 'normal', true)
  ON CONFLICT (process_type) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = now()
  RETURNING id
),
_del AS (DELETE FROM public.document_process_package_items WHERE package_id IN (SELECT id FROM pkg))
INSERT INTO public.document_process_package_items
  (package_id, document_template_id, document_role, item_label, is_required, requires_signature, requires_ocr, sort_order, conditional_rule)
SELECT pkg.id, dt.id, role, label, req, sig, ocr, ord, rule::jsonb
FROM pkg,
  (VALUES
    ('REQ_INSCR',       'formulario', 'Requerimento de Alteração',           true,  true,  false, 10, NULL),
    ('PROC_PART_NAVAL', 'procuracao', 'Procuração ao Despachante',           true,  true,  false, 20, NULL),
    ('ANX_TIE_ORIG',    'anexo',      'TIE original',                        true,  false, true,  30, NULL),
    ('ANX_NF_MOTOR',    'anexo',      'NF do novo motor',                    false, false, true,  40,
       '{"truthy":"vessel.has_engine"}'),
    ('ANX_LAUDO_VIST',  'anexo',      'Laudo técnico da alteração',          true,  false, true,  50, NULL),
    ('ANX_ART',         'anexo',      'ART do CREA (alteração)',             true,  false, true,  60, NULL),
    ('ANX_FOTOS_EMB',   'anexo',      'Fotos após alteração',                true,  false, false, 70, NULL),
    ('ANX_GRU_PAGA',    'anexo',      'GRU paga',                            true,  false, true,  80, NULL)
  ) AS s(code,role,label,req,sig,ocr,ord,rule)
JOIN public.document_templates dt ON dt.code = s.code AND dt.is_global = true;

-- ---------- SEG_VIA ----------
WITH pkg AS (
  INSERT INTO public.document_process_packages (process_type, name, description, category, default_deadline_days, default_priority, is_active)
  VALUES ('segunda_via_tie','Segunda Via de TIE/TIEM',
          'Emissão de 2ª via do TIE/TIEM por perda, furto ou dano.',
          'Administrativo', 10, 'normal', true)
  ON CONFLICT (process_type) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = now()
  RETURNING id
),
_del AS (DELETE FROM public.document_process_package_items WHERE package_id IN (SELECT id FROM pkg))
INSERT INTO public.document_process_package_items
  (package_id, document_template_id, document_role, item_label, is_required, requires_signature, requires_ocr, sort_order, conditional_rule)
SELECT pkg.id, dt.id, role, label, req, sig, ocr, ord, rule::jsonb
FROM pkg,
  (VALUES
    ('REQ_INSCR',       'formulario', 'Requerimento de 2ª Via',              true,  true,  false, 10, NULL),
    ('PROC_PART_NAVAL', 'procuracao', 'Procuração ao Despachante',           true,  true,  false, 20, NULL),
    ('ANX_BO',          'anexo',      'Boletim de Ocorrência (perda/furto)', true,  false, true,  30, NULL),
    ('ANX_GRU_PAGA',    'anexo',      'GRU paga',                            true,  false, true,  40, NULL),
    ('ANX_DOC_ID',      'anexo',      'CNH/RG do proprietário',              true,  false, true,  50, NULL)
  ) AS s(code,role,label,req,sig,ocr,ord,rule)
JOIN public.document_templates dt ON dt.code = s.code AND dt.is_global = true;

-- ---------- CANC_INSCR ----------
WITH pkg AS (
  INSERT INTO public.document_process_packages (process_type, name, description, category, default_deadline_days, default_priority, is_active)
  VALUES ('cancelamento_inscricao','Cancelamento de Inscrição',
          'Cancelamento da inscrição da embarcação (baixa, perda total, exportação).',
          'Administrativo', 15, 'normal', true)
  ON CONFLICT (process_type) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = now()
  RETURNING id
),
_del AS (DELETE FROM public.document_process_package_items WHERE package_id IN (SELECT id FROM pkg))
INSERT INTO public.document_process_package_items
  (package_id, document_template_id, document_role, item_label, is_required, requires_signature, requires_ocr, sort_order, conditional_rule)
SELECT pkg.id, dt.id, role, label, req, sig, ocr, ord, rule::jsonb
FROM pkg,
  (VALUES
    ('ANX_TERMO_CANC',  'declaracao', 'Termo de Cancelamento assinado',      true,  true,  false, 10, NULL),
    ('PROC_PART_NAVAL', 'procuracao', 'Procuração ao Despachante',           true,  true,  false, 20, NULL),
    ('ANX_TIE_ORIG',    'anexo',      'TIE original',                        true,  false, true,  30, NULL),
    ('ANX_QUIT_DEB',    'anexo',      'Quitação de débitos',                 true,  false, true,  40, NULL),
    ('ANX_GRU_PAGA',    'anexo',      'GRU paga (cancelamento)',             true,  false, true,  50, NULL)
  ) AS s(code,role,label,req,sig,ocr,ord,rule)
JOIN public.document_templates dt ON dt.code = s.code AND dt.is_global = true;

-- ---------- REGULAR_DOC ----------
WITH pkg AS (
  INSERT INTO public.document_process_packages (process_type, name, description, category, default_deadline_days, default_priority, is_active)
  VALUES ('regularizacao_documental','Regularização Documental',
          'Regularização de documentação vencida ou irregular perante a Marinha.',
          'Regularização', 25, 'normal', true)
  ON CONFLICT (process_type) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = now()
  RETURNING id
),
_del AS (DELETE FROM public.document_process_package_items WHERE package_id IN (SELECT id FROM pkg))
INSERT INTO public.document_process_package_items
  (package_id, document_template_id, document_role, item_label, is_required, requires_signature, requires_ocr, sort_order, conditional_rule)
SELECT pkg.id, dt.id, role, label, req, sig, ocr, ord, rule::jsonb
FROM pkg,
  (VALUES
    ('REQ_INSCR',       'formulario', 'Requerimento de Regularização',       true,  true,  false, 10, NULL),
    ('PROC_PART_NAVAL', 'procuracao', 'Procuração ao Despachante',           true,  true,  false, 20, NULL),
    ('ANX_TIE_ORIG',    'anexo',      'TIE atual (mesmo vencido)',           true,  false, true,  30, NULL),
    ('ANX_QUIT_DEB',    'anexo',      'Quitação de débitos',                 true,  false, true,  40, NULL),
    ('ANX_GRU_PAGA',    'anexo',      'GRU paga (regularização + multas)',   true,  false, true,  50, NULL),
    ('ANX_LAUDO_VIST',  'anexo',      'Laudo de vistoria atualizado',        false, false, true,  60,
       '{"gte":["vessel.gross_tonnage",20]}')
  ) AS s(code,role,label,req,sig,ocr,ord,rule)
JOIN public.document_templates dt ON dt.code = s.code AND dt.is_global = true;

-- ---------- BSADE_AVULSO ----------
WITH pkg AS (
  INSERT INTO public.document_process_packages (process_type, name, description, category, default_deadline_days, default_priority, is_active)
  VALUES ('bsade_avulso','BSADE Avulso',
          'Emissão isolada do Boletim de Segurança (BSADE) fora de um processo maior.',
          'Técnico', 7, 'normal', true)
  ON CONFLICT (process_type) DO UPDATE
    SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = now()
  RETURNING id
),
_del AS (DELETE FROM public.document_process_package_items WHERE package_id IN (SELECT id FROM pkg))
INSERT INTO public.document_process_package_items
  (package_id, document_template_id, document_role, item_label, is_required, requires_signature, requires_ocr, sort_order, conditional_rule)
SELECT pkg.id, dt.id, role, label, req, sig, ocr, ord, rule::jsonb
FROM pkg,
  (VALUES
    ('BSADE_NAVAL',     'formulario', 'BSADE — Boletim de Segurança',        true,  true,  false, 10, NULL),
    ('PROC_PART_NAVAL', 'procuracao', 'Procuração ao Despachante',           false, true,  false, 20, NULL),
    ('ANX_FOTOS_EMB',   'anexo',      'Fotos da embarcação',                 true,  false, false, 30, NULL),
    ('ANX_ART',         'anexo',      'ART do CREA',                         false, false, true,  40,
       '{"gte":["vessel.gross_tonnage",20]}')
  ) AS s(code,role,label,req,sig,ocr,ord,rule)
JOIN public.document_templates dt ON dt.code = s.code AND dt.is_global = true;

-- =========================================================================
-- 5. RPC de duplicidade — usada pelo Quick Dialog antes de criar processo
-- =========================================================================
CREATE OR REPLACE FUNCTION public.check_process_duplicates(
  p_cpf_cnpj text DEFAULT NULL,
  p_hull_number text DEFAULT NULL,
  p_tie text DEFAULT NULL,
  p_vessel_name text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_company uuid := public.current_user_company_id();
  v_customer jsonb := '[]'::jsonb;
  v_vessel   jsonb := '[]'::jsonb;
BEGIN
  IF v_company IS NULL THEN
    RETURN jsonb_build_object('customers','[]'::jsonb,'vessels','[]'::jsonb);
  END IF;

  IF p_cpf_cnpj IS NOT NULL AND length(regexp_replace(p_cpf_cnpj,'\D','','g')) >= 11 THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'cpf_cnpj',c.cpf_cnpj)), '[]'::jsonb)
      INTO v_customer
      FROM public.customers c
     WHERE c.company_id = v_company
       AND regexp_replace(COALESCE(c.cpf_cnpj,''),'\D','','g') = regexp_replace(p_cpf_cnpj,'\D','','g');
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(v)), '[]'::jsonb) INTO v_vessel
    FROM (
      SELECT id, name, hull_number, tie, 'hull'::text AS match
        FROM public.vessels
       WHERE company_id = v_company AND p_hull_number IS NOT NULL
         AND lower(coalesce(hull_number,'')) = lower(p_hull_number)
      UNION
      SELECT id, name, hull_number, tie, 'tie'::text
        FROM public.vessels
       WHERE company_id = v_company AND p_tie IS NOT NULL
         AND lower(coalesce(tie,'')) = lower(p_tie)
      UNION
      SELECT id, name, hull_number, tie, 'name'::text
        FROM public.vessels
       WHERE company_id = v_company AND p_vessel_name IS NOT NULL
         AND similarity(lower(name), lower(p_vessel_name)) > 0.6
    ) v;

  RETURN jsonb_build_object('customers', v_customer, 'vessels', v_vessel);
END;
$$;

REVOKE ALL ON FUNCTION public.check_process_duplicates(text,text,text,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.check_process_duplicates(text,text,text,text) TO authenticated;

-- pg_trgm para similarity()
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
