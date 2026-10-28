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

  const res = await fetch(SUPABASE_URL + '/rest/v1/process_documents?limit=1', {
    method: 'OPTIONS',
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token }
  });
  console.log('OPTIONS Status:', res.status);
  console.log('Allow:', res.headers.get('allow'));

  // Tenta inserir um registro vazio para ver os campos obrigatórios
  const tryIns = await fetch(SUPABASE_URL + '/rest/v1/process_documents', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  console.log('TryIns Status:', tryIns.status);
  console.log('TryIns Body:', await tryIns.text());
}
run();
