const fs = require('fs');

const ENV = fs.readFileSync('.env', 'utf8');
const SUPABASE_URL = ENV.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const ANON_KEY = ENV.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];
const TEST_ENV = fs.readFileSync('.env.test.local', 'utf8');
const EMAIL = TEST_ENV.match(/TEST_USER_EMAIL=(.*)/)[1].trim();
const PASSWORD = TEST_ENV.match(/TEST_USER_PASSWORD=(.*)/)[1].trim();

async function testFlow() {
  console.log('--- 1. Authenticating test user ---');
  const authRes = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  const auth = await authRes.json();
  if (!auth.access_token) {
    console.error('Auth failed:', auth);
    return;
  }
  const token = auth.access_token;
  console.log('Auth OK! User ID:', auth.user.id);

  console.log('\n--- 2. Testing stripe-checkout endpoint (POST with auth) ---');
  const checkoutRes = await fetch(SUPABASE_URL + '/functions/v1/stripe-checkout', {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      priceId: 'price_test_sample',
      planSlug: 'profissional',
      billingCycle: 'monthly',
      cancelUrl: 'http://localhost:5173/planos',
      successUrl: 'http://localhost:5173/billing/sucesso'
    })
  });
  console.log('checkout status:', checkoutRes.status);
  const checkoutBody = await checkoutRes.text();
  console.log('checkout response:', checkoutBody);

  console.log('\n--- 3. Testing stripe-portal endpoint (POST with auth) ---');
  const portalRes = await fetch(SUPABASE_URL + '/functions/v1/stripe-portal', {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      returnUrl: 'http://localhost:5173/configuracoes'
    })
  });
  console.log('portal status:', portalRes.status);
  const portalBody = await portalRes.text();
  console.log('portal response:', portalBody);

  console.log('\n--- 4. Checking customer-portal-session endpoint (deprecated) ---');
  const legacyPortalRes = await fetch(SUPABASE_URL + '/functions/v1/customer-portal-session', {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  console.log('customer-portal-session status:', legacyPortalRes.status);

  console.log('\n--- 5. Testing stripe-webhook mock trigger without valid signature ---');
  const webhookRes = await fetch(SUPABASE_URL + '/functions/v1/stripe-webhook', {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Content-Type': 'application/json',
      'stripe-signature': 't=12345,v1=fake_signature'
    },
    body: JSON.stringify({ id: 'evt_test_123', type: 'customer.subscription.created' })
  });
  console.log('webhook invalid signature status:', webhookRes.status);
  const webhookBody = await webhookRes.text();
  console.log('webhook response:', webhookBody);
}

testFlow().catch(console.error);
