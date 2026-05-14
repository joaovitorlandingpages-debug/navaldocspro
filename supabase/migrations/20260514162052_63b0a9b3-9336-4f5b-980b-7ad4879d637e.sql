CREATE POLICY "Admin master can view payment logs" 
ON public.payment_logs FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_master'));
