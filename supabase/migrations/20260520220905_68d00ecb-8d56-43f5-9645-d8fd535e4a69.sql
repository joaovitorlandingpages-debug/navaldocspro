-- Create a table to track demo state
CREATE TABLE IF NOT EXISTS public.demo_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
    is_demo_mode BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demo_configurations ENABLE ROW LEVEL SECURITY;

-- Policies for demo_configurations
CREATE POLICY "Users can view their own company demo config"
ON public.demo_configurations FOR SELECT
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE company_id = demo_configurations.company_id));

-- Function to seed demo data for a company
CREATE OR REPLACE FUNCTION public.seed_demo_data(p_company_id UUID)
RETURNS void AS $$
DECLARE
    v_customer_id UUID;
    v_vessel_id UUID;
    v_process_id UUID;
BEGIN
    -- 1. Create Demo Customer
    INSERT INTO public.customers (company_id, name, email, cpf_cnpj, phone)
    VALUES (p_company_id, 'Douglas Engenharia Naval', 'douglas@demo.navaldocs.pro', '12.345.678/0001-99', '+55 11 99999-9999')
    RETURNING id INTO v_customer_id;

    -- 2. Create Demo Vessel
    INSERT INTO public.vessels (company_id, customer_id, name, registration_number, vessel_type, activity, gross_tonnage)
    VALUES (p_company_id, v_customer_id, 'PHOENIX OPS-01', '381P2023001', 'Reboque', 'Apoio Portuário', 450)
    RETURNING id INTO v_vessel_id;

    -- 3. Create Demo Processes
    -- Process 1: Complete/Finalized
    INSERT INTO public.processes (company_id, customer_id, vessel_id, process_type, status, priority)
    VALUES (p_company_id, v_customer_id, v_vessel_id, 'Registro de Embarcação', 'Concluído', 'Alta')
    RETURNING id INTO v_process_id;

    -- Process 2: In Progress (Renewal)
    INSERT INTO public.processes (company_id, customer_id, vessel_id, process_type, status, priority)
    VALUES (p_company_id, v_customer_id, v_vessel_id, 'Renovação de CSN', 'Em Andamento', 'Média');

    -- Update company metadata to show it's a demo
    UPDATE public.companies 
    SET onboarding_status = 'completed', 
        onboarding_step = 7
    WHERE id = p_company_id;

    -- Set demo mode active
    INSERT INTO public.demo_configurations (company_id, is_demo_mode)
    VALUES (p_company_id, TRUE)
    ON CONFLICT (company_id) DO UPDATE SET is_demo_mode = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
