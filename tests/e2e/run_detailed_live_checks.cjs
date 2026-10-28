const fs = require('fs');

const ENV = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = ENV.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const ANON_KEY = ENV.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];
const TEST_ENV = fs.readFileSync('.env.test.local', 'utf8');
const EMAIL = TEST_ENV.match(/TEST_USER_EMAIL=(.*)/)[1].trim();
const PASSWORD = TEST_ENV.match(/TEST_USER_PASSWORD=(.*)/)[1].trim();

async function runDetailedCheck() {
  const timestamp = new Date().toISOString();
  console.log('TIMESTAMP DE EXECUÇÃO:', timestamp);

  const authRes = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  const auth = await authRes.json();
  const token = auth.access_token;
  const uid = auth.user.id;
  const companyId = '2bb92b3d-3724-4a21-a384-e21b2b5b7ac3';
  const otherCompanyId = '00000000-0000-0000-0000-000000000000';
  const otherUserId = '11111111-1111-1111-1111-111111111111';

  console.log('\n=============================================================');
  console.log('1. TESTE DA RPC can_manage_company_billing');
  console.log('=============================================================');

  // 1.a Gestor da própria empresa
  const r1 = await fetch(SUPABASE_URL + '/rest/v1/rpc/can_manage_company_billing', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_user_id: uid, p_company_id: companyId })
  });
  const t1 = await r1.text();
  console.log('1.a Gestor da própria empresa (Status ' + r1.status + '):', t1);

  // 1.b Consulta para outra empresa
  const r2 = await fetch(SUPABASE_URL + '/rest/v1/rpc/can_manage_company_billing', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_user_id: uid, p_company_id: otherCompanyId })
  });
  const t2 = await r2.text();
  console.log('1.b Gestor para outra empresa (Status ' + r2.status + '):', t2);

  // 1.c Impersonation (tentativa de consultar em nome de outro usuário)
  const r3 = await fetch(SUPABASE_URL + '/rest/v1/rpc/can_manage_company_billing', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_user_id: otherUserId, p_company_id: companyId })
  });
  const t3 = await r3.text();
  console.log('1.c Impersonation (outro p_user_id) (Status ' + r3.status + '):', t3);

  console.log('\n=============================================================');
  console.log('2. TESTE DA EDGE FUNCTION process-ocr-document');
  console.log('=============================================================');
  const ocrRes = await fetch(SUPABASE_URL + '/functions/v1/process-ocr-document', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: true })
  });
  console.log('Status HTTP:', ocrRes.status, 'Response:', await ocrRes.text());

  console.log('\n=============================================================');
  console.log('3. TESTE DA EDGE FUNCTION stripe-checkout');
  console.log('=============================================================');
  const checkRes = await fetch(SUPABASE_URL + '/functions/v1/stripe-checkout', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ planSlug: 'profissional', billingCycle: 'monthly' })
  });
  console.log('Status HTTP:', checkRes.status, 'Response:', await checkRes.text());

  console.log('\n=============================================================');
  console.log('4. TESTE DA EDGE FUNCTION stripe-portal');
  console.log('=============================================================');
  const portalRes = await fetch(SUPABASE_URL + '/functions/v1/stripe-portal', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnUrl: 'https://navaldocspro.lovable.app/configuracoes' })
  });
  console.log('Status HTTP:', portalRes.status, 'Response:', await portalRes.text());
}

runDetailedCheck().catch(console.error);
