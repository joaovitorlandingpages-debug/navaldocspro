const fs = require('fs');

async function run() {
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

  // 1. Inserção real no generated_documents com colunas reais
  const res = await fetch(SUPABASE_URL + '/rest/v1/generated_documents', {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      company_id: companyId,
      name: 'Documento Teste Real Pending',
      status: 'ready_for_signature'
    })
  });

  console.log('HTTP STATUS generated_documents:', res.status);
  const text = await res.text();
  console.log('RESPOSTA:', text);

  try {
    const parsed = JSON.parse(text);
    if (parsed[0]?.id) {
      await fetch(SUPABASE_URL + '/rest/v1/generated_documents?id=eq.' + parsed[0].id, {
        method: 'DELETE',
        headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token }
      });
      console.log('Cleanup efetuado com sucesso.');
    }
  } catch(e) {}
}

run().catch(console.error);
