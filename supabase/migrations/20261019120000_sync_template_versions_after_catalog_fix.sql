-- ====================================================================
-- MIGRATION: 20261019120000_sync_template_versions_after_catalog_fix.sql
-- Sincronização segura e idempotente de template_versions com os modelos
-- corrigidos do catálogo da plataforma NavalDocs Pro.
--
-- ESCOPO RESTRITO:
--   Limita-se estritamente aos códigos dos modelos desta correção:
--   'REQ-001', 'REQ-PROF', 'PROC-NAV', 'DEC-RES', 'REQ-JET', 'DEC-PERD'
--
-- REGRAS E CONSTRAINTS DO SCHEMA REAL:
--   • Schema real: public.template_versions
--   • Colunas reais: template_id (uuid), version (text), version_number (integer),
--     status (enum public.template_lifecycle: 'draft', 'published', 'archived'),
--     base_content (text), document_structure (jsonb), changelog (jsonb), notes (text),
--     metadata (jsonb)
--   • Próxima versão calculada com MAX(version_number) entre TODAS as versões do modelo:
--       SELECT COALESCE(MAX(version_number), 0) + 1 FROM public.template_versions WHERE template_id = v_tpl.id;
--   • Preservação de versões e snapshots históricos:
--     Versão anterior publicada é arquivada com status = 'archived' (enum válido no PostgreSQL real).
--     NENHUM registro histórico ou snapshot de documento é deletado.
--   • Idempotência:
--     Não duplica versão se a versão publicada atual já possuir conteúdo idêntico.
--   • O sistema referencia a versão publicada via:
--       status = 'published' (ou document_templates.version_number sincronizado)
--
-- ATENÇÃO: NÃO EXECUTAR EM PRODUÇÃO NESTA ETAPA (testada em ambiente isolado).
-- ====================================================================

DO $$
DECLARE
  v_tpl         RECORD;
  v_last_pub    RECORD;
  v_next_vernum INTEGER;
BEGIN

  FOR v_tpl IN
    SELECT id, name, code, base_content, document_structure, fields_config
      FROM public.document_templates
     WHERE company_id IS NULL
       AND is_active = true
       AND lifecycle_status = 'published'
       AND code IN ('REQ-001', 'REQ-PROF', 'PROC-NAV', 'DEC-RES', 'REQ-JET', 'DEC-PERD')
       AND base_content IS NOT NULL
       AND base_content <> ''
     ORDER BY code
  LOOP

    -- 1. Busca a versão publicada mais recente para este template
    SELECT id, version_number, status, base_content
      INTO v_last_pub
      FROM public.template_versions
     WHERE template_id = v_tpl.id
       AND status = 'published'
     ORDER BY version_number DESC
     LIMIT 1;

    -- 2. Idempotência estrita: se já existe versão publicada com o mesmo conteúdo, não duplica
    IF FOUND AND v_last_pub.base_content = v_tpl.base_content THEN
      RAISE NOTICE 'Template "%s" (%) já possui versão publicada com conteúdo idêntico (v%). Pulando duplicação.',
        v_tpl.name, v_tpl.code, v_last_pub.version_number;
      CONTINUE;
    END IF;

    -- 3. Calcula o próximo version_number considerando TODAS as versões já existentes (draft, published, archived)
    SELECT COALESCE(MAX(version_number), 0) + 1
      INTO v_next_vernum
      FROM public.template_versions
     WHERE template_id = v_tpl.id;

    -- 4. Arquiva a versão publicada anterior, preservando o histórico completo intacto
    IF FOUND THEN
      UPDATE public.template_versions
         SET status = 'archived'
       WHERE template_id = v_tpl.id
         AND status = 'published';
    END IF;

    -- 5. Insere a nova versão publicada no schema real
    INSERT INTO public.template_versions (
      template_id,
      version,
      version_number,
      status,
      base_content,
      document_structure,
      changelog,
      notes,
      metadata,
      created_at
    ) VALUES (
      v_tpl.id,
      v_next_vernum::text,
      v_next_vernum,
      'published',
      v_tpl.base_content,
      COALESCE(v_tpl.document_structure, '{}'::jsonb),
      jsonb_build_array(
        jsonb_build_object(
          'action', 'publish_version',
          'note', 'Sincronização de catálogo NavalDocs Pro (correção de modelos oficiais e layout)',
          'version_number', v_next_vernum,
          'at', now()
        )
      ),
      'Versão publicada via migration 20261019120000 com alinhamento de base_content e layout',
      jsonb_build_object(
        'synced_at', now(),
        'migration', '20261019120000_sync_template_versions_after_catalog_fix',
        'code', v_tpl.code
      ),
      now()
    );

    -- 6. Atualiza o cabeçalho do template pai para referenciar a versão recém-publicada
    UPDATE public.document_templates
       SET version = v_next_vernum::text,
           version_number = v_next_vernum,
           updated_at = now()
     WHERE id = v_tpl.id;

    RAISE NOTICE 'Template "%s" (%) — versão % publicada com sucesso em template_versions.',
      v_tpl.name, v_tpl.code, v_next_vernum;

  END LOOP;

END $$;
