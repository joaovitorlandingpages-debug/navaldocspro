ALTER TABLE public.payment_logs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_logs' AND column_name='error_message') THEN
        ALTER TABLE public.payment_logs RENAME COLUMN error_message TO message;
    END IF;
END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admin master can view all payment logs" ON public.payment_logs;
    DROP POLICY IF EXISTS "Companies can view their own payment logs" ON public.payment_logs;
END $$;

CREATE POLICY "Admin master can view all payment logs"
ON public.payment_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin_master'
  )
);

CREATE POLICY "Companies can view their own payment logs"
ON public.payment_logs
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);
