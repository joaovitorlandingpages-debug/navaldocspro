const fs = require('fs');

async function testStorageUpsert() {
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

  const path = `${companyId}/test-upsert/doc_upsert.pdf`;
  const pdf1 = Buffer.from('%PDF-1.4 primeira versao');
  const pdf2 = Buffer.from('%PDF-1.4 segunda versao sobrescrevendo');

  // 1. Upload inicial (POST)
  const up1 = await fetch(`${SUPABASE_URL}/storage/v1/object/generated-documents/${path}`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/pdf',
      'x-upsert': 'true'
    },
    body: pdf1
  });
  console.log(`[STORAGE POST 1 STATUS]: ${up1.status}`);

  // 2. Sobrescrita com upsert=true (POST)
  const up2 = await fetch(`${SUPABASE_URL}/storage/v1/object/generated-documents/${path}`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/pdf',
      'x-upsert': 'true'
    },
    body: pdf2
  });
  console.log(`[STORAGE POST 2 (UPSERT) STATUS]: ${up2.status}`);

  // 3. Tentativa com PUT direto (update do objeto no storage)
  const upPut = await fetch(`${SUPABASE_URL}/storage/v1/object/generated-documents/${path}`, {
    method: 'PUT',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/pdf'
    },
    body: pdf2
  });
  console.log(`[STORAGE PUT (UPDATE) STATUS]: ${upPut.status}`);

  // 4. Cleanup
  const del = await fetch(`${SUPABASE_URL}/storage/v1/object/generated-documents`, {
    method: 'DELETE',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prefixes: [path] })
  });
  console.log(`[STORAGE DELETE STATUS]: ${del.status}`);
}

testStorageUpsert().catch(console.error);
