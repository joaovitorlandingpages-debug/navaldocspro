const fs = require('fs');
const ENV = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = ENV.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const ANON_KEY = ENV.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];
const TEST_ENV = fs.readFileSync('.env.test.local', 'utf8');
const EMAIL = TEST_ENV.match(/TEST_USER_EMAIL=(.*)/)[1].trim();
const PASSWORD = TEST_ENV.match(/TEST_USER_PASSWORD=(.*)/)[1].trim();

async function testCurrentBackend() {
  const authRes = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  const auth = await authRes.json();
  const token = auth.access_token;
  const uid = auth.user.id;
  const companyId = '2bb92b3d-3724-4a21-a384-e21b2b5b7ac3';

  console.log('--- 1. Testando RPC can_manage_company_billing ---');
  const rpcRes = await fetch(SUPABASE_URL + '/rest/v1/rpc/can_manage_company_billing', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_user_id: uid, p_company_id: companyId })
  });
  console.log('RPC Status:', rpcRes.status, await rpcRes.text());

  console.log('--- 2. Testando process-ocr-document ---');
  const ocrRes = await fetch(SUPABASE_URL + '/functions/v1/process-ocr-document', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: true })
  });
  console.log('OCR Status:', ocrRes.status, await ocrRes.text());

  console.log('--- 3. Testando stripe-checkout ---');
  const checkRes = await fetch(SUPABASE_URL + '/functions/v1/stripe-checkout', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ planSlug: 'profissional', billingCycle: 'monthly' })
  });
  console.log('Checkout Status:', checkRes.status, await checkRes.text());

  console.log('--- 4. Testando stripe-portal ---');
  const portalRes = await fetch(SUPABASE_URL + '/functions/v1/stripe-portal', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnUrl: 'http://localhost:5173/configuracoes' })
  });
  console.log('Portal Status:', portalRes.status, await portalRes.text());
}

testCurrentBackend().catch(console.error);
