const fs = require('fs');

async function checkSubscriptionsDetails() {
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

  // Test insert with status 'pending'
  console.log('Testing insert of pending subscription...');
  const insRes = await fetch(SUPABASE_URL + '/rest/v1/subscriptions', {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      company_id: companyId,
      status: 'pending',
      metadata: { stripe_customer_id: 'cus_probe_test_123' }
    })
  });

  console.log('Insert status:', insRes.status);
  const insBody = await insRes.text();
  console.log('Insert body:', insBody);

  // If inserted, test duplicate insert to check 23505 unique constraint!
  if (insRes.ok) {
    console.log('Testing duplicate insert for unique constraint check...');
    const dupRes = await fetch(SUPABASE_URL + '/rest/v1/subscriptions', {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        company_id: companyId,
        status: 'pending',
        metadata: { stripe_customer_id: 'cus_probe_test_dup' }
      })
    });
    console.log('Dup insert status:', dupRes.status);
    console.log('Dup insert body:', await dupRes.text());

    // Clean up test subscription!
    console.log('Cleaning up test subscription...');
    const delRes = await fetch(SUPABASE_URL + '/rest/v1/subscriptions?company_id=eq.' + companyId, {
      method: 'DELETE',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': 'Bearer ' + token
      }
    });
    console.log('Delete status:', delRes.status);
  }
}

checkSubscriptionsDetails().catch(console.error);
