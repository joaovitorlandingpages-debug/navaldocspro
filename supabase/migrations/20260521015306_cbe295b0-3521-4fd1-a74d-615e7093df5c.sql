-- Ajustar políticas de inserção para clientes
DO $$
BEGIN
    -- Remover política antiga se existir para recriar com WITH CHECK
    DROP POLICY IF EXISTS "Users can insert customers for their own company" ON public.customers;
    
    CREATE POLICY "Users can insert customers for their own company"
    ON public.customers
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );
END $$;
