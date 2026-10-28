const fs = require('fs');

async function testCols() {
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

  const cols = [
    'id', 
    'company_id', 
    'plan_id', 
    'status', 
    'current_period_start', 
    'current_period_end', 
    'trial_ends_at', 
    'metadata', 
    'created_at', 
    'updated_at'
  ];

  console.log("=== VERIFICANDO COLUNAS DE SUBSCRIPTIONS NO BANCO REMOTO ===");
  for (const c of cols) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?select=${c}&limit=1`, {
      headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 200) {
      console.log(`[SUBSCRIPTIONS] Coluna '${c}': EXISTE`);
    } else {
      const body = await res.text();
      console.log(`[SUBSCRIPTIONS] Coluna '${c}': NÃO EXISTE (${res.status}) -> ${body}`);
    }
  }
}

testCols().catch(console.error);
