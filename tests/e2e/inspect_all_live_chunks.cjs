const fs = require('fs');
const https = require('https');

https.get('https://navaldocspro.lovable.app', (res) => {
  let html = '';
  res.on('data', chunk => html += chunk);
  res.on('end', () => {
    const scripts = html.match(/\/assets\/[a-zA-Z0-9_\-\.]+\.js/g) || [];
    const unique = [...new Set(scripts)];
    console.log('Scripts encontrados no index.html:', unique);
    
    unique.forEach(scriptUrl => {
      https.get('https://navaldocspro.lovable.app' + scriptUrl, sRes => {
        let sData = '';
        sRes.on('data', c => sData += c);
        sRes.on('end', () => {
          const hasStripePortal = sData.includes('stripe-portal');
          const hasCustomerPortal = sData.includes('customer-portal-session');
          const hasProcessOcr = sData.includes('process-ocr-document');
          if (hasStripePortal || hasCustomerPortal || hasProcessOcr) {
            console.log(`[SCRIPT ${scriptUrl}] portal:${hasStripePortal}, custPortal:${hasCustomerPortal}, ocr:${hasProcessOcr}`);
          }
        });
      });
    });
  });
});
