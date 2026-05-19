-- Limpar políticas existentes para evitar erros de duplicidade
DROP POLICY IF EXISTS "Admins have full access to document_template_fields" ON public.document_template_fields;
DROP POLICY IF EXISTS "Admins have full access to document_process_rules" ON public.document_process_rules;
DROP POLICY IF EXISTS "Users can view their own checklists" ON public.document_checklists;
DROP POLICY IF EXISTS "Users can view their own document_versions" ON public.document_versions;

-- Novas políticas para document_template_fields
CREATE POLICY "Enable read access for all authenticated users" 
ON public.document_template_fields FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert/update/delete for authenticated users" 
ON public.document_template_fields FOR ALL TO authenticated USING (true);

-- Novas políticas para document_process_rules
CREATE POLICY "Enable read access for all authenticated users" 
ON public.document_process_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert/update/delete for authenticated users" 
ON public.document_process_rules FOR ALL TO authenticated USING (true);

-- Novas políticas para document_checklists
CREATE POLICY "Enable read access for all authenticated users" 
ON public.document_checklists FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert/update/delete for authenticated users" 
ON public.document_checklists FOR ALL TO authenticated USING (true);

-- Novas políticas para document_versions
CREATE POLICY "Enable read access for all authenticated users" 
ON public.document_versions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert/update/delete for authenticated users" 
ON public.document_versions FOR ALL TO authenticated USING (true);
