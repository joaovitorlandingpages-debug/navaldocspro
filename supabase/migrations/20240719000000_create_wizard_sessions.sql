create type public.wizard_session_status as enum ('draft', 'uploading', 'processing', 'review_required', 'ready_to_create', 'creating', 'completed', 'failed', 'cancelled');

create table public.wizard_sessions (
    id uuid primary key default gen_random_uuid(),
    company_id uuid references public.companies(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    status public.wizard_session_status default 'draft' not null,
    current_step text not null default 'documents',
    selected_service_id uuid references public.process_types(id),
    selected_blueprint_id uuid references public.process_blueprints(id),
    customer_id uuid references public.customers(id),
    vessel_id uuid references public.vessels(id),
    process_id uuid references public.processes(id),
    uploaded_document_ids uuid[] default '{}',
    ocr_job_ids uuid[] default '{}',
    extracted_data jsonb default '{}',
    review_status jsonb default '{}',
    pending_requirements jsonb default '{}',
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    expires_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wizard_sessions TO authenticated;
GRANT ALL ON public.wizard_sessions TO service_role;

ALTER TABLE public.wizard_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own wizard sessions"
    ON public.wizard_sessions
    FOR ALL
    TO authenticated
    USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

