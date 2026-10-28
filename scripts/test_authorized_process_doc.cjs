const fs = require('fs');

async function testAuthorizedProcess() {
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

  console.log('Testando inserção de processo para a empresa autorizada:', companyId);
  const pRes = await fetch(SUPABASE_URL + '/rest/v1/processes', {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      company_id: companyId,
      title: 'Processo Teste Autorizado Homologacao',
      status: 'em_andamento'
    })
  });
  console.log('Process Insert Status:', pRes.status);
  const pBody = await pRes.json();
  console.log('Process Insert Result:', pBody);

  if (pRes.ok && pBody[0]?.id) {
    const procId = pBody[0].id;
    console.log('Processo criado com sucesso! ID:', procId);

    // Testar inserção de generated_documents
    console.log('Testando persistência de generated_documents...');
    const docRes = await fetch(SUPABASE_URL + '/rest/v1/generated_documents', {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        company_id: companyId,
        process_id: procId,
        template_slug: 'req-padrao-cpes',
        title: 'Requerimento Padrão CPES Teste',
        generated_file_url: 'https://fake-storage-url.pdf'
      })
    });
    console.log('Doc Insert Status:', docRes.status);
    console.log('Doc Insert Result:', await docRes.json());
  }
}

testAuthorizedProcess().catch(console.error);
