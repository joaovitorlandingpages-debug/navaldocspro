
-- Onda D: metadata for process model management
ALTER TABLE public.document_process_packages
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_deadline_days integer,
  ADD COLUMN IF NOT EXISTS default_priority text;

ALTER TABLE public.document_process_package_items
  ADD COLUMN IF NOT EXISTS item_label text,
  ADD COLUMN IF NOT EXISTS responsible_role text;

-- Broaden write policies to include 'admin' role (not just admin_master)
DROP POLICY IF EXISTS "Admin full access" ON public.document_process_packages;
CREATE POLICY "Admin manage packages" ON public.document_process_packages
  FOR ALL TO authenticated
  USING (public.is_admin_master() OR EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role IN ('admin','admin_master','admin_master_global')))
  WITH CHECK (public.is_admin_master() OR EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role IN ('admin','admin_master','admin_master_global')));

DROP POLICY IF EXISTS "Admin full access" ON public.document_process_package_items;
CREATE POLICY "Admin manage package items" ON public.document_process_package_items
  FOR ALL TO authenticated
  USING (public.is_admin_master() OR EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role IN ('admin','admin_master','admin_master_global')))
  WITH CHECK (public.is_admin_master() OR EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role IN ('admin','admin_master','admin_master_global')));

-- Seed / upsert "Inscrição de Embarcação" package
INSERT INTO public.document_process_packages (name, process_type, description, category, sort_order, default_deadline_days, default_priority, is_active)
VALUES ('Inscrição de Embarcação', 'inscricao_embarcacao', 'Modelo completo para inscrição inicial de embarcação junto à Capitania.', 'Inscrição', 10, 45, 'normal', true)
ON CONFLICT (process_type) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order,
  default_deadline_days = EXCLUDED.default_deadline_days,
  default_priority = EXCLUDED.default_priority,
  is_active = true,
  updated_at = now();

-- Seed items for the Inscrição package
DO $$
DECLARE v_pkg uuid;
BEGIN
  SELECT id INTO v_pkg FROM public.document_process_packages WHERE process_type='inscricao_embarcacao';
  DELETE FROM public.document_process_package_items WHERE package_id = v_pkg;

  INSERT INTO public.document_process_package_items
    (package_id, document_template_id, document_role, item_label, responsible_role, is_required, requires_signature, requires_ocr, has_expiration, sort_order, conditional_rule)
  VALUES
    (v_pkg, (SELECT id FROM public.document_templates WHERE name ILIKE 'Procuração%' ORDER BY name LIMIT 1),
     'procuracao', 'Procuração', 'cliente', true, true, false, false, 10, NULL),
    (v_pkg, (SELECT id FROM public.document_templates WHERE name ILIKE 'Requerimento de Inscrição%' LIMIT 1),
     'requerimento', 'Requerimento de Inscrição', 'engenheiro', true, true, false, false, 20, NULL),
    (v_pkg, (SELECT id FROM public.document_templates WHERE name ILIKE 'BADE/BSADE%' LIMIT 1),
     'bsade', 'BSADE', 'engenheiro', true, true, false, false, 30, NULL),
    (v_pkg, (SELECT id FROM public.document_templates WHERE name ILIKE 'Declaração de Residência%' LIMIT 1),
     'residencia', 'Declaração de Residência', 'cliente', false, false, false, false, 40,
     '{"if":{"field":"customer.has_proof_of_address","op":"eq","value":false}}'::jsonb),
    (v_pkg, NULL, 'doc_proprietario', 'Documento do Proprietário (RG/CNH)', 'cliente', true, false, true, false, 50, NULL),
    (v_pkg, NULL, 'doc_embarcacao', 'Documentação da Embarcação (Nota Fiscal / Contrato)', 'cliente', true, false, true, false, 60, NULL),
    (v_pkg, NULL, 'fotos', 'Fotos da Embarcação', 'cliente', true, false, false, false, 70, NULL);
END $$;
