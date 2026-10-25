const fs = require('fs');
const { execSync } = require('child_process');

const diff = execSync('git diff 1df2ef07..47f2ef4e -- supabase/').toString();
if (!fs.existsSync('dist_review')) fs.mkdirSync('dist_review');
fs.writeFileSync('dist_review/billing_fixes.patch', diff);
fs.copyFileSync('supabase/migrations/20261025120000_grant_can_manage_company_billing.sql', 'dist_review/20261025120000_grant_can_manage_company_billing.sql');

execSync('powershell -Command "Compress-Archive -Path dist_review/* -DestinationPath review_billing_auth_package.zip -Force"');
console.log('ZIP created successfully: review_billing_auth_package.zip');
