const fs = require('fs');

const ENV = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = ENV.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const ANON_KEY = ENV.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];
const TEST_ENV = fs.readFileSync('.env.test.local', 'utf8');
const EMAIL = TEST_ENV.match(/TEST_USER_EMAIL=(.*)/)[1].trim();
const PASSWORD = TEST_ENV.match(/TEST_USER_PASSWORD=(.*)/)[1].trim();

async function inspectUser() {
  const authRes = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  const auth = await authRes.json();
  const token = auth.access_token;
  const uid = auth.user.id;
  console.log('Logged in as:', auth.user.email, 'ID:', uid);

  // Check profile
  const profileRes = await fetch(SUPABASE_URL + `/rest/v1/profiles?id=eq.${uid}&select=*`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token }
  });
  const profiles = await profileRes.json();
  console.log('Profile:', profiles);

  // Check companies
  const compRes = await fetch(SUPABASE_URL + `/rest/v1/companies?select=*`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + token }
  });
  const companies = await compRes.json();
  console.log('Companies visible:', companies);
}

inspectUser().catch(console.error);
