-- ====================================================================
-- CONSULTA DE PRÉ-VERIFICAÇÃO: Catálogo de Modelos e Diagnóstico de Conflitos
-- NavalDocs Pro - Verificação Prévia de Migrations
--
-- REGRAS ESTRITAS DE AUDITORIA:
--   • Execução 100% de leitura (SELECT). Não executa writes nem DDL.
--   • NÃO utiliza LIMIT 1: expõe TODOS os registros candidatos e históricos.
--   • Mapeia códigos canônicos e aliases para identificar modelos existentes,
--     preservando integralmente seus UUIDs reais e vínculos em generated_documents.
--   • Diagnostica explicitamente ambiguidades e conflitos de registros duplicados.
--   • Audita a desassociação segura de REQ_INSCR (garantindo que nunca seja Jet Ski).
--   • Não altera dados de produção.
-- ====================================================================

-- --------------------------------------------------------------------
-- PAINEL 1: MAPEAMENTO DE CANDIDATOS POR MODELO DO CATÁLOGO OFICIAL
-- (Mostra todos os candidatos sem LIMIT 1, contagem de vínculos e status de conflito)
-- --------------------------------------------------------------------
WITH catalog_target_models AS (
  SELECT * FROM (VALUES
    ('REQ-001',  'req-padrao-cpes',          'Requerimento Padrão do Interessado',                  'esporte_recreio', ARRAY['REQ-001', 'req-padrao-cpes', 'REQ_PADRAO', 'REQ_CPES', 'REQ_INSCR']),
    ('PROC-NAV', 'proc-representacao-naval', 'Procuração Específica para Capitania dos Portos',     'geral',           ARRAY['PROC-NAV', 'proc-representacao-naval', 'PROC_PART_NAVAL', 'PROC_SIMPLES_NAVAL']),
    ('DEC-RES',  'decl-residencia-naval',    'Declaração de Residência do Proprietário',            'geral',           ARRAY['DEC-RES', 'decl-residencia-naval', 'DECL_RES_NAVAL']),
    ('REQ-PROF', 'req-comercial-prof',       'Requerimento de Embarcação Profissional / Comercial', 'profissional',    ARRAY['REQ-PROF', 'req-comercial-prof', 'REQ_COM_PROF']),
    ('REQ-JET',  'req-moto-aquatica',        'Requerimento Específico para Moto Aquática (Jet Ski)', 'moto_aquatica',  ARRAY['REQ-JET', 'req-moto-aquatica', 'REQ_MOTO_AQUATICA']),
    ('DEC-PERD', 'decl-perda-extravio',      'Declaração de Perda / Extravio de Documento Náutico', 'geral',           ARRAY['DEC-PERD', 'decl-perda-extravio', 'DECL_EXTRAVIO'])
  ) AS t(canonical_code, slug, canonical_name, target_category, aliases)
),
candidates_eval AS (
  SELECT
    ctm.canonical_code,
    ctm.slug,
    ctm.canonical_name,
    ctm.target_category,
    dt.id AS template_id,
    dt.code AS db_code,
    dt.name AS db_name,
    dt.category AS db_category,
    dt.is_global,
    dt.is_active,
    dt.lifecycle_status,
    dt.version,
    (dt.base_content IS NOT NULL AND length(trim(dt.base_content)) > 0) AS has_base_content,
    COALESCE(docs.doc_count, 0) AS docs_vinculados,
    COALESCE(vers.ver_count, 0) AS versoes_vinculadas,
    COUNT(dt.id) OVER (PARTITION BY ctm.canonical_code) AS total_candidatos_modelo
  FROM catalog_target_models ctm
  LEFT JOIN public.document_templates dt
    ON dt.company_id IS NULL
   AND (
     -- Casos especiais de classificação semântica segura:
     CASE
       -- Jet Ski: NUNCA associa REQ_INSCR; busca apenas aliases específicos ou categoria moto_aquatica confirmada
       WHEN ctm.canonical_code = 'REQ-JET' THEN
         dt.code = ANY(ctm.aliases)
         OR (dt.category = 'moto_aquatica' AND (dt.name ILIKE '%moto%' OR dt.name ILIKE '%jet%') AND dt.code != 'REQ_INSCR')
       -- Requerimento Padrão: REQ_INSCR só é associado se sua semântica for de inscrição/geral e NÃO de moto aquática
       WHEN ctm.canonical_code = 'REQ-001' THEN
         dt.code IN ('REQ-001', 'req-padrao-cpes', 'REQ_PADRAO', 'REQ_CPES')
         OR (
           dt.code = 'REQ_INSCR'
           AND (dt.category IN ('esporte_recreio', 'geral') OR dt.name ILIKE '%inscrição%' OR dt.name ILIKE '%requerimento%' OR dt.name ILIKE '%embarcação%')
           AND dt.category != 'moto_aquatica'
           AND COALESCE(dt.name, '') NOT ILIKE '%moto%'
           AND COALESCE(dt.name, '') NOT ILIKE '%jet%'
         )
       -- Demais modelos: match por código canônico, slug ou aliases oficiais
       ELSE
         dt.code = ctm.canonical_code OR dt.code = ctm.slug OR dt.code = ANY(ctm.aliases)
     END
   )
  LEFT JOIN (
    SELECT template_id, COUNT(*) AS doc_count
      FROM public.generated_documents
     GROUP BY template_id
  ) docs ON docs.template_id = dt.id
  LEFT JOIN (
    SELECT template_id, COUNT(*) AS ver_count
      FROM public.template_versions
     GROUP BY template_id
  ) vers ON vers.template_id = dt.id
)
SELECT
  canonical_code AS "Modelo Canônico",
  slug AS "Slug Catálogo",
  canonical_name AS "Nome Esperado",
  template_id AS "UUID no Banco",
  db_code AS "Código Atual Banco",
  db_name AS "Nome Atual Banco",
  db_category AS "Categoria Banco",
  is_global AS "Global?",
  is_active AS "Ativo?",
  lifecycle_status AS "Status Ciclo",
  has_base_content AS "Possui Conteúdo?",
  docs_vinculados AS "Documentos Históricos Vinculados",
  versoes_vinculadas AS "Versões Vinculadas",
  total_candidatos_modelo AS "Total Candidatos Encontrados",
  CASE
    WHEN total_candidatos_modelo = 0 THEN
      'INSERÇÃO LIMPA (Nenhum registro prévio, modelo será inserido com novo UUID)'
    WHEN total_candidatos_modelo = 1 THEN
      'OK - CANDIDATO ÚNICO (UUID e histórico em generated_documents serão 100% preservados)'
    ELSE
      'ALERTA DE AMBIGUIDADE / CONFLITO (Foram encontrados múltiplos candidatos! A migration abortará para não sobrescrever)'
  END AS "Diagnóstico e Ação Prevista"
