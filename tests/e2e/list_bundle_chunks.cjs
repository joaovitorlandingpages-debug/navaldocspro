const fs = require('fs');
const https = require('https');

https.get('https://navaldocspro.lovable.app/assets/index-CJDskvnW.js', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const re = /\/assets\/[a-zA-Z0-9_\-]+\.js/g;
    const matches = d.match(re) || [];
    const unique = [...new Set(matches)];
    console.log('Total chunks:', unique.length);
    console.log(unique);
  });
});
