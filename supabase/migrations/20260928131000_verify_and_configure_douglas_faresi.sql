-- ====================================================================
-- MIGRATION: 20260928131000_verify_and_configure_douglas_faresi.sql
-- CONFIGURAÇÃO SEGURA DE DOUGLAS FARESI (douglas_faresi@hotmail.com)
-- COMO ADMINISTRADOR GLOBAL DA PLATAFORMA AO LADO DE JOÃO VITOR
-- ====================================================================

-- 1. Atualizar a trigger handle_new_user para garantir que os dois administradores
-- recebam permanentemente a role 'admin_master_global' sem depender de flags no frontend.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_name text;
  v_clean_email text;
BEGIN
  v_clean_email := lower(trim(new.email));
  v_name := COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Novo Usuário');

  -- Regra restrita de Administradores Globais Titulares
  IF v_clean_email IN ('joaovitor.f0725@gmail.com', 'douglas_faresi@hotmail.com') THEN
    v_role := 'admin_master_global';
    IF v_clean_email = 'douglas_faresi@hotmail.com' AND (v_name = 'Novo Usuário' OR v_name IS NULL) THEN
      v_name := 'Douglas Faresi';
    ELSIF v_clean_email = 'joaovitor.f0725@gmail.com' AND (v_name = 'Novo Usuário' OR v_name IS NULL) THEN
      v_name := 'João Vitor';
    END IF;
  ELSE
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'company_admin');
    IF v_role NOT IN ('admin_master_global','admin_master','company_admin','engineer','dispatcher','operational','finance','viewer') THEN
      v_role := 'company_admin';
    END IF;
  END IF;

  -- Upsert resiliente no perfil vinculado ao auth.id
  INSERT INTO public.profiles (id, email, name, role, updated_at)
  VALUES (new.id, v_clean_email, v_name, v_role, now())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    role = v_role,
    updated_at = now();

  RETURN NEW;
END;
$function$;

-- 2. Vincular ou Pré-Provisionar Douglas Faresi
DO $$
DECLARE
  v_douglas_auth_id UUID;
  v_douglas_profile_id UUID;
  v_joao_id UUID;
BEGIN
  -- Verificar se Douglas já existe no Auth
  SELECT id INTO v_douglas_auth_id 
  FROM auth.users 
  WHERE lower(trim(email)) = 'douglas_faresi@hotmail.com' 
  LIMIT 1;

  -- Verificar se já existe perfil cadastrado com esse e-mail
  SELECT id INTO v_douglas_profile_id 
  FROM public.profiles 
  WHERE lower(trim(email)) = 'douglas_faresi@hotmail.com' 
  LIMIT 1;

  -- Obter ID de João Vitor para autoria do registro
  SELECT id INTO v_joao_id 
  FROM public.profiles 
  WHERE lower(trim(email)) = 'joaovitor.f0725@gmail.com' 
  LIMIT 1;

  IF v_douglas_auth_id IS NOT NULL THEN
    -- CASO 1: Usuário já possui conta no Lovable Cloud Auth
    IF v_douglas_profile_id IS NOT NULL THEN
      UPDATE public.profiles
      SET role = 'admin_master_global',
          name = COALESCE(NULLIF(name, ''), 'Douglas Faresi'),
          updated_at = now()
      WHERE id = v_douglas_profile_id;
    ELSE
      INSERT INTO public.profiles (id, email, name, role, updated_at)
      VALUES (v_douglas_auth_id, 'douglas_faresi@hotmail.com', 'Douglas Faresi', 'admin_master_global', now());
    END IF;
  ELSE
    -- CASO 2: Usuário ainda não possui auth.users (fluxo de pré-cadastro seguro)
    -- Cria ou atualiza o perfil em profiles para que o primeiro login herde imediatamente a role
    IF v_douglas_profile_id IS NOT NULL THEN
      UPDATE public.profiles
      SET role = 'admin_master_global',
          name = 'Douglas Faresi',
          updated_at = now()
      WHERE id = v_douglas_profile_id;
    ELSE
      INSERT INTO public.profiles (id, email, name, role, metadata, updated_at)
      VALUES (
        gen_random_uuid(),
        'douglas_faresi@hotmail.com',
        'Douglas Faresi',
        'admin_master_global',
        jsonb_build_object('status', 'invited', 'note', 'Pre-provisioned Global Admin', 'invited_at', now()),
        now()
      );
    END IF;
  END IF;

  -- 3. Log de Auditoria
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
    COALESCE(v_joao_id, gen_random_uuid()),
    'CONFIGURE_SECOND_GLOBAL_ADMIN',
    'profiles',
    COALESCE(v_douglas_auth_id, v_douglas_profile_id),
    jsonb_build_object('action', 'Provision second platform administrator'),
    jsonb_build_object('email', 'douglas_faresi@hotmail.com', 'role', 'admin_master_global', 'co_admin', 'joaovitor.f0725@gmail.com'),
    'system_safe_migration',
    now()
  );
END $$;

-- 4. Função RPC segura de Diagnóstico dos Administradores Globais
CREATE OR REPLACE FUNCTION public.get_platform_administrators_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admins jsonb;
  v_douglas_in_auth boolean;
  v_douglas_auth_id uuid;
  v_douglas_created_at timestamptz;
  v_douglas_last_sign_in timestamptz;
  v_joao_in_auth boolean;
  v_joao_auth_id uuid;
  v_joao_created_at timestamptz;
  v_joao_last_sign_in timestamptz;
BEGIN
  -- Consultar perfis administrativos
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'email', p.email,
    'name', p.name,
    'role', p.role,
    'company_id', p.company_id,
    'metadata', p.metadata,
    'created_at', p.created_at,
    'updated_at', p.updated_at
  )), '[]'::jsonb)
  INTO v_admins
  FROM public.profiles p
  WHERE p.role IN ('admin_master_global', 'superadmin')
     OR p.email IN ('joaovitor.f0725@gmail.com', 'douglas_faresi@hotmail.com');

  -- Consultar status do Auth para Douglas
  SELECT 
    (id IS NOT NULL),
    id,
    created_at,
    last_sign_in_at
  INTO 
    v_douglas_in_auth,
    v_douglas_auth_id,
    v_douglas_created_at,
    v_douglas_last_sign_in
  FROM auth.users
  WHERE lower(trim(email)) = 'douglas_faresi@hotmail.com'
  LIMIT 1;

  -- Consultar status do Auth para João
  SELECT 
    (id IS NOT NULL),
    id,
    created_at,
    last_sign_in_at
  INTO 
    v_joao_in_auth,
    v_joao_auth_id,
    v_joao_created_at,
    v_joao_last_sign_in
  FROM auth.users
  WHERE lower(trim(email)) = 'joaovitor.f0725@gmail.com'
  LIMIT 1;

  RETURN jsonb_build_object(
    'timestamp', now(),
    'administrators', v_admins,
    'douglas_faresi', jsonb_build_object(
      'email', 'douglas_faresi@hotmail.com',
      'exists_in_auth', coalesce(v_douglas_in_auth, false),
      'auth_id', v_douglas_auth_id,
      'created_at', v_douglas_created_at,
      'last_sign_in_at', v_douglas_last_sign_in
    ),
    'joao_vitor', jsonb_build_object(
      'email', 'joaovitor.f0725@gmail.com',
      'exists_in_auth', coalesce(v_joao_in_auth, false),
      'auth_id', v_joao_auth_id,
      'created_at', v_joao_created_at,
      'last_sign_in_at', v_joao_last_sign_in
    )
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_platform_administrators_status() TO anon, authenticated, service_role;
