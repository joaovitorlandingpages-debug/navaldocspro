-- FASE 0 — Padronização do Motor Documental.
-- Remove duplicação byte-a-byte do BCE: mantém o template com nome completo e categoria preenchida.
DELETE FROM public.document_templates
 WHERE id = 'ab531087-8f74-4ad2-ae18-5555cf5cfd07'
   AND name = 'BCE';