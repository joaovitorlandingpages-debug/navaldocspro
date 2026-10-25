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

  const r = await fetch(SUPABASE_URL + '/rest/v1/?apikey=' + ANON_KEY, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const spec = await r.json();
  const allPaths = Object.keys(spec.paths || {});
  console.log('Authenticated total paths:', allPaths.length);
  const rpcs = allPaths.filter(p => p.startsWith('/rpc/'));
  console.log('RPCs exposed to authenticated user:', rpcs);
}
run();
