const fs = require('fs');

async function testCompanyColumns() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const SUPABASE_URL = envContent.match(/VITE_SUPABASE_URL\s*=\s*"?([^"\r\n]+)"?/)[1].trim();
  const ANON_KEY = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*"?([^"\r\n]+)"?/)[1].trim();
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
  const companyId = '2bb92b3d-3724-4a21-a384-e21b2b5b7ac3';

  // Teste query como o stripe-checkout faz:
  // .select('id, name, cnpj, email, stripe_customer_id, trial_ends_at')
  const q1 = await fetch(SUPABASE_URL + '/rest/v1/companies?id=eq.' + companyId + '&select=id,name,cnpj,email,name', {
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token }
  });
  console.log('q1 status:', q1.status, await q1.text());

  const q2 = await fetch(SUPABASE_URL + '/rest/v1/companies?id=eq.' + companyId + '&select=*', {
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token }
  });
  const compData = await q2.json();
  console.log('Available columns in companies:', Object.keys(compData[0] || {}));
}

testCompanyColumns().catch(console.error);
