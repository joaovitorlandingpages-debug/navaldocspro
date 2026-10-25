const fs = require('fs');

const ENV = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = ENV.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const ANON_KEY = ENV.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];
const TEST_ENV = fs.readFileSync('.env.test.local', 'utf8');
const EMAIL = TEST_ENV.match(/TEST_USER_EMAIL=(.*)/)[1].trim();
const PASSWORD = TEST_ENV.match(/TEST_USER_PASSWORD=(.*)/)[1].trim();

async function testSelect() {
  const authRes = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  const auth = await authRes.json();
  const token = auth.access_token;
  const uid = auth.user.id;

  // Test select with full_name vs name
  const res1 = await fetch(SUPABASE_URL + `/rest/v1/profiles?id=eq.${uid}&select=company_id,name,email,role`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token }
  });
  console.log('Select with name status:', res1.status, await res1.json());

  const res2 = await fetch(SUPABASE_URL + `/rest/v1/profiles?id=eq.${uid}&select=company_id,full_name,email,role`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token }
  });
  console.log('Select with full_name status:', res2.status, await res2.json());

  // Test rpc can_manage_company_billing
  const res3 = await fetch(SUPABASE_URL + `/rest/v1/rpc/can_manage_company_billing`, {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_user_id: uid, p_company_id: '2bb92b3d-3724-4a21-a384-e21b2b5b7ac3' })
  });
  console.log('RPC can_manage_company_billing status:', res3.status, await res3.json());
}

testSelect().catch(console.error);
