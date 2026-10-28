const fs = require('fs');

async function testAuthMatrix() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const urlMatch = envContent.match(/VITE_SUPABASE_URL\s*=\s*"?([^"\r\n]+)"?/);
  const keyMatch = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*"?([^"\r\n]+)"?/);
  const SUPABASE_URL = urlMatch[1].trim();
  const ANON_KEY = keyMatch[1].trim();

  const testEnv = fs.readFileSync('.env.test.local', 'utf8');
  const EMAIL = testEnv.match(/TEST_USER_EMAIL\s*=\s*(.*)/)[1].trim();
  const PASSWORD = testEnv.match(/TEST_USER_PASSWORD\s*=\s*(.*)/)[1].trim();

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

  async function callRpc(p_user, p_comp) {
    const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/can_manage_company_billing', {
      method: 'POST',
      headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_user_id: p_user, p_company_id: p_comp })
    });
    const ray = res.headers.get('sb-gateway-request-id') || res.headers.get('cf-ray');
    const body = await res.text();
    return { status: res.status, ray, body };
  }

  console.log('1. Gestor da própria empresa:', await callRpc(uid, companyId));
  console.log('2. Outra empresa (cross-tenant):', await callRpc(uid, otherCompanyId));
  console.log('3. Impersonation (outro usuário):', await callRpc(otherUserId, companyId));
}

testAuthMatrix().catch(console.error);
