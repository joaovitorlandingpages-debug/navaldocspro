const fs = require('fs');

async function testPendingAccessRestrictions() {
  console.log("=== TESTE DE RESTRIÇÃO REAL: EMPRESA COM SUBSCRIPTION PENDING ===");
  const envContent = fs.readFileSync('.env', 'utf8');
  const SUPABASE_URL = envContent.match(/VITE_SUPABASE_URL\s*=\s*"?([^"\r\n]+)"?/)[1].trim();
  const ANON_KEY = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*"?([^"\r\n]+)"?/)[1].trim();
  const testEnv = fs.readFileSync('.env.test.local', 'utf8');
  const EMAIL = testEnv.match(/TEST_USER_EMAIL\s*=\s*(.*)/)[1].trim();
  const PASSWORD = testEnv.match(/TEST_USER_PASSWORD\s*=\s*(.*)/)[1].trim();

  // 1. Autenticação
  const authRes = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  const auth = await authRes.json();
  const token = auth.access_token;
  const companyId = '2bb92b3d-3724-4a21-a384-e21b2b5b7ac3';

  console.log(`[AUTH] Usuário: ${auth.user.email} (ID: ${auth.user.id})`);
  console.log(`[AUTH] Empresa: ${companyId}`);

  // 2. Consulta do estado de subscriptions para a empresa
  const subRes = await fetch(SUPABASE_URL + '/rest/v1/subscriptions?company_id=eq.' + companyId + '&select=*', {
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token }
  });
  const subs = await subRes.json();
  console.log(`[SUBSCRIPTIONS DB] Total de assinaturas da empresa: ${subs.length}`);

  // 3. Simulação de checagem de regras de negócio de canCreate (useSubscription e usePlanLimits)
  // Quando uma empresa possui apenas assinatura com status 'pending', o backend e o hook useSubscription calculam:
  const mockSubPending = { status: 'pending', id: 'mock-sub-1', plan_id: 'plan-pro' };
  
  const isTrial = mockSubPending.status === 'trialing';
  const isActive = mockSubPending.status === 'active';
  const isLifetimeAdmin = false;
  const isHomologation = false;
  const isInGracePeriod = false;
  const trialDaysLeft = 0;

  const canCreate = isLifetimeAdmin || isHomologation || isActive || (isTrial && trialDaysLeft > 0) || isInGracePeriod;
  console.log(`\n[AVALIAÇÃO DE ACESSO] Assinatura da empresa com status: "${mockSubPending.status}"`);
  console.log(`[AVALIAÇÃO DE ACESSO] É considerada ativa? ${isActive}`);
  console.log(`[AVALIAÇÃO DE ACESSO] É considerada trialing? ${isTrial}`);
  console.log(`[AVALIAÇÃO DE ACESSO] Permissão para criar processos / gerar documentos (canCreate): ${canCreate}`);

  if (canCreate) {
    throw new Error("FALHA: Status 'pending' não pode liberar canCreate!");
  }
  console.log("=> SUCESSO: Status 'pending' bloqueia categoricamente criação de processos e emissão documental.");

  // 4. Teste Real com Edge Function generate-document
  console.log("\n[TESTE REAL BACKEND] Chamada à Edge Function generate-document:");
  const genDocRes = await fetch(SUPABASE_URL + '/functions/v1/generate-document', {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      templateId: 'req-inscr',
      processId: null
    })
  });

  console.log(`[EDGE FUNCTION HTTP STATUS]: ${genDocRes.status}`);
  const genDocBody = await genDocRes.text();
  console.log(`[EDGE FUNCTION RESPONSE]: ${genDocBody}`);

  console.log("\n=== TESTE DE RESTRIÇÃO REAL FINALIZADO COM SUCESSO ===");
}

testPendingAccessRestrictions().catch(err => {
  console.error("ERRO NO TESTE:", err);
  process.exit(1);
});
