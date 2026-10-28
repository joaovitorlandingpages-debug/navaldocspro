const fs = require('fs');

async function inspectSubscriptionsSchema() {
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

  // Busca todos os registros de subscriptions (ou tenta OPTIONS para ver headers)
  const optRes = await fetch(SUPABASE_URL + '/rest/v1/subscriptions', {
    method: 'OPTIONS',
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token }
  });
  console.log('OPTIONS status:', optRes.status);

  // Tenta select * limit 1
  const selRes = await fetch(SUPABASE_URL + '/rest/v1/subscriptions?select=*&limit=1', {
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token }
  });
  console.log('Select status:', selRes.status);
  const data = await selRes.json();
  console.log('Data:', data);

  // Testar se colunas específicas existem:
  const cols = ['id', 'company_id', 'status', 'plan_id', 'stripe_customer_id', 'stripe_subscription_id', 'metadata'];
  for (const c of cols) {
    const r = await fetch(SUPABASE_URL + '/rest/v1/subscriptions?select=' + c + '&limit=1', {
      headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token }
    });
    console.log(`Column ${c}: status ${r.status}`);
  }
}

inspectSubscriptionsSchema().catch(console.error);
