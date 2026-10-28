const fs = require('fs');

async function main() {
  const env = fs.readFileSync('.env', 'utf8');
  const testEnv = fs.readFileSync('.env.test.local', 'utf8');

  const getVal = (txt, key) => {
    const line = txt.split('\n').find(l => l.startsWith(key));
    if (!line) return '';
    return line.split('=')[1].replace(/["'\r]/g, '').trim();
  };

  const url = getVal(env, 'VITE_SUPABASE_URL');
  const key = getVal(env, 'VITE_SUPABASE_PUBLISHABLE_KEY');
  const email = getVal(testEnv, 'TEST_USER_EMAIL');
  const pass = getVal(testEnv, 'TEST_USER_PASSWORD');

  const authRes = await fetch(url + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass })
  });
  const auth = await authRes.json();
  console.log('User auth:', auth.user?.id, auth.user?.email);

  const profRes = await fetch(url + '/rest/v1/profiles?id=eq.' + auth.user.id, {
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + auth.access_token }
  });
  const prof = await profRes.json();
  console.log('Profile:', prof);

  if (prof[0]?.company_id) {
    const compRes = await fetch(url + '/rest/v1/companies?id=eq.' + prof[0].company_id, {
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + auth.access_token }
    });
    console.log('Company:', await compRes.json());
  }

  // Also check subscriptions
  const subRes = await fetch(url + '/rest/v1/subscriptions?company_id=eq.' + prof[0]?.company_id, {
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + auth.access_token }
  });
  console.log('Subscriptions:', await subRes.json());
}

main().catch(console.error);
