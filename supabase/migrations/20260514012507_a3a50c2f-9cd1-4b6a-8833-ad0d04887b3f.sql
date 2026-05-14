-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Companies Table
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    email TEXT,
    phone TEXT,
    logo_url TEXT,
    plan TEXT DEFAULT 'free',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Profiles Table (Linked to auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    name TEXT,
    email TEXT,
    role TEXT DEFAULT 'viewer' CHECK (role IN ('admin_master', 'company_admin', 'engineer', 'dispatcher', 'operational', 'finance', 'viewer')),
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Customers Table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cpf_cnpj TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Vessels Table
CREATE TABLE public.vessels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    registration_number TEXT,
    vessel_type TEXT,
    engine TEXT,
    category TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. Processes Table
CREATE TABLE public.processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    vessel_id UUID REFERENCES public.vessels(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' NOT NULL,
    process_type TEXT NOT NULL,
    priority TEXT DEFAULT 'medium' NOT NULL,
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 6. Documents Table
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    vessel_id UUID REFERENCES public.vessels(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 7. Activity Logs Table
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS SETTINGS

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin_master
CREATE OR REPLACE FUNCTION public.is_admin_master()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin_master'
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for Companies
CREATE POLICY "admin_master can see all companies" ON public.companies FOR SELECT USING (public.is_admin_master());
CREATE POLICY "Users can see their own company" ON public.companies FOR SELECT USING (id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Policies for Profiles
CREATE POLICY "admin_master can see all profiles" ON public.profiles FOR SELECT USING (public.is_admin_master());
CREATE POLICY "Users can see profiles in their own company" ON public.profiles FOR SELECT USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- Policies for Customers (Company isolation)
CREATE POLICY "Isolation: Customers" ON public.customers FOR ALL USING (
  public.is_admin_master() OR company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Policies for Vessels (Company isolation)
CREATE POLICY "Isolation: Vessels" ON public.vessels FOR ALL USING (
  public.is_admin_master() OR company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Policies for Processes (Company isolation)
CREATE POLICY "Isolation: Processes" ON public.processes FOR ALL USING (
  public.is_admin_master() OR company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Policies for Documents (Company isolation)
CREATE POLICY "Isolation: Documents" ON public.documents FOR ALL USING (
  public.is_admin_master() OR company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Policies for Activity Logs (Company isolation)
CREATE POLICY "Isolation: Activity Logs" ON public.activity_logs FOR ALL USING (
  public.is_admin_master() OR company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- AUTOMATION: Create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage Buckets setup (using inserts into storage.buckets if needed via script later, but creating policies here)
-- Note: storage.objects RLS policies require the bucket to exist.
