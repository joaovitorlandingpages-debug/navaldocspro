-- Create AI conversations tables with RLS and multi-tenant support

-- AI Conversations table
CREATE TABLE public.ai_conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    summary text,
    context_state jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- AI Conversation Messages table
CREATE TABLE public.ai_conversation_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    company_id uuid NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content text NOT NULL,
    intent text,
    agent_id text,
    execution_id uuid,
    tool_calls jsonb NOT NULL DEFAULT '[]',
    references jsonb NOT NULL DEFAULT '[]',
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- AI Execution Logs table
CREATE TABLE public.ai_execution_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
    company_id uuid NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    execution_id uuid NOT NULL,
    intent text,
    agent_id text,
    plan jsonb NOT NULL DEFAULT '[]',
    executed_tools jsonb NOT NULL DEFAULT '[]',
    references jsonb NOT NULL DEFAULT '[]',
    warnings jsonb NOT NULL DEFAULT '[]',
    confidence numeric,
    duration_ms integer,
    status text NOT NULL CHECK (status IN ('success', 'partial_success', 'failed', 'error')),
    error_code text,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Indices for performance and multi-tenancy
CREATE INDEX idx_ai_conversations_company_id ON public.ai_conversations(company_id);
CREATE INDEX idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX idx_ai_conversation_messages_conversation_id ON public.ai_conversation_messages(conversation_id);
CREATE INDEX idx_ai_conversation_messages_company_id ON public.ai_conversation_messages(company_id);
CREATE INDEX idx_ai_execution_logs_company_id ON public.ai_execution_logs(company_id);
CREATE INDEX idx_ai_execution_logs_execution_id ON public.ai_execution_logs(execution_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.ai_conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_execution_logs ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
GRANT ALL ON public.ai_conversations TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversation_messages TO authenticated;
GRANT ALL ON public.ai_conversation_messages TO service_role;

GRANT SELECT, INSERT ON public.ai_execution_logs TO authenticated;
GRANT ALL ON public.ai_execution_logs TO service_role;

-- Policies for ai_conversations
CREATE POLICY "Users can view their company's conversations"
    ON public.ai_conversations FOR SELECT
    TO authenticated
    USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create conversations for their company"
    ON public.ai_conversations FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND
        user_id = auth.uid()
    );

CREATE POLICY "Users can update their company's conversations"
    ON public.ai_conversations FOR UPDATE
    TO authenticated
    USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Policies for ai_conversation_messages
CREATE POLICY "Users can view their company's messages"
    ON public.ai_conversation_messages FOR SELECT
    TO authenticated
    USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert messages for their company"
    ON public.ai_conversation_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND
        user_id = auth.uid()
    );

-- Policies for ai_execution_logs
CREATE POLICY "Users can view their company's execution logs"
    ON public.ai_execution_logs FOR SELECT
    TO authenticated
    USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert execution logs for their company"
    ON public.ai_execution_logs FOR INSERT
    TO authenticated
    WITH CHECK (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND
        user_id = auth.uid()
    );
