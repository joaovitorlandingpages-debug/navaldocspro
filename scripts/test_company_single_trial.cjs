const fs = require('fs');

async function testCompanySingle() {
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

  const res = await fetch(SUPABASE_URL + `/rest/v1/companies?id=eq.${companyId}&select=id,name,cnpj,email,trial_ends_at`, {
    method: 'GET',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.pgrst.object+json'
    }
  });
  console.log('Single Company Status:', res.status);
  console.log('Single Company Body:', await res.text());
}

testCompanySingle().catch(console.error);
