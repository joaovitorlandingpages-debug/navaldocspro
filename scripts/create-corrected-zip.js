import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const zip = new JSZip();

const filesToInclude = [
  'supabase/functions/stripe-webhook/index.ts',
  'supabase/functions/stripe-sync-coupons/index.ts',
  'supabase/functions/stripe-checkout/index.ts',
  'supabase/functions/_shared/stripe-plans.ts',
  'supabase/migrations/20260924160000_billing_fixes_v2.sql',
  'src/services/billing/couponService.ts',
  'src/components/admin/AdminCouponStripePanel.tsx',
  'src/routes/admin/billing.tsx',
  'src/__tests__/billing/webhook-handler-hardening.test.ts',
  'src/__tests__/billing/shims/deno-server.ts',
  'src/__tests__/billing/shims/supabase-js.ts',
  'src/__tests__/billing/shims/deno-ambient.d.ts'
];

console.log('Adicionando arquivos com codificação UTF-8 estrita ao ZIP...');

for (const relPath of filesToInclude) {
  const fullPath = path.resolve(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`[ERRO] Arquivo não encontrado: ${relPath}`);
    process.exit(1);
  }

  const contentBuffer = fs.readFileSync(fullPath); // buffer binário direto, sem conversão intermediária
  const zipPath = relPath.replace(/\\/g, '/');
  zip.file(zipPath, contentBuffer);
  console.log(` + ${zipPath} (${contentBuffer.length} bytes)`);
}

// Gera o ZIP em buffer binário
const zipBuffer = await zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 9 }
});

const outputZipPath = path.resolve(process.cwd(), 'navaldocspro-billing-fixes-v4.zip');
fs.writeFileSync(outputZipPath, zipBuffer);
console.log(`\nZIP gerado com sucesso: ${outputZipPath} (${zipBuffer.length} bytes)`);

// Atualiza também navaldocspro-billing-fixes-v3.zip para o caso de o usuário esperar o mesmo nome
const outputV3Path = path.resolve(process.cwd(), 'navaldocspro-billing-fixes-v3.zip');
fs.writeFileSync(outputV3Path, zipBuffer);
console.log(`ZIP v3 sincronizado para compatibilidade: ${outputV3Path}`);
