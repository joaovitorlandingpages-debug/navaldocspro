const fs = require('fs');
const path = require('path');
const pg = require('pg');
const EmbeddedPostgres = require('embedded-postgres').default;

async function runTestOnIsolatedPostgres() {
  console.log("=== INICIALIZANDO POSTGRES TEMPORÁRIO ISOLADO ===");
  const testDataDir = path.join(process.cwd(), 'scratch_pg_test_db');
  
  if (fs.existsSync(testDataDir)) {
    try {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    } catch {}
  }

  const pgServer = new EmbeddedPostgres({
    databaseDir: testDataDir,
    port: 54329,
    user: 'postgres',
    password: 'password',
    persistent: false
  });

  try {
    console.log("Iniciando cluster PostgreSQL isolado...");
    await pgServer.initialise();
    await pgServer.start();
    console.log("PostgreSQL isolado rodando na porta 54329!");

    const pool = new pg.Pool({
      host: 'localhost',
      port: 54329,
      user: 'postgres',
      password: 'password',
      database: 'postgres'
    });
    pool.on('error', () => {}); // Silencia ECONNRESET ao desligar o cluster no teardown

    console.log("\n1. Criando schema base simulando Supabase auth e profiles...");
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- Schema auth
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$ LANGUAGE sql STABLE;

      CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT AS $$
        SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'anon');
      $$ LANGUAGE sql STABLE;

      -- Schema storage
      CREATE SCHEMA IF NOT EXISTS storage;
      CREATE TABLE IF NOT EXISTS storage.buckets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        public BOOLEAN DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS storage.objects (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        bucket_id TEXT REFERENCES storage.buckets(id),
        name TEXT NOT NULL,
        owner UUID,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE OR REPLACE FUNCTION storage.foldername(name TEXT)
      RETURNS TEXT[] AS $$
        SELECT string_to_array(name, '/');
      $$ LANGUAGE sql IMMUTABLE;

      -- Schema public
      CREATE TABLE IF NOT EXISTS public.companies (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY,
        company_id UUID REFERENCES public.companies(id),
        role TEXT NOT NULL DEFAULT 'user',
        email TEXT
      );

      CREATE TABLE IF NOT EXISTS public.subscriptions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        company_id UUID REFERENCES public.companies(id) UNIQUE,
        status TEXT NOT NULL DEFAULT 'pending',
        current_period_end TIMESTAMPTZ,
        metadata JSONB DEFAULT '{}'::jsonb
      );

      CREATE TABLE IF NOT EXISTS public.processes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        company_id UUID REFERENCES public.companies(id),
        title TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.generated_documents (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        company_id UUID REFERENCES public.companies(id),
        name TEXT NOT NULL,
        generated_file_url TEXT,
        status TEXT NOT NULL DEFAULT 'ready_for_signature',
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE OR REPLACE FUNCTION public.current_user_company_id()
      RETURNS UUID AS $$
        SELECT company_id FROM public.profiles WHERE id = auth.uid();
      $$ LANGUAGE sql STABLE;

      CREATE OR REPLACE FUNCTION public.is_admin_master()
      RETURNS BOOLEAN AS $$
        SELECT EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() 
            AND role IN ('admin_master', 'admin_master_global', 'superadmin')
        );
      $$ LANGUAGE sql STABLE;

      -- Role authenticated e service_role do Supabase
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role NOLOGIN;
        END IF;
      END $$;

      GRANT USAGE ON SCHEMA public TO authenticated;
      GRANT USAGE ON SCHEMA storage TO authenticated;
      GRANT USAGE ON SCHEMA auth TO authenticated;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
      GRANT ALL ON ALL TABLES IN SCHEMA storage TO authenticated;
      GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
      GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA storage TO authenticated;
      GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO authenticated;

      ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    `);

    console.log("2. Injetando dados de teste isolados (empresas, usuários e assinaturas)...");
    const compPendingId = '11111111-1111-1111-1111-111111111111';
    const compActiveId  = '22222222-2222-2222-2222-222222222222';
    const compTrialingId = '33333333-3333-3333-3333-333333333333';
    const compExpiredId  = '44444444-4444-4444-4444-444444444444';
    const compAdminId    = '55555555-5555-5555-5555-555555555555';

    const userPendingId   = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const userActiveId    = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const userTrialingId  = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    const userExpiredId   = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    const userAdminId     = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

    await pool.query(`
      INSERT INTO storage.buckets (id, name, public) VALUES ('generated-documents', 'generated-documents', false);

      INSERT INTO public.companies (id, name) VALUES 
        ('${compPendingId}', 'Empresa Pending'),
        ('${compActiveId}', 'Empresa Active'),
        ('${compTrialingId}', 'Empresa Trialing Vigente'),
        ('${compExpiredId}', 'Empresa Trial Expirado'),
        ('${compAdminId}', 'Empresa do Admin Master');

      INSERT INTO public.profiles (id, company_id, role, email) VALUES
        ('${userPendingId}', '${compPendingId}', 'user', 'pending@test.com'),
        ('${userActiveId}', '${compActiveId}', 'user', 'active@test.com'),
        ('${userTrialingId}', '${compTrialingId}', 'user', 'trialing@test.com'),
        ('${userExpiredId}', '${compExpiredId}', 'user', 'expired@test.com'),
        ('${userAdminId}', '${compAdminId}', 'admin_master', 'admin@naval.com');

      -- Assinaturas
      INSERT INTO public.subscriptions (company_id, status, current_period_end) VALUES
        ('${compPendingId}', 'pending', NULL),
        ('${compActiveId}', 'active', now() + INTERVAL '30 days'),
        ('${compTrialingId}', 'trialing', now() + INTERVAL '10 days'),
        ('${compExpiredId}', 'trialing', now() - INTERVAL '2 days'),
        ('${compAdminId}', 'pending', NULL); -- Admin isento mesmo com status pending!
    `);

    console.log("3. Aplicando a migration real 20261027180000...");
    const migrationSql = fs.readFileSync(
      path.join(process.cwd(), 'supabase/migrations/20261027180000_enforce_commercial_authorization_on_processes_and_docs.sql'),
      'utf8'
    );
    await pool.query(migrationSql);
    console.log("Migration aplicada com sucesso no cluster PostgreSQL!");

    // Helper para rodar query como usuário com RLS
    async function testAsUser(userId, role, sql, params = []) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN;");
        await client.query(`SET LOCAL ROLE authenticated;`);
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${userId}';`);
        await client.query(`SET LOCAL "request.jwt.claim.role" = '${role}';`);
        const res = await client.query(sql, params);
        await client.query("COMMIT;");
        return { success: true, rows: res.rows };
      } catch (err) {
        await client.query("ROLLBACK;");
        return { success: false, error: err.message, code: err.code };
      } finally {
        client.release();
      }
    }

    console.log("\n=== 4. EXECUTANDO MATRIZ DE TESTES REAIS COM RLS DO POSTGRESQL ===");
    const testCases = [];

    // 1. Pending: criação de processo bloqueada
    const t1 = await testAsUser(
      userPendingId, 'authenticated',
      `INSERT INTO public.processes (company_id, title) VALUES ('${compPendingId}', 'Proc Pending');`
    );
    testCases.push({
      teste: "1a. Pending: inserção em processes",
      esperado: "BLOQUEADO (RLS)",
      resultado: t1.success ? "PERMITIDO (FALHA)" : `BLOQUEADO: ${t1.error}`,
      status: !t1.success ? "PASSOU" : "FALHOU"
    });

    // 1b. Pending: documento bloqueado
    const t1b = await testAsUser(
      userPendingId, 'authenticated',
      `INSERT INTO public.generated_documents (company_id, name, generated_file_url) VALUES ('${compPendingId}', 'Doc Pending', 'generated-documents/${compPendingId}/test.pdf');`
    );
    testCases.push({
      teste: "1b. Pending: inserção em generated_documents",
      esperado: "BLOQUEADO (RLS)",
      resultado: t1b.success ? "PERMITIDO (FALHA)" : `BLOQUEADO: ${t1b.error}`,
      status: !t1b.success ? "PASSOU" : "FALHOU"
    });

    // 1c. Pending: upload storage bloqueado
    const t1c = await testAsUser(
      userPendingId, 'authenticated',
      `INSERT INTO storage.objects (bucket_id, name) VALUES ('generated-documents', '${compPendingId}/file.pdf');`
    );
    testCases.push({
      teste: "1c. Pending: upload no bucket generated-documents",
      esperado: "BLOQUEADO (RLS)",
      resultado: t1c.success ? "PERMITIDO (FALHA)" : `BLOQUEADO: ${t1c.error}`,
      status: !t1c.success ? "PASSOU" : "FALHOU"
    });

    // 2. Active: permitido
    const t2a = await testAsUser(
      userActiveId, 'authenticated',
      `INSERT INTO public.processes (company_id, title) VALUES ('${compActiveId}', 'Proc Active') RETURNING id;`
    );
    testCases.push({
      teste: "2a. Active: inserção em processes",
      esperado: "PERMITIDO",
      resultado: t2a.success ? `PERMITIDO (ID: ${t2a.rows[0].id})` : `BLOQUEADO: ${t2a.error}`,
      status: t2a.success ? "PASSOU" : "FALHOU"
    });

    const t2b = await testAsUser(
      userActiveId, 'authenticated',
      `INSERT INTO public.generated_documents (company_id, name, generated_file_url) VALUES ('${compActiveId}', 'Doc Active', 'generated-documents/${compActiveId}/doc.pdf') RETURNING id;`
    );
    testCases.push({
      teste: "2b. Active: inserção em generated_documents",
      esperado: "PERMITIDO",
      resultado: t2b.success ? `PERMITIDO (ID: ${t2b.rows[0].id})` : `BLOQUEADO: ${t2b.error}`,
      status: t2b.success ? "PASSOU" : "FALHOU"
    });

    const t2c = await testAsUser(
      userActiveId, 'authenticated',
      `INSERT INTO storage.objects (bucket_id, name) VALUES ('generated-documents', '${compActiveId}/doc.pdf') RETURNING id;`
    );
    testCases.push({
      teste: "2c. Active: upload storage",
      esperado: "PERMITIDO",
      resultado: t2c.success ? `PERMITIDO (ID: ${t2c.rows[0].id})` : `BLOQUEADO: ${t2c.error}`,
      status: t2c.success ? "PASSOU" : "FALHOU"
    });

    // 3. Trialing Vigente: permitido
    const t3a = await testAsUser(
      userTrialingId, 'authenticated',
      `INSERT INTO public.processes (company_id, title) VALUES ('${compTrialingId}', 'Proc Trial') RETURNING id;`
    );
    testCases.push({
      teste: "3. Trialing vigente: inserção em processes",
      esperado: "PERMITIDO",
      resultado: t3a.success ? `PERMITIDO (ID: ${t3a.rows[0].id})` : `BLOQUEADO: ${t3a.error}`,
      status: t3a.success ? "PASSOU" : "FALHOU"
    });

    // 4. Trial Expirado: bloqueado
    const t4a = await testAsUser(
      userExpiredId, 'authenticated',
      `INSERT INTO public.processes (company_id, title) VALUES ('${compExpiredId}', 'Proc Expired');`
    );
    testCases.push({
      teste: "4. Trial expirado: inserção em processes",
      esperado: "BLOQUEADO (RLS)",
      resultado: t4a.success ? "PERMITIDO (FALHA)" : `BLOQUEADO: ${t4a.error}`,
      status: !t4a.success ? "PASSOU" : "FALHOU"
    });

    // 5. Escrita em outra empresa (inclusive para Administrador)
    // 5a. Usuário comum tentando gravar em outra empresa
    const t5a = await testAsUser(
      userActiveId, 'authenticated',
      `INSERT INTO public.processes (company_id, title) VALUES ('${compPendingId}', 'Proc Invasor');`
    );
    testCases.push({
      teste: "5a. Usuário active: escrita em outra empresa",
      esperado: "BLOQUEADO (Tenant)",
      resultado: t5a.success ? "PERMITIDO (FALHA)" : `BLOQUEADO: ${t5a.error}`,
      status: !t5a.success ? "PASSOU" : "FALHOU"
    });

    // 5b. Administrador Global tentando gravar em empresa alheia
    const t5b = await testAsUser(
      userAdminId, 'authenticated',
      `INSERT INTO public.processes (company_id, title) VALUES ('${compActiveId}', 'Admin Invasor');`
    );
    testCases.push({
      teste: "5b. Admin Global: escrita em outra empresa",
      esperado: "BLOQUEADO (Tenant)",
      resultado: t5b.success ? "PERMITIDO (FALHA)" : `BLOQUEADO: ${t5b.error}`,
      status: !t5b.success ? "PASSOU" : "FALHOU"
    });

    // 5c. Administrador Global: escrita na própria empresa (isenção comercial)
    const t5c = await testAsUser(
      userAdminId, 'authenticated',
      `INSERT INTO public.processes (company_id, title) VALUES ('${compAdminId}', 'Admin Própria Empresa') RETURNING id;`
    );
    testCases.push({
      teste: "5c. Admin Global: escrita na própria empresa (isenção)",
      esperado: "PERMITIDO",
      resultado: t5c.success ? `PERMITIDO (ID: ${t5c.rows[0].id})` : `BLOQUEADO: ${t5c.error}`,
      status: t5c.success ? "PASSOU" : "FALHOU"
    });

    // 6. Histórico: leitura e download preservados
    const t6 = await testAsUser(
      userPendingId, 'authenticated',
      `SELECT count(*) FROM public.generated_documents;`
    );
    testCases.push({
      teste: "6. Histórico: leitura SELECT",
      esperado: "PERMITIDO",
      resultado: t6.success ? `PERMITIDO (Total: ${t6.rows[0].count})` : `BLOQUEADO: ${t6.error}`,
      status: t6.success ? "PASSOU" : "FALHOU"
    });

    // 7. Substituição de PDF em pending bloqueada via TRIGGER BEFORE UPDATE
    // Cria um doc de teste diretamente pelo superuser para a empresa pending
    const insDocSuper = await pool.query(`
      INSERT INTO public.generated_documents (company_id, name, generated_file_url)
      VALUES ('${compPendingId}', 'Doc Antigo', 'generated-documents/${compPendingId}/original.pdf')
      RETURNING id;
    `);
    const docOldId = insDocSuper.rows[0].id;

    // Tenta substituir o generated_file_url com o usuário em pending
    const t7 = await testAsUser(
      userPendingId, 'authenticated',
      `UPDATE public.generated_documents SET generated_file_url = 'generated-documents/${compPendingId}/novo_bypass.pdf' WHERE id = '${docOldId}';`
    );
    testCases.push({
      teste: "7. Substituição de generated_file_url em pending",
      esperado: "BLOQUEADO (Trigger 42501)",
      resultado: t7.success ? "PERMITIDO (FALHA)" : `BLOQUEADO: ${t7.error}`,
      status: !t7.success ? "PASSOU" : "FALHOU"
    });

    console.table(testCases);

    const allPassed = testCases.every(c => c.status === "PASSOU");
    if (!allPassed) {
      console.error("\n❌ ALGUNS TESTES FALHARAM!");
      process.exit(1);
    } else {
      console.log("\n✅ TODOS OS TESTES PASSARAM COM SUCESSO NO POSTGRESQL REAL!");
    }

  } finally {
    console.log("\nEncerrando e limpando cluster PostgreSQL temporário...");
    try {
      await pool.end();
    } catch {}
    try {
      await pgServer.stop();
    } catch {}
    if (fs.existsSync(testDataDir)) {
      try {
        fs.rmSync(testDataDir, { recursive: true, force: true });
      } catch {}
    }
  }
}

runTestOnIsolatedPostgres().catch((err) => {
  console.error("ERRO FATAL:", err);
  process.exit(1);
});
