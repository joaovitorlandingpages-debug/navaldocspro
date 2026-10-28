const fs = require('fs');

async function findVesselsInAnyCompany() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const SUPABASE_URL = envContent.match(/VITE_SUPABASE_URL\s*=\s*"?([^"\r\n]+)"?/)[1].trim();
  const ANON_KEY = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*"?([^"\r\n]+)"?/)[1].trim();
  const testEnv = fs.readFileSync('.env.test.local', 'utf8');
  const EMAIL = testEnv.match(/TEST_USER_EMAIL\s*=\s*(.*)/)[1].trim();
  const PASSWORD = testEnv.match(/TEST_USER_PASSWORD\s*=\s*(.*)/)[1].trim();

  // Buscar empresas cadastradas no sistema
  const res = await fetch(SUPABASE_URL + '/rest/v1/companies?select=id,name,created_at&order=created_at.desc&limit=10', {
    headers: { 'apikey': ANON_KEY }
  });
  console.log('Companies status:', res.status, await res.json());

  // Buscar embarcações com anon key (se RLS permitir) ou autenticado
  const authRes = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  const auth = await authRes.json();
  const token = auth.access_token;

  const vRes = await fetch(SUPABASE_URL + '/rest/v1/vessels?select=id,name,registration_number,hull_number,company_id,created_at', {
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token }
  });
  console.log('Vessels:', await vRes.json());
}

findVesselsInAnyCompany().catch(console.error);
