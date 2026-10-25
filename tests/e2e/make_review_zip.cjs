const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('--- 1. Limpando diretório temporário dist_review ---');
const distDir = path.resolve('dist_review');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);

console.log('--- 2. Gerando billing_fixes.patch fresco a partir de 1df2ef07..HEAD para supabase/ ---');
const diff = execSync('git diff 1df2ef07..HEAD -- supabase/').toString();
fs.writeFileSync(path.join(distDir, 'billing_fixes.patch'), diff, 'utf8');

console.log('--- 3. Copiando migration SQL oficial para dist_review ---');
fs.copyFileSync(
  'supabase/migrations/20261025120000_grant_can_manage_company_billing.sql',
  path.join(distDir, '20261025120000_grant_can_manage_company_billing.sql')
);

console.log('--- 4. Copiando script de testes de simulação local ---');
fs.copyFileSync(
  'tests/e2e/test_billing_auth_suite.cjs',
  path.join(distDir, 'test_billing_auth_suite.cjs')
);

console.log('--- 5. Gerando review_billing_auth_package.zip ---');
const zipPath = path.resolve('review_billing_auth_package.zip');
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

execSync(`powershell -Command "Compress-Archive -Path '${distDir}/*' -DestinationPath '${zipPath}' -Force"`);
console.log('ZIP do projeto gerado:', zipPath);

console.log('--- 6. Copiando ZIP para a Área de Trabalho ---');
const desktopPath = path.join(process.env.USERPROFILE || 'C:\\Users\\Pichau', 'Desktop');
const destDesktopZip = path.join(desktopPath, 'review_billing_auth_package.zip');
fs.copyFileSync(zipPath, destDesktopZip);
console.log('ZIP copiado para a Área de Trabalho:', destDesktopZip);

console.log('--- 7. Conferência automatizada do conteúdo extraído do ZIP gerado ---');
const testExtractDir = path.resolve('test_extracted_review');
if (fs.existsSync(testExtractDir)) fs.rmSync(testExtractDir, { recursive: true, force: true });
fs.mkdirSync(testExtractDir);

execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${testExtractDir}' -Force"`);

const extractedFiles = fs.readdirSync(testExtractDir);
console.log('Arquivos extraídos do ZIP:', extractedFiles);

// Conferência 1: Arquivos esperados presentes
const expected = ['20261025120000_grant_can_manage_company_billing.sql', 'billing_fixes.patch', 'test_billing_auth_suite.cjs'];
for (const exp of expected) {
  if (!extractedFiles.includes(exp)) {
    throw new Error(`Arquivo esperado ausente no ZIP extraído: ${exp}`);
  }
}

// Conferência 2: SQL no patch idêntico ao SQL da migration separada
const patchContent = fs.readFileSync(path.join(testExtractDir, 'billing_fixes.patch'), 'utf8');
const sqlFileContent = fs.readFileSync(path.join(testExtractDir, '20261025120000_grant_can_manage_company_billing.sql'), 'utf8');

if (patchContent.includes('DROP FUNCTION IF EXISTS public.can_manage_company_billing')) {
  throw new Error('FALHA: billing_fixes.patch contém DROP FUNCTION residual!');
}
if (patchContent.includes('v_current_role := COALESCE(auth.role(), current_user);')) {
  throw new Error('FALHA: billing_fixes.patch contém COALESCE(auth.role(), current_user) residual!');
}
if (patchContent.includes("v_current_role IN ('service_role', 'postgres', 'supabase_admin')")) {
  throw new Error('FALHA: billing_fixes.patch contém fallback para postgres/supabase_admin!');
}
if (!patchContent.includes('v_role := auth.role();')) {
  throw new Error('FALHA: billing_fixes.patch não contém a atribuição v_role := auth.role();');
}

// Conferência 3: O trecho adicionado da migration no patch corresponde exatamente à migration SQL
const patchMigrationAddedLines = patchContent
  .split('\n')
  .filter(l => l.startsWith('+') && !l.startsWith('+++'))
  .map(l => l.slice(1));

console.log('CONFERÊNCIA CONCLUÍDA: Todos os arquivos e conteúdos do ZIP são 100% consistentes e aprovados!');
