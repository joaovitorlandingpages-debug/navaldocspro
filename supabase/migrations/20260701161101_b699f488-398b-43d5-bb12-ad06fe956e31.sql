
-- Onda A — Motor Inteligente de Processos: enriquecer document_checklists e adicionar RPCs auxiliares

ALTER TABLE public.document_checklists
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.document_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS document_role text,
  ADD COLUMN IF NOT EXISTS requires_signature boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_ocr boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_expiration boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conditional_rule jsonb,
  ADD COLUMN IF NOT EXISTS is_conditional boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_document_checklists_process ON public.document_checklists(process_id);
CREATE INDEX IF NOT EXISTS idx_document_checklists_template ON public.document_checklists(template_id);

-- Missing INSERT/DELETE policies to allow the engine (running as the user) to materialize checklist items
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='document_checklists' AND policyname='Users can insert their checklists') THEN
    CREATE POLICY "Users can insert their checklists"
      ON public.document_checklists FOR INSERT TO authenticated
      WITH CHECK (process_id IN (
        SELECT id FROM public.processes
         WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='document_checklists' AND policyname='Users can delete their checklists') THEN
    CREATE POLICY "Users can delete their checklists"
      ON public.document_checklists FOR DELETE TO authenticated
      USING (process_id IN (
        SELECT id FROM public.processes
         WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
      ));
  END IF;
END $$;

-- Helper: cria linhas do checklist a partir do pacote do tipo, sem duplicar itens já existentes
CREATE OR REPLACE FUNCTION public.process_materialize_checklist(p_process_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_process record;
  v_pkg_id uuid;
  v_item record;
  v_added int := 0;
  v_kept int := 0;
BEGIN
  PERFORM public._assert_process_access(p_process_id);
  SELECT * INTO v_process FROM public.processes WHERE id = p_process_id;

  SELECT id INTO v_pkg_id FROM public.document_process_packages
   WHERE process_type = v_process.process_type AND is_active = true
   LIMIT 1;

  IF v_pkg_id IS NULL THEN
    RETURN jsonb_build_object('added', 0, 'kept', 0, 'reason', 'no_package_for_type');
  END IF;

  FOR v_item IN
    SELECT ppi.*, dt.name AS template_name
      FROM public.document_process_package_items ppi
      LEFT JOIN public.document_templates dt ON dt.id = ppi.document_template_id
     WHERE ppi.package_id = v_pkg_id
     ORDER BY ppi.sort_order NULLS LAST
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.document_checklists
       WHERE process_id = p_process_id
         AND (template_id = v_item.document_template_id
              OR item_name = COALESCE(v_item.template_name, v_item.document_role))
    ) THEN
      v_kept := v_kept + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.document_checklists (
      process_id, item_name, is_mandatory, status, template_id, document_role,
      requires_signature, requires_ocr, has_expiration, sort_order,
      conditional_rule, is_conditional
    ) VALUES (
      p_process_id,
      COALESCE(v_item.template_name, v_item.document_role, 'Documento'),
      COALESCE(v_item.is_required, true),
      'pending',
      v_item.document_template_id,
      v_item.document_role,
      COALESCE(v_item.requires_signature, false),
      COALESCE(v_item.requires_ocr, false),
      COALESCE(v_item.has_expiration, false),
      COALESCE(v_item.sort_order, 0),
      v_item.conditional_rule,
      v_item.conditional_rule IS NOT NULL
    );
    v_added := v_added + 1;
  END LOOP;

  RETURN jsonb_build_object('added', v_added, 'kept', v_kept, 'package_id', v_pkg_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_materialize_checklist(uuid) TO authenticated;
