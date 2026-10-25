const fs = require('fs');
const path = require('path');

const ENV = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = ENV.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const ANON_KEY = ENV.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];

const TEST_ENV = fs.readFileSync('.env.test.local', 'utf8');
const EMAIL = TEST_ENV.match(/TEST_USER_EMAIL=(.*)/)[1].trim();
const PASSWORD = TEST_ENV.match(/TEST_USER_PASSWORD=(.*)/)[1].trim();

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures', 'ocr');

async function testSingleFixture(token, companyId, processId, processDocId, fileName, expected) {
  console.log(`\n======================================================`);
  console.log(`TESTANDO EXTRAÇÃO DE: ${fileName}`);
  console.log(`======================================================`);

  const filePath = path.join(FIXTURES_DIR, fileName);
  const fileBytes = fs.readFileSync(filePath);
  const isPdf = fileName.endsWith('.pdf');
  const storagePath = `${companyId}/${processId}/${Date.now()}_${fileName}`;

  // Upload storage
  const upRes = await fetch(`${SUPABASE_URL}/storage/v1/object/process-document-uploads/${storagePath}`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': isPdf ? 'application/pdf' : 'image/png'
    },
    body: fileBytes
  });

  if (upRes.status >= 300) {
    throw new Error(`Falha no upload (${upRes.status}): ${await upRes.text()}`);
  }

  // Insert DB
  const insRes = await fetch(`${SUPABASE_URL}/rest/v1/process_document_uploads`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      process_document_id: processDocId,
      process_id: processId,
      company_id: companyId,
      file_url: storagePath,
      file_name: fileName,
      file_type: isPdf ? 'application/pdf' : 'image/png',
      ocr_status: 'pendente'
    })
  });
  const insJson = await insRes.json();
  const uploadId = insJson[0]?.id;

  // Execute OCR
  const ocrRes = await fetch(`${SUPABASE_URL}/functions/v1/process-document-ocr`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ uploadId })
  });

  const ocrJson = await ocrRes.json();
  console.log('HTTP Status:', ocrRes.status);
  console.log('Tipo Detectado:', ocrJson.document_type);
  console.log('Campos Extraídos pela IA:');
  console.dir(ocrJson.fields, { depth: null });

  return { fileName, status: ocrRes.status, type: ocrJson.document_type, fields: ocrJson.fields, expected };
}

async function run() {
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  const authJson = await authRes.json();
  const token = authJson.access_token;

  const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${authJson.user.id}&select=*`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${token}` }
  });
  const profJson = await profRes.json();
  const companyId = profJson[0]?.company_id;

  let procRes = await fetch(`${SUPABASE_URL}/rest/v1/processes?company_id=eq.${companyId}&select=id&limit=1`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${token}` }
  });
  let procJson = await procRes.json();
  let processId = procJson[0]?.id;

  let pDocRes = await fetch(`${SUPABASE_URL}/rest/v1/process_documents?process_id=eq.${processId}&select=id&limit=1`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${token}` }
  });
  let pDocJson = await pDocRes.json();
  let processDocId = pDocJson[0]?.id;

  const results = [];

  // A. Identificação legível
  results.push(await testSingleFixture(token, companyId, processId, processDocId, 'identificacao_legivel.pdf', {
    name: 'CARLOS EDUARDO DA SILVA TESTE',
    cpf: '123.456.789-00',
    rg: '28.456.789-0',
    birth_date: '15/08/1985'
  }));

  // B. Comprovante de endereço
  results.push(await testSingleFixture(token, companyId, processId, processDocId, 'comprovante_endereco_legivel.pdf', {
    address: 'AV ATLANTICA, 1500 - APTO 42',
    city: 'SANTOS',
    state: 'SP',
    zip_code: '11065-001'
  }));

  // C. Documento de embarcação
  results.push(await testSingleFixture(token, companyId, processId, processDocId, 'documento_embarcacao_legivel.pdf', {
    vessel_name: 'ESTRELA DO MAR II',
    registration_number: '038-0012345-6',
    vessel_type: 'LANCHA',
    length: '8.50',
    beam: '2.60',
    depth: '1.20',
    construction_year: '2021',
    hull_material: 'FIBRA DE VIDRO',
    engine_power: '250 HP'
  }));

  // D. Imagem ilegível
  results.push(await testSingleFixture(token, companyId, processId, processDocId, 'imagem_ilegivel.png', {
    shouldBeEmpty: true
  }));

  // E. Documento incompatível
  results.push(await testSingleFixture(token, companyId, processId, processDocId, 'documento_incompativel.pdf', {
    shouldBeOther: true
  }));

  fs.writeFileSync('tests/e2e/evidence/ocr_cloud_extraction_results.json', JSON.stringify(results, null, 2));
  console.log('\nResultados gravados em tests/e2e/evidence/ocr_cloud_extraction_results.json');
}

run().catch(console.error);
