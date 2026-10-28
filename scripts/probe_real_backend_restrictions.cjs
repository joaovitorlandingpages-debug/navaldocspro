const fs = require('fs');

async function testBackendLiveOperationsUnderPending() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const SUPABASE_URL = envContent.match(/VITE_SUPABASE_URL\s*=\s*"?([^"\r\n]+)"?/)[1].trim();
  const ANON_KEY = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*"?([^"\r\n]+)"?/)[1].trim();
  const testEnv = fs.readFileSync('.env.test.local', 'utf8');
  const EMAIL = testEnv.match(/TEST_USER_EMAIL\s*=\s*(.*)/)[1].trim();
  const PASSWORD = testEnv.match(/TEST_USER_PASSWORD\s*=\s*(.*)/)[1].trim();

  // 1. Autenticação real
  const authRes = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  const auth = await authRes.json();
  const token = auth.access_token;
  const companyId = '2bb92b3d-3724-4a21-a384-e21b2b5b7ac3';

  console.log("=== EXECUÇÃO DE REQUISIÇÕES REAIS CONTRA O BACKEND ===");
  console.log(`Endpoint: ${SUPABASE_URL}`);
  console.log(`Empresa: ${companyId}`);

  // 2. Consulta de clientes existentes da empresa de teste para obter um customer_id válido
  const custRes = await fetch(SUPABASE_URL + '/rest/v1/customers?company_id=eq.' + companyId + '&limit=1', {
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token }
  });
  const customers = await custRes.json();
  const validCustomerId = customers[0]?.id;
  console.log(`Customer existente: ${validCustomerId || 'Nenhum'}`);

  // 3. REQUISIÇÃO REAL: Tentativa de inserção direta na tabela 'processes'
  console.log("\n--- REQUISIÇÃO REAL 1: Inserção direta em /rest/v1/processes ---");
  const procPayload = {
    company_id: companyId,
    customer_id: validCustomerId,
    process_type: "Registro Inicial",
    title: "TESTE REAL RESTRICAO PENDING",
    priority: "normal",
    status: "pending"
  };

  const procRes = await fetch(SUPABASE_URL + '/rest/v1/processes', {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(procPayload)
  });

  console.log(`[HTTP STATUS]: ${procRes.status}`);
  const procBody = await procRes.text();
  console.log(`[RESPOSTA]: ${procBody}`);

  let createdProcessId = null;
  try {
    const parsed = JSON.parse(procBody);
    if (Array.isArray(parsed) && parsed[0]?.id) {
      createdProcessId = parsed[0].id;
    }
  } catch {}

  // 4. REQUISIÇÃO REAL: Tentativa de persistência na tabela 'process_documents' ou 'generated_documents'
  console.log("\n--- REQUISIÇÃO REAL 2: Inserção direta em /rest/v1/generated_documents ---");
  const genDocPayload = {
    company_id: companyId,
    process_id: createdProcessId,
    name: "Documento Teste Pending",
    document_type: "procuracao",
    status: "draft"
  };

  const genDocRes = await fetch(SUPABASE_URL + '/rest/v1/generated_documents', {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(genDocPayload)
  });

  console.log(`[HTTP STATUS]: ${genDocRes.status}`);
  const genDocBody = await genDocRes.text();
  console.log(`[RESPOSTA]: ${genDocBody}`);

  let createdGenDocId = null;
  try {
    const parsed = JSON.parse(genDocBody);
    if (Array.isArray(parsed) && parsed[0]?.id) {
      createdGenDocId = parsed[0].id;
    }
  } catch {}

  // 5. Cleanup se tiver gravado algo para não poluir
  if (createdGenDocId) {
    await fetch(SUPABASE_URL + '/rest/v1/generated_documents?id=eq.' + createdGenDocId, {
      method: 'DELETE',
      headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token }
    });
    console.log(`[CLEANUP] Documento de teste ${createdGenDocId} removido.`);
  }

  if (createdProcessId) {
    await fetch(SUPABASE_URL + '/rest/v1/processes?id=eq.' + createdProcessId, {
      method: 'DELETE',
      headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token }
    });
    console.log(`[CLEANUP] Processo de teste ${createdProcessId} removido.`);
  }
}

testBackendLiveOperationsUnderPending().catch(err => {
  console.error("ERRO:", err);
  process.exit(1);
});
