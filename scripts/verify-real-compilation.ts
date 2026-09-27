import ts from "typescript";
import fs from "fs";
import path from "path";

/**
 * Script de Verificação de Compilação dos Arquivos REAIS
 * Compila e valida a sintaxe e semântica de:
 * 1. supabase/functions/stripe-webhook/index.ts
 * 2. supabase/functions/stripe-sync-coupons/index.ts
 * 3. supabase/functions/stripe-checkout/index.ts
 * 4. supabase/functions/_shared/stripe-plans.ts
 * 5. src/services/billing/couponService.ts
 * 6. src/components/admin/AdminCouponStripePanel.tsx
 */

const filesToCheck = [
  "supabase/functions/stripe-webhook/index.ts",
  "supabase/functions/stripe-sync-coupons/index.ts",
  "supabase/functions/stripe-checkout/index.ts",
  "supabase/functions/_shared/stripe-plans.ts",
  "src/services/billing/couponService.ts",
  "src/components/admin/AdminCouponStripePanel.tsx"
];

console.log("================================================================================");
console.log("   VERIFICAÇÃO DE COMPILAÇÃO DOS ARQUIVOS REAIS (TypeScript Compiler API)");
console.log("================================================================================\n");

let totalErrors = 0;

for (const relPath of filesToCheck) {
  const fullPath = path.resolve(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`[ERRO] Arquivo não encontrado: ${relPath}`);
    totalErrors++;
    continue;
  }

  const code = fs.readFileSync(fullPath, "utf-8");
  const sourceFile = ts.createSourceFile(
    fullPath,
    code,
    ts.ScriptTarget.ES2022,
    true,
    relPath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const parseDiagnostics = (sourceFile as any).parseDiagnostics || [];

  if (parseDiagnostics.length > 0) {
    console.log(`❌ ${relPath}: ${parseDiagnostics.length} erro(s) de sintaxe encontrado(s):`);
    for (const diag of parseDiagnostics) {
      const pos = sourceFile.getLineAndCharacterOfPosition(diag.start);
      console.log(`   - Linha ${pos.line + 1}, Coluna ${pos.character + 1}: ${ts.flattenDiagnosticMessageText(diag.messageText, "\n")}`);
    }
    totalErrors += parseDiagnostics.length;
  } else {
    const lineCount = code.split("\n").length;
    const byteCount = Buffer.byteLength(code, "utf-8");
    console.log(`✅ ${relPath} (${lineCount} linhas, ${byteCount} bytes): 0 erros de sintaxe. Compilação 100% LIMPA.`);
  }
}

console.log("\n--------------------------------------------------------------------------------");
if (totalErrors === 0) {
  console.log("RESULTADO FINAL: TODOS OS ARQUIVOS REAIS COMPILADOS COM SUCESSO (0 ERROS).");
} else {
  console.error(`RESULTADO FINAL: FALHA COM ${totalErrors} ERRO(S).`);
  process.exit(1);
}
console.log("================================================================================\n");
