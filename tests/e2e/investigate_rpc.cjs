const fs = require('fs');

const ENV = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = ENV.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const ANON_KEY = ENV.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];
const TEST_ENV = fs.readFileSync('.env.test.local', 'utf8');
const EMAIL = TEST_ENV.match(/TEST_USER_EMAIL=(.*)/)[1].trim();
const PASSWORD = TEST_ENV.match(/TEST_USER_PASSWORD=(.*)/)[1].trim();

async function testRpcs() {
  const authRes = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  const auth = await authRes.json();
  const token = auth.access_token;
  const uid = auth.user.id;
  const companyId = '2bb92b3d-3724-4a21-a384-e21b2b5b7ac3';

  console.log('Testing RPC variations for can_manage_company_billing:');

  // Attempt 1: p_user_id, p_company_id
  const r1 = await fetch(SUPABASE_URL + '/rest/v1/rpc/can_manage_company_billing', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_user_id: uid, p_company_id: companyId })
  });
  console.log('r1 (p_user_id, p_company_id):', r1.status, await r1.text());

  // Attempt 2: user_id, company_id
  const r2 = await fetch(SUPABASE_URL + '/rest/v1/rpc/can_manage_company_billing', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: uid, company_id: companyId })
  });
  console.log('r2 (user_id, company_id):', r2.status, await r2.text());

  // Check if function exists in pg_proc via postgrest OpenAPI / swagger spec
  const openapiRes = await fetch(SUPABASE_URL + '/rest/v1/?apikey=' + ANON_KEY);
  const spec = await openapiRes.json();
  const rpcKeys = Object.keys(spec.paths || {}).filter(p => p.includes('can_manage') || p.includes('billing'));
  console.log('Relevant RPC endpoints in schema cache:', rpcKeys);
}

testRpcs().catch(console.error);
