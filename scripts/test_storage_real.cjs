const fs = require('fs');

async function testStorageUpload() {
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

  const dummyPdfContent = Buffer.from('%PDF-1.4 test dummy pdf content');
  const path = `${companyId}/test-probe/documento_teste.pdf`;

  const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/generated-documents/${path}`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/pdf',
      'x-upsert': 'true'
    },
    body: dummyPdfContent
  });

  console.log(`[STORAGE UPLOAD STATUS]: ${uploadRes.status}`);
  const resText = await uploadRes.text();
  console.log(`[STORAGE UPLOAD RESPOSTA]: ${resText}`);

  if (uploadRes.status === 200 || uploadRes.status === 201) {
    // Cleanup
    await fetch(`${SUPABASE_URL}/storage/v1/object/generated-documents`, {
      method: 'DELETE',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prefixes: [path] })
    });
    console.log('[CLEANUP] Arquivo storage removido.');
  }
}

testStorageUpload().catch(console.error);
