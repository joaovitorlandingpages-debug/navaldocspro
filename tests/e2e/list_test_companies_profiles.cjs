const fs = require('fs');

async function checkCompaniesAndUsers() {
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

  // Buscar todas as empresas acessíveis
  const compRes = await fetch(SUPABASE_URL + '/rest/v1/companies?select=id,name', {
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token }
  });
  console.log('Empresas:', await compRes.json());

  // Buscar profiles
  const profRes = await fetch(SUPABASE_URL + '/rest/v1/profiles?select=id,name,role,company_id', {
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token }
  });
  console.log('Profiles:', await profRes.json());
}

checkCompaniesAndUsers().catch(console.error);
