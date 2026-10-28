const fs = require('fs');
const https = require('https');

const ENV = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = ENV.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const ANON_KEY = ENV.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];

const TEST_ENV = fs.readFileSync('.env.test.local', 'utf8');
const EMAIL = TEST_ENV.match(/TEST_USER_EMAIL=(.*)/)[1].trim();
const PASSWORD = TEST_ENV.match(/TEST_USER_PASSWORD=(.*)/)[1].trim();

const data = JSON.stringify({ email: EMAIL, password: PASSWORD });
const req = https.request(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
  method: 'POST',
  headers: {
    'apikey': ANON_KEY,
    'Content-Type': 'application/json'
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const json = JSON.parse(body);
    const token = json.access_token;
    
    // Test invoking process-document-ocr
    const invReq = https.request(SUPABASE_URL + '/functions/v1/process-document-ocr', {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    }, invRes => {
      let invBody = '';
      invRes.on('data', d => invBody += d);
      invRes.on('end', () => {
        console.log('process-document-ocr Status:', invRes.statusCode);
        console.log('sb-error-code:', invRes.headers['sb-error-code']);
        console.log('Body:', invBody);
      });
    });
    invReq.write(JSON.stringify({ uploadId: '00000000-0000-0000-0000-000000000000' }));
    invReq.end();
  });
});
req.write(data);
req.end();
