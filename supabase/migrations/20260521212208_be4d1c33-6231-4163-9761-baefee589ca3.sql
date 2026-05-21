-- RPC to increment OCR usage safely
CREATE OR REPLACE FUNCTION public.increment_ocr_usage(company_id_param UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.usage_metrics (company_id, ocr_usage)
    VALUES (company_id_param, amount)
    ON CONFLICT (company_id) 
    DO UPDATE SET 
        ocr_usage = public.usage_metrics.ocr_usage + amount,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize usage metrics for new companies
CREATE OR REPLACE FUNCTION public.initialize_company_usage()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.usage_metrics (company_id)
    VALUES (NEW.id)
    ON CONFLICT (company_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call initialize_company_usage
DROP TRIGGER IF EXISTS trigger_initialize_company_usage ON public.companies;
CREATE TRIGGER trigger_initialize_company_usage
AFTER INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.initialize_company_usage();

-- Backfill usage metrics for existing companies
INSERT INTO public.usage_metrics (company_id)
SELECT id FROM public.companies
ON CONFLICT (company_id) DO NOTHING;
