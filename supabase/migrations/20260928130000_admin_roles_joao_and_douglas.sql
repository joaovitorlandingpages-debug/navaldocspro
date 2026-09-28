-- ====================================================================
-- MIGRATION: 20260928130000_admin_roles_joao_and_douglas.sql
-- DEFINIÇÃO DOS DOIS ADMINISTRADORES GLOBAIS OFICIAIS:
-- João Vitor (joaovitor.f0725@gmail.com) e Douglas Faresi (douglas_faresi@hotmail.com)
-- REGISTRO DE AUDITORIA EM public.global_audit_logs
-- ====================================================================

DO $$
DECLARE
  v_joao_id UUID;
  v_douglas_id UUID;
  v_prev_joao_role TEXT;
  v_prev_douglas_role TEXT;
BEGIN
  -- 1. Localizar IDs e papéis atuais
  SELECT id, role INTO v_joao_id, v_prev_joao_role 
  FROM public.profiles 
  WHERE email = 'joaovitor.f0725@gmail.com' 
  LIMIT 1;

  SELECT id, role INTO v_douglas_id, v_prev_douglas_role 
  FROM public.profiles 
  WHERE email = 'douglas_faresi@hotmail.com' 
  LIMIT 1;

  -- 2. Atualizar perfil de João Vitor para admin_master_global
  IF v_joao_id IS NOT NULL THEN
    UPDATE public.profiles
    SET role = 'admin_master_global',
        updated_at = now()
    WHERE id = v_joao_id;
  END IF;

  -- 3. Atualizar perfil de Douglas Faresi para admin_master_global
  IF v_douglas_id IS NOT NULL THEN
    UPDATE public.profiles
    SET role = 'admin_master_global',
        updated_at = now()
    WHERE id = v_douglas_id;
  END IF;

  -- 4. Registrar logs na tabela oficial de auditoria da plataforma
  IF v_joao_id IS NOT NULL THEN
    INSERT INTO public.global_audit_logs (
      admin_id,
      action,
      target_table,
      target_id,
      previous_value,
      new_value,
      ip_address,
      created_at
    ) VALUES (
      v_joao_id,
      'GRANT_ADMIN_MASTER_GLOBAL',
      'profiles',
      v_joao_id,
      jsonb_build_object('role', v_prev_joao_role, 'email', 'joaovitor.f0725@gmail.com'),
      jsonb_build_object('role', 'admin_master_global', 'email', 'joaovitor.f0725@gmail.com', 'granted_by', 'system_admin_consensus'),
      'system',
      now()
    );
  END IF;

  IF v_douglas_id IS NOT NULL THEN
    INSERT INTO public.global_audit_logs (
      admin_id,
      action,
      target_table,
      target_id,
      previous_value,
      new_value,
      ip_address,
      created_at
    ) VALUES (
      COALESCE(v_joao_id, v_douglas_id),
      'GRANT_ADMIN_MASTER_GLOBAL',
      'profiles',
      v_douglas_id,
      jsonb_build_object('role', v_prev_douglas_role, 'email', 'douglas_faresi@hotmail.com'),
      jsonb_build_object('role', 'admin_master_global', 'email', 'douglas_faresi@hotmail.com', 'granted_by', 'system_admin_consensus'),
      'system',
      now()
    );
  END IF;

END $$;
