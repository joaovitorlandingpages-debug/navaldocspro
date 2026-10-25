const fs = require('fs');
const { execSync } = require('child_process');

// 1. Gera patch diff com as alterações de Edge Functions e Migrations
const diff = execSync('git diff 1df2ef07..HEAD -- supabase/').toString();
if (!fs.existsSync('dist_review')) fs.mkdirSync('dist_review');
fs.writeFileSync('dist_review/billing_fixes.patch', diff);

// 2. Inclui a migration SQL corrigida
fs.copyFileSync(
  'supabase/migrations/20261025120000_grant_can_manage_company_billing.sql',
  'dist_review/20261025120000_grant_can_manage_company_billing.sql'
);

// 3. Inclui os scripts de validação direcionados
fs.copyFileSync(
  'tests/e2e/test_billing_auth_suite.cjs',
  'dist_review/test_billing_auth_suite.cjs'
);

// 4. Cria arquivo ZIP
execSync('powershell -Command "Compress-Archive -Path dist_review/* -DestinationPath review_billing_auth_package.zip -Force"');
console.log('ZIP atualizado com sucesso: review_billing_auth_package.zip');