FROM candidates_eval
ORDER BY canonical_code, db_code NULLS LAST;

-- --------------------------------------------------------------------
-- PAINEL 2: AUDITORIA ESPECÍFICA DO ALIAS HISTÓRICO "REQ_INSCR"
-- (Verifica se existe algum registro com REQ_INSCR e atesta que não será Jet Ski)
-- --------------------------------------------------------------------
SELECT
  dt.id AS "UUID do Registro REQ_INSCR",
  dt.code AS "Código",
  dt.name AS "Nome do Modelo",
  dt.category AS "Categoria",
  dt.company_id AS "Company ID",
  dt.is_global AS "Global?",
  dt.is_active AS "Ativo?",
  dt.created_at AS "Data Criação",
  (SELECT count(*) FROM public.generated_documents gd WHERE gd.template_id = dt.id) AS "Documentos Vinculados",
  CASE
    WHEN dt.category = 'moto_aquatica' OR dt.name ILIKE '%moto%' OR dt.name ILIKE '%jet%' THEN
      'CONFLITO SEMÂNTICO: Registro com código REQ_INSCR contém termos de moto aquática. REQUER INTERVENÇÃO MANUAL.'
    ELSE
      'SEGURO: REQ_INSCR classificado exclusivamente como Requerimento Geral (REQ-001). NUNCA associado a REQ-JET.'
  END AS "Status de Segurança Semântica"
FROM public.document_templates dt
WHERE dt.code = 'REQ_INSCR';
