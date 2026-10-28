const fs = require('fs');

async function testDirectVesselInsert() {
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

  // Obter um customer_id válido da empresa
  const custRes = await fetch(SUPABASE_URL + `/rest/v1/customers?company_id=eq.${companyId}&limit=1`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token }
  });
  const custs = await custRes.json();
  const customerId = custs[0]?.id;
  console.log('Customer id:', customerId);

  // Inserir embarcação com casco 00987654321
  const payload = {
    company_id: companyId,
    customer_id: customerId,
    name: 'ESTRELA DO MAR II - TESTE CASCO',
    category: 'Embarcações de esporte e recreio',
    registration_number: '038-0012345-6',
    hull_number: '00987654321',
  };

  const insertRes = await fetch(SUPABASE_URL + '/rest/v1/vessels', {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  console.log('Insert status:', insertRes.status);
  const inserted = await insertRes.json();
  console.log('Inserted vessel:', inserted);

  // Consulta após inserção (simulando F5 na consulta)
  const qRes = await fetch(SUPABASE_URL + `/rest/v1/vessels?id=eq.${inserted[0].id}`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token }
  });
  const queried = await qRes.json();
  console.log('--- COMPROVAÇÃO DE PERSISTÊNCIA APÓS SALVAR + F5 ---');
  console.log('Valor no banco após query:', queried[0].hull_number);
  console.log('Tipo de dado:', typeof queried[0].hull_number);
  console.log('Zeros à esquerda preservados?', queried[0].hull_number === '00987654321');
}

testDirectVesselInsert().catch(console.error);
