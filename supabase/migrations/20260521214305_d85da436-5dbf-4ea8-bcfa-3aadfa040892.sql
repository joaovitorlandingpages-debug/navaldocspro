-- 1. Departments for team organization
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Partners Table
DO $$ BEGIN
    CREATE TYPE partner_type AS ENUM ('despachante', 'engenheiro', 'vistoriador', 'marina', 'estaleiro', 'oficina', 'outro');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type partner_type NOT NULL DEFAULT 'outro',
    email TEXT,
    phone TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Partnership Shares (Collaborative Workflow)
CREATE TABLE public.partnership_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    shared_by UUID REFERENCES auth.users(id),
    permissions TEXT[] DEFAULT '{view}'::text[],
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CRM Leads
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'new',
    source TEXT,
    notes TEXT,
    last_contact_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Notifications System (Renamed to app_notifications to avoid conflicts)
CREATE TABLE public.app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    link TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Executive Metrics
CREATE TABLE public.executive_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_date DATE DEFAULT current_date,
    category TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Update Profiles
ALTER TABLE public.profiles 
ADD COLUMN department_id UUID REFERENCES public.departments(id),
ADD COLUMN partner_id UUID REFERENCES public.partners(id);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnership_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executive_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users view company departments" ON public.departments FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Admins manage departments" ON public.departments FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND company_id = departments.company_id AND (role = 'admin' OR role = 'admin_master')));

CREATE POLICY "Partners viewable by company" ON public.partners FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR company_id IS NULL);
CREATE POLICY "Admins manage partners" ON public.partners FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'admin_master' OR role = 'admin_master_global')));

CREATE POLICY "Users view shared data" ON public.partnership_shares FOR SELECT USING (partner_id = (SELECT partner_id FROM public.profiles WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND company_id = (SELECT company_id FROM public.partners WHERE id = partnership_shares.partner_id)));

CREATE POLICY "Users view company leads" ON public.leads FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_master_global');

CREATE POLICY "Users view own notifications" ON public.app_notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.app_notifications FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Global admins view executive metrics" ON public.executive_metrics FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_master_global');

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
