const fs = require('fs');

const ENV = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = ENV.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const ANON_KEY = ENV.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];
const TEST_ENV = fs.readFileSync('.env.test.local', 'utf8');
const EMAIL = TEST_ENV.match(/TEST_USER_EMAIL=(.*)/)[1].trim();
const PASSWORD = TEST_ENV.match(/TEST_USER_PASSWORD=(.*)/)[1].trim();

async function run() {
  const authRes = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  const auth = await authRes.json();
  const token = auth.access_token;

  const res = await fetch(SUPABASE_URL + '/rest/v1/plans?select=*', {
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token }
  });
  const plans = await res.json();
  console.log('TOTAL PLANS IN DB:', Array.isArray(plans) ? plans.length : 'error');
  console.log(JSON.stringify(plans, null, 2));
}
run().catch(console.error);
