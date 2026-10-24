import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function inspectPdfs() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const evidenceDir = path.join(__dirname, 'evidence');

  const files = [
    { name: 'req_padrao.pdf', expectedTitle: 'REQUERIMENTO' },
    { name: 'procuracao.pdf', expectedTitle: 'PROCURAÇÃO' },
    { name: 'decl_residencia.pdf', expectedTitle: 'DECLARAÇÃO DE RESIDÊNCIA' },
  ];

  console.log('====================================================');
  console.log('RELATÓRIO DE INSPEÇÃO DETALHADA DE PÁGINAS E CONTEÚDO');
  console.log('====================================================\n');

  for (const f of files) {
    const fullPath = path.join(evidenceDir, f.name);
    if (!fs.existsSync(fullPath)) {
      console.error(`ERRO: Arquivo ${f.name} não encontrado!`);
      continue;
    }

    const data = new Uint8Array(fs.readFileSync(fullPath));
    const doc = await pdfjs.getDocument({ data }).promise;

    console.log(`>>> ARQUIVO: ${f.name}`);
    console.log(`    Total de páginas: ${doc.numPages}`);
    console.log(`    Tamanho no disco: ${data.length} bytes`);

    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const strings = textContent.items.map((it) => it.str).filter(Boolean);
      const fullText = strings.join(' ');
      const viewport = page.getViewport({ scale: 1.0 });

      console.log(`\n    --- PÁGINA ${pageNum} (Dimensões: ${viewport.width.toFixed(1)} x ${viewport.height.toFixed(1)} pt) ---`);
      console.log(`    Contagem de itens de texto: ${textContent.items.length}`);
      
      // Checar se o conteúdo ultrapassa margens / corte
      const hasValidDimensions = viewport.width >= 500 && viewport.height >= 700;
      console.log(`    Formato da página válido (A4/Carta padrão): ${hasValidDimensions}`);

      // Verificar elementos essenciais
      const hasClientData = fullText.includes('Carlos') || fullText.includes('CPF') || fullText.includes('103812') || fullText.includes('Santos');
      const hasSignature = fullText.includes('Assinatura') || fullText.includes('Outorgante') || fullText.includes('Requerente');
      const hasAuthHeader = fullText.includes('MARINHA DO BRASIL') || fullText.includes('CAPITANIA') || fullText.includes('NORMAM') || fullText.includes('PROCURAÇÃO');

      console.log(`    Contém cabeçalho/título oficial: ${hasAuthHeader}`);
      console.log(`    Contém dados cadastrais do cliente/embarcação: ${hasClientData}`);
      console.log(`    Contém área de assinatura: ${hasSignature}`);
      console.log(`    Amostra de texto inicial: "${fullText.slice(0, 180)}..."`);
      console.log(`    Amostra de rodapé: "...${fullText.slice(-180)}"`);
    }
    console.log('\n----------------------------------------------------\n');
  }
}

inspectPdfs().catch(console.error);
