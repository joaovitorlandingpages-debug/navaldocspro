const fs = require('fs');

async function verifyEndpoints() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const urlMatch = envContent.match(/VITE_SUPABASE_URL\s*=\s*"?([^"\r\n]+)"?/);
  const keyMatch = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*"?([^"\r\n]+)"?/);

  const SUPABASE_URL = urlMatch ? urlMatch[1].trim() : null;
  const ANON_KEY = keyMatch ? keyMatch[1].trim() : null;

  const testEnv = fs.readFileSync('.env.test.local', 'utf8');
  const emailMatch = testEnv.match(/TEST_USER_EMAIL\s*=\s*(.*)/);
  const passMatch = testEnv.match(/TEST_USER_PASSWORD\s*=\s*(.*)/);

  const EMAIL = emailMatch ? emailMatch[1].trim() : null;
  const PASSWORD = passMatch ? passMatch[1].trim() : null;

  console.log('--- CONFIGURAÇÃO DE AMBIENTE ---');
  console.log('Endpoint Base Configurado:', SUPABASE_URL);
  console.log('Correspondência do ID vqutxzdsajinhsvuddcp:', SUPABASE_URL.includes('vqutxzdsajinhsvuddcp'));

  const authStart = new Date().toISOString();
  const authRes = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });

  const authSbRay = authRes.headers.get('sb-gateway-request-id') || authRes.headers.get('cf-ray') || authRes.headers.get('x-request-id');
  const authData = await authRes.json();
  const token = authData.access_token;
  const userId = authData.user?.id;
  const companyId = '2bb92b3d-3724-4a21-a384-e21b2b5b7ac3';

  console.log('\n--- 1. VERIFICAÇÃO AUTENTICADA DA RPC can_manage_company_billing ---');
  const rpcUrl = SUPABASE_URL + '/rest/v1/rpc/can_manage_company_billing';
  const rpcTime = new Date().toISOString();

  // Teste 1: com parâmetros p_user_id e p_company_id
  const rpcRes = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_user_id: userId,
      p_company_id: companyId
    })
  });

  const rpcRay = rpcRes.headers.get('sb-gateway-request-id') || rpcRes.headers.get('cf-ray') || rpcRes.headers.get('x-request-id');
  const rpcBody = await rpcRes.text();

  console.log('Horário:', rpcTime);
  console.log('Endpoint:', rpcUrl);
  console.log('Status HTTP:', rpcRes.status, rpcRes.statusText);
  console.log('Request ID / Ray:', rpcRay);
  console.log('Corpo da Resposta:', rpcBody);

  console.log('\n--- 2. VERIFICAÇÃO AUTENTICADA DE process-ocr-document ---');
  const ocrUrl = SUPABASE_URL + '/functions/v1/process-ocr-document';
  const ocrTime = new Date().toISOString();

  const ocrRes = await fetch(ocrUrl, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fileBase64: 'JVBERi0xLjQKJcTl8uXrCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovS2lkcyBbMyAwIFJdCi9Db3VudCAxCj4+CmVuZG9iagoxIDAgb2JqCjw8Ci9UeXBlIC9DYXRhbG9nCj4+CmVuZG9iago=',
      documentType: 'identificacao',
      fileName: 'identificacao_teste.pdf'
    })
  });

  const ocrRay = ocrRes.headers.get('sb-gateway-request-id') || ocrRes.headers.get('cf-ray') || ocrRes.headers.get('x-request-id');
  const ocrBody = await ocrRes.text();

  console.log('Horário:', ocrTime);
  console.log('Endpoint:', ocrUrl);
  console.log('Status HTTP:', ocrRes.status, ocrRes.statusText);
  console.log('Request ID / Ray:', ocrRay);
  console.log('Corpo da Resposta:', ocrBody);
}

verifyEndpoints().catch(err => console.error('Erro na execução:', err));
