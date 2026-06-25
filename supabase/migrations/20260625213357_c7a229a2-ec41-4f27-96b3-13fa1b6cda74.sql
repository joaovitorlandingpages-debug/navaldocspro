DROP POLICY IF EXISTS profiles_update_self ON public.profiles;

CREATE POLICY profiles_update_self ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  AND (
    -- bootstrap: allow setting company_id when it was previously NULL
    (SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid()) IS NULL
    OR NOT (company_id IS DISTINCT FROM (SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid()))
  )
  AND NOT (partner_id IS DISTINCT FROM (SELECT p.partner_id FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (is_pilot IS DISTINCT FROM (SELECT p.is_pilot FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (is_demo_user IS DISTINCT FROM (SELECT p.is_demo_user FROM public.profiles p WHERE p.id = auth.uid()))
);