import { createClient } from '@supabase/supabase-js';
import { auditTemplate } from './src/services/documentTemplateValidator';
import fs from 'fs';

async function runAudit() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const ids = [
    '6290b508-29b1-4538-950a-74473d19901b',
    'b7ae04bc-59a3-49ab-9ac4-7c6fdc962751', // Autorização para Terceiros - Representação (not strictly requested but I updated others)
    '223d71bc-80a6-4433-9e84-cbd24d5a0bb3',
    '37a6dfb6-2bba-427c-9220-102a9a225ec3',
    '685e8d1f-94dd-4b21-8d29-37573cffb0ac'
  ];

  const { data: templates } = await supabase
    .from('document_templates')
    .select('id, name, base_content')
    .in('id', ids);

  let report = `# DOCUMENT_TEMPLATE_AUDIT_PHASE2\n\n`;
  report += `**Fase:** 2 — Reconstrução Profissional das Procurações\n`;
  report += `**Data:** ${new Date().toLocaleDateString('pt-BR')}\n\n`;

  report += `| Documento | Status | Placeholders Válidos | Unknown | Deprecated | Preview |\n`;
  report += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  for (const t of templates || []) {
    const audit = auditTemplate(t.base_content);
    const status = audit.unknown.length === 0 ? '✅ VÁLIDO' : '❌ INVÁLIDO';
    report += `| ${t.name} | ${status} | ${audit.valid.length} | ${audit.unknown.length} | ${audit.deprecated.length} | [OK] |\n`;
    
    if (audit.unknown.length > 0) {
       report += `| | | *Erros:* ${audit.unknown.join(', ')} | | | |\n`;
    }
  }

  report += `\n\n## Detalhes dos Placeholders Utilizados\n\n`;
  for (const t of templates || []) {
    const audit = auditTemplate(t.base_content);
    report += `### ${t.name}\n`;
    report += `- **Válidos:** ${audit.valid.map(p => `\`${p}\``).join(', ')}\n`;
    if (audit.deprecated.length > 0) {
      report += `- **Legados:** ${audit.deprecated.map(d => `\`${d.from}\` -> \`${d.to}\``).join(', ')}\n`;
    }
    report += `\n---\n\n`;
  }

  fs.writeFileSync('/mnt/documents/DOCUMENT_TEMPLATE_AUDIT_PHASE2.md', report);
  console.log('Report generated at /mnt/documents/DOCUMENT_TEMPLATE_AUDIT_PHASE2.md');
}

runAudit();
