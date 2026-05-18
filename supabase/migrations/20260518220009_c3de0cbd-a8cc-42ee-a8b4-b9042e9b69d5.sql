-- Function to log activity
CREATE OR REPLACE FUNCTION public.log_activity_event()
RETURNS TRIGGER AS $$
DECLARE
    company_id UUID;
    user_id UUID;
    resource_type TEXT;
    action TEXT;
    resource_id UUID;
    target_name TEXT;
BEGIN
    -- Try to get current user from session
    user_id := auth.uid();
    
    -- Determine resource type and ID
    resource_type := TG_TABLE_NAME;
    resource_id := COALESCE(NEW.id, OLD.id);
    
    -- Determine company_id (every audited table has company_id)
    company_id := COALESCE(NEW.company_id, OLD.company_id);
    
    -- Determine action
    IF (TG_OP = 'INSERT') THEN
        action := 'created';
        -- Extract a name if possible for better display
        CASE TG_TABLE_NAME
            WHEN 'customers' THEN target_name := NEW.name;
            WHEN 'vessels' THEN target_name := NEW.name;
            WHEN 'processes' THEN target_name := NEW.process_type;
            WHEN 'generated_documents' THEN target_name := NEW.name;
            ELSE target_name := NULL;
        END CASE;
    ELSIF (TG_OP = 'UPDATE') THEN
        action := 'updated';
    ELSIF (TG_OP = 'DELETE') THEN
        action := 'deleted';
    END IF;

    -- Insert into activity_logs
    INSERT INTO public.activity_logs (
        company_id,
        user_id,
        action,
        resource_type,
        resource_id,
        metadata
    ) VALUES (
        company_id,
        user_id,
        action,
        resource_type,
        resource_id,
        jsonb_build_object(
            'op', TG_OP,
            'target_name', target_name,
            'table', TG_TABLE_NAME
        )
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS tr_log_customers ON public.customers;
CREATE TRIGGER tr_log_customers
AFTER INSERT OR UPDATE OR DELETE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.log_activity_event();

DROP TRIGGER IF EXISTS tr_log_vessels ON public.vessels;
CREATE TRIGGER tr_log_vessels
AFTER INSERT OR UPDATE OR DELETE ON public.vessels
FOR EACH ROW EXECUTE FUNCTION public.log_activity_event();

DROP TRIGGER IF EXISTS tr_log_processes ON public.processes;
CREATE TRIGGER tr_log_processes
AFTER INSERT OR UPDATE OR DELETE ON public.processes
FOR EACH ROW EXECUTE FUNCTION public.log_activity_event();

DROP TRIGGER IF EXISTS tr_log_documents ON public.generated_documents;
CREATE TRIGGER tr_log_documents
AFTER INSERT OR UPDATE OR DELETE ON public.generated_documents
FOR EACH ROW EXECUTE FUNCTION public.log_activity_event();
