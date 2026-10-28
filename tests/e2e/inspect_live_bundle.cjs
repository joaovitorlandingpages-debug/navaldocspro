const fs = require('fs');
const https = require('https');

https.get('https://navaldocspro.lovable.app/assets/index-CJDskvnW.js', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Bundle size:', data.length);
    console.log('Contains stripe-portal:', data.includes('stripe-portal'));
    console.log('Contains customer-portal-session:', data.includes('customer-portal-session'));
    console.log('Contains 9b795b4a or commit indicator:', data.includes('9b795b4a'));
  });
});
