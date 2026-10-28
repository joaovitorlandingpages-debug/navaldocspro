const https = require('https');

https.get('https://navaldocspro.lovable.app', (res) => {
  console.log('Frontend Status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const assets = data.match(/\/assets\/[^"]+/g);
    console.log('Frontend Assets:', assets ? assets.slice(0, 5) : 'none');
  });
});
