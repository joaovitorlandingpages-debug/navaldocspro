-- ====================================================================
-- CONSULTA DE PRÉ-VERIFICAÇÃO: Catálogo de Modelos e Versões
-- NavalDocs Pro - Verificação Prévia de Migrations
--
-- NATUREZA DA CONSULTA:
--   • Execução 100% de leitura (SELECT). Não executa writes nem DDL.
--   • Mapeia códigos canônicos e slugs/aliases para identificar os modelos
--     que existem no banco, preservando seus UUIDs reais.
--   • Avalia estado atual em public.document_templates e public.template_versions.
--   • Não altera dados de produção.
-- ====================================================================

WITH catalog_target_models AS (
  SELECT * FROM (VALUES
    ('REQ-001',  'req-padrao-cpes',          'Requerimento Padrão do Interessado',                  ARRAY['REQ-001', 'req-padrao-cpes', 'REQ_PADRAO', 'REQ_CPES']),
    ('PROC-NAV', 'proc-representacao-naval', 'Procuração Específica para Capitania dos Portos',     ARRAY['PROC-NAV', 'proc-representacao-naval', 'PROC_PART_NAVAL', 'PROC_SIMPLES_NAVAL']),
    ('DEC-RES',  'decl-residencia-naval',    'Declaração de Residência do Proprietário',            ARRAY['DEC-RES', 'decl-residencia-naval', 'DECL_RES_NAVAL']),
    ('REQ-PROF', 'req-comercial-prof',       'Requerimento de Embarcação Profissional / Comercial', ARRAY['REQ-PROF', 'req-comercial-prof', 'REQ_COM_PROF']),
    ('REQ-JET',  'req-moto-aquatica',        'Requerimento Específico para Moto Aquática (Jet Ski)', ARRAY['REQ-JET', 'req-moto-aquatica', 'REQ_INSCR']),
    ('DEC-PERD', 'decl-perda-extravio',      'Declaração de Perda / Extravio de Documento Náutico', ARRAY['DEC-PERD', 'decl-perda-extravio', 'DECL_EXTRAVIO'])
  ) AS t(canonical_code, slug, canonical_name, aliases)
)
SELECT
  ctm.canonical_code AS "Código Canônico",
  ctm.slug AS "Slug de Catálogo",
  ctm.canonical_name AS "Nome no Catálogo",
  dt.id AS "UUID Atual no Banco",
  dt.code AS "Código Atual no Banco",
  dt.is_global AS "Global?",
  dt.is_active AS "Ativo?",
  dt.lifecycle_status AS "Status Ciclo",
  dt.version AS "Versão Atual",
  (dt.base_content IS NOT NULL AND length(trim(dt.base_content)) > 0) AS "Possui Conteúdo Base?",
  COUNT(tv.id) AS "Total Versões",
  COUNT(tv.id) FILTER (WHERE tv.status = 'published') AS "Versões Publicadas",
  MAX(tv.version_number) AS "Último Nº Versão",
  CASE
    WHEN dt.id IS NULL THEN 'INSERÇÃO DE NOVO MODELO (CÓDIGO: ' || ctm.canonical_code || ')'
    ELSE 'ATUALIZAÇÃO SEGURA (PRESERVA UUID: ' || dt.id::text || ')'
  END AS "Ação Prevista pela Migration"
FROM catalog_target_models ctm
LEFT JOIN public.document_templates dt
  ON dt.company_id IS NULL
 AND (dt.code = ctm.canonical_code OR dt.code = ctm.slug OR dt.code = ANY(ctm.aliases))
LEFT JOIN public.template_versions tv
  ON tv.template_id = dt.id
GROUP BY
  ctm.canonical_code,
  ctm.slug,
  ctm.canonical_name,
  dt.id,
  dt.code,
  dt.name,
  dt.is_global,
  dt.is_active,
  dt.lifecycle_status,
  dt.version,
  dt.base_content
ORDER BY ctm.canonical_code;
