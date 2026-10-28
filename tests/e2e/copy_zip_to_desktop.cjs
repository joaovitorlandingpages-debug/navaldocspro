const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcZip = path.resolve('review_billing_auth_package.zip');
console.log('Verificando arquivo na pasta do projeto:', srcZip);

if (!fs.existsSync(srcZip)) {
  console.log('Arquivo não encontrado. Gerando novamente...');
  execSync('node tests/e2e/make_review_zip.cjs', { stdio: 'inherit' });
}

const desktopPath = path.join(process.env.USERPROFILE || 'C:\\Users\\Pichau', 'Desktop');
const destZip = path.join(desktopPath, 'review_billing_auth_package.zip');

fs.copyFileSync(srcZip, destZip);
console.log('Copiado com sucesso para:', destZip);

// Abre o Explorador de Arquivos com o ZIP selecionado na Área de Trabalho
execSync(`explorer /select,"${destZip}"`);
console.log('Explorador de Arquivos aberto com o arquivo selecionado.');
