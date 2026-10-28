const fs = require('fs');

async function testUpdateGeneratedDoc() {
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

  // 1. Cria um doc temporário (atual bypass)
  const ins = await fetch(SUPABASE_URL + '/rest/v1/generated_documents', {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      company_id: companyId,
      name: 'Documento Teste Update',
      status: 'ready_for_signature',
      generated_file_url: 'generated-documents/2bb92b3d-3724-4a21-a384-e21b2b5b7ac3/original.pdf'
    })
  });
  const insDoc = await ins.json();
  const docId = insDoc[0]?.id;
  console.log(`[CREATE DOC]: ID = ${docId}`);

  if (docId) {
    // 2. Tenta UPDATE substituindo o generated_file_url
    const upd = await fetch(`${SUPABASE_URL}/rest/v1/generated_documents?id=eq.${docId}`, {
      method: 'PATCH',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        generated_file_url: 'generated-documents/2bb92b3d-3724-4a21-a384-e21b2b5b7ac3/novo_bypass.pdf'
      })
    });
    console.log(`[UPDATE STATUS]: ${upd.status}`);
    const updText = await upd.text();
    console.log(`[UPDATE RESPOSTA]: ${updText}`);

    // Cleanup
    await fetch(`${SUPABASE_URL}/rest/v1/generated_documents?id=eq.${docId}`, {
      method: 'DELETE',
      headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${token}` }
    });
    console.log(`[CLEANUP] Documento ${docId} removido.`);
  }
}

testUpdateGeneratedDoc().catch(console.error);
