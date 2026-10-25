const fs = require('fs');
const https = require('https');
const path = require('path');

const ENV = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = ENV.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const ANON_KEY = ENV.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];

const TEST_ENV = fs.readFileSync('.env.test.local', 'utf8');
const EMAIL = TEST_ENV.match(/TEST_USER_EMAIL=(.*)/)[1].trim();
const PASSWORD = TEST_ENV.match(/TEST_USER_PASSWORD=(.*)/)[1].trim();

async function runTest() {
  console.log('1. Autenticando com usuário de teste:', EMAIL);
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  const authJson = await authRes.json();
  const token = authJson.access_token;
  console.log('Token obtido com sucesso!');

  // Obter perfil e empresa do usuário
  const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${authJson.user.id}&select=*`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${token}` }
  });
  const profJson = await profRes.json();
  const companyId = profJson[0]?.company_id;
  console.log('Company ID:', companyId);

  // Obter ou criar um processo aberto para teste
  let procRes = await fetch(`${SUPABASE_URL}/rest/v1/processes?company_id=eq.${companyId}&select=id&limit=1`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${token}` }
  });
  let procJson = await procRes.json();
  let processId = procJson[0]?.id;

  if (!processId) {
    console.log('Criando processo temporário para teste...');
    const newProc = await fetch(`${SUPABASE_URL}/rest/v1/processes`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        company_id: companyId,
        title: 'Processo Teste OCR IA',
        status: 'em_andamento'
      })
    });
    const createdProc = await newProc.json();
    processId = createdProc[0]?.id;
  }
  console.log('Process ID:', processId);

  // Upload do PDF identificacao_legivel.pdf para o bucket process-document-uploads
  const filePath = path.join(__dirname, '..', 'fixtures', 'ocr', 'identificacao_legivel.pdf');
  const fileBytes = fs.readFileSync(filePath);
  const storagePath = `${companyId}/${processId}/test_ocr_${Date.now()}.pdf`;

  console.log('Fazendo upload de identificacao_legivel.pdf para storage...');
  const upRes = await fetch(`${SUPABASE_URL}/storage/v1/object/process-document-uploads/${storagePath}`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/pdf'
    },
    body: fileBytes
  });
  console.log('Upload status:', upRes.status);

  // Obter um template_id existente ou inserir process_document com company_id
  let tmplRes = await fetch(`${SUPABASE_URL}/rest/v1/document_templates?select=id&limit=1`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${token}` }
  });
  let tmplJson = await tmplRes.json();
  let templateId = tmplJson[0]?.id;
  console.log('Template ID:', templateId);

  let pDocRes = await fetch(`${SUPABASE_URL}/rest/v1/process_documents?process_id=eq.${processId}&select=id&limit=1`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${token}` }
  });
  let pDocJson = await pDocRes.json();
  let processDocId = pDocJson[0]?.id;

  if (!processDocId) {
    console.log('Criando process_document para o processo...');
    const newPDoc = await fetch(`${SUPABASE_URL}/rest/v1/process_documents`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        process_id: processId,
        company_id: companyId,
        template_id: templateId || null,
        status: 'pendente'
      })
    });
    const createdPDoc = await newPDoc.json();
    console.log('createdPDoc:', createdPDoc);
    processDocId = Array.isArray(createdPDoc) ? createdPDoc[0]?.id : createdPDoc?.id;
  }
  console.log('Process Document ID:', processDocId);

  // Inserir registro em process_document_uploads
  console.log('Inserindo registro em process_document_uploads...');
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
      file_name: 'identificacao_legivel.pdf',
      file_type: 'application/pdf',
      ocr_status: 'pendente'
    })
  });
  const insJson = await insRes.json();
  console.log('Resultado da inserção:', insJson);
  const uploadId = Array.isArray(insJson) ? insJson[0]?.id : insJson?.id;
  console.log('Upload ID gerado:', uploadId);

  // Disparar Edge Function process-document-ocr
  console.log('Disparando process-document-ocr na nuvem...');
  const ocrRes = await fetch(`${SUPABASE_URL}/functions/v1/process-document-ocr`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ uploadId })
  });

  const ocrStatus = ocrRes.status;
  const ocrBody = await ocrRes.text();
  console.log('Resultado process-document-ocr:', ocrStatus);
  console.log('Corpo da resposta:', ocrBody);
}

runTest().catch(console.error);
