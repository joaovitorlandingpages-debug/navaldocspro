-- document_template_fields
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.document_template_fields;
DROP POLICY IF EXISTS "Enable insert/update/delete for authenticated users" ON public.document_template_fields;

CREATE POLICY "Authenticated users can read template fields" ON public.document_template_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage template fields" ON public.document_template_fields FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_master'));

-- document_process_rules
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.document_process_rules;
DROP POLICY IF EXISTS "Enable insert/update/delete for authenticated users" ON public.document_process_rules;

CREATE POLICY "Authenticated users can read process rules" ON public.document_process_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage process rules" ON public.document_process_rules FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_master'));

-- document_checklists
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.document_checklists;
DROP POLICY IF EXISTS "Enable insert/update/delete for authenticated users" ON public.document_checklists;

CREATE POLICY "Users can read their checklists" ON public.document_checklists FOR SELECT TO authenticated 
USING (process_id IN (SELECT id FROM public.processes WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Users can update their checklists" ON public.document_checklists FOR UPDATE TO authenticated 
USING (process_id IN (SELECT id FROM public.processes WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())));

-- document_versions
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.document_versions;
DROP POLICY IF EXISTS "Enable insert/update/delete for authenticated users" ON public.document_versions;

CREATE POLICY "Users can read document versions" ON public.document_versions FOR SELECT TO authenticated 
USING (document_id IN (SELECT id FROM public.documents WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Users can add document versions" ON public.document_versions FOR INSERT TO authenticated 
WITH CHECK (document_id IN (SELECT id FROM public.documents WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())));
