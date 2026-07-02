
-- 1) Add process_type_id link on packages
ALTER TABLE public.document_process_packages
  ADD COLUMN IF NOT EXISTS process_type_id uuid REFERENCES public.process_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dpp_process_type_id ON public.document_process_packages(process_type_id);

-- 2) Backfill: alias slug -> process_types.name
WITH alias(pt_string, pt_name) AS (
  VALUES
    ('registro_inicial',       'Registro Inicial de Embarcação'),
    ('alteracao_motor',        'Alteração de Motor'),
    ('transferencia',          'Transferência de Propriedade'),
    ('vistoria',               'Vistoria Técnica')
),
resolved AS (
  SELECT dpp.id AS pkg_id,
         pt.id  AS pt_id
    FROM public.document_process_packages dpp
    LEFT JOIN alias a ON a.pt_string = dpp.process_type
    LEFT JOIN public.process_types pt
           ON pt.name = COALESCE(a.pt_name, dpp.process_type)
   WHERE dpp.process_type_id IS NULL
)
UPDATE public.document_process_packages dpp
   SET process_type_id = r.pt_id
  FROM resolved r
 WHERE dpp.id = r.pkg_id
   AND r.pt_id IS NOT NULL;

-- 3) Update materialization: prefer process_type_id, fallback to string match
CREATE OR REPLACE FUNCTION public.process_materialize_checklist(p_process_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_process record;
  v_pkg_id uuid;
  v_item record;
  v_added int := 0;
  v_kept int := 0;
BEGIN
  PERFORM public._assert_process_access(p_process_id);
  SELECT * INTO v_process FROM public.processes WHERE id = p_process_id;

  -- Prefer explicit process_type_id link
  IF v_process.process_type_id IS NOT NULL THEN
    SELECT id INTO v_pkg_id
      FROM public.document_process_packages
     WHERE process_type_id = v_process.process_type_id AND is_active = true
     ORDER BY created_at DESC
     LIMIT 1;
  END IF;

  -- Fallback: exact string match on process_type
  IF v_pkg_id IS NULL AND v_process.process_type IS NOT NULL THEN
    SELECT id INTO v_pkg_id
      FROM public.document_process_packages
     WHERE process_type = v_process.process_type AND is_active = true
     ORDER BY created_at DESC
     LIMIT 1;
  END IF;

  -- Fallback: resolve package via process_types.name matching processes.process_type
  IF v_pkg_id IS NULL AND v_process.process_type IS NOT NULL THEN
    SELECT dpp.id INTO v_pkg_id
      FROM public.document_process_packages dpp
      JOIN public.process_types pt ON pt.id = dpp.process_type_id
     WHERE pt.name = v_process.process_type AND dpp.is_active = true
     ORDER BY dpp.created_at DESC
     LIMIT 1;
  END IF;

  IF v_pkg_id IS NULL THEN
    RETURN jsonb_build_object('added', 0, 'kept', 0, 'reason', 'no_package_for_type',
                              'process_type', v_process.process_type,
                              'process_type_id', v_process.process_type_id);
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
$function$;
