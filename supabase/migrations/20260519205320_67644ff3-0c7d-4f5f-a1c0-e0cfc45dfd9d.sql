-- Fix function search_path
CREATE OR REPLACE FUNCTION public.update_process_compliance_status()
RETURNS TRIGGER AS $$
DECLARE
    total_mandatory INTEGER;
    completed_mandatory INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_mandatory FROM public.document_checklists WHERE process_id = NEW.process_id AND is_mandatory = true;
    SELECT COUNT(*) INTO completed_mandatory FROM public.document_checklists WHERE process_id = NEW.process_id AND is_mandatory = true AND status = 'completed';

    IF total_mandatory = 0 THEN
        UPDATE public.processes SET compliance_status = 'conforme', compliance_score = 100 WHERE id = NEW.process_id;
    ELSIF completed_mandatory = total_mandatory THEN
        UPDATE public.processes SET compliance_status = 'conforme', compliance_score = 100 WHERE id = NEW.process_id;
    ELSE
        UPDATE public.processes SET compliance_status = 'incompleto', compliance_score = (completed_mandatory::numeric / total_mandatory::numeric) * 100 WHERE id = NEW.process_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Refine policies for compliance_history
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.compliance_history;

CREATE POLICY "Users can view history of their processes" 
ON public.compliance_history FOR SELECT TO authenticated 
USING (
    process_id IN (SELECT id FROM public.processes WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);

CREATE POLICY "Users can add history to their processes" 
ON public.compliance_history FOR INSERT TO authenticated 
WITH CHECK (
    process_id IN (SELECT id FROM public.processes WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);

-- Refine policies for maritime_compliance_rules (read-only for normal users)
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.maritime_compliance_rules;

CREATE POLICY "Everyone authenticated can read rules" 
ON public.maritime_compliance_rules FOR SELECT TO authenticated USING (true);
