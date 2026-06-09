import { auditTemplate } from "./src/services/documentTemplateValidator";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const names = [
  'Memorial Técnico',
  'Memorial Descritivo',
  'Memorial Técnico Descritivo',
  'Memorial Técnico de Embarcação',
  'Memorial de Alteração de Característica',
  'Memorial de Alteração de Motor',
  'Laudo Técnico Simplificado',
  'Relatório Técnico de Embarcação',
  'Parecer Técnico Naval',
  'Relatório de Vistoria Técnica'
];

async function runAudit() {
  const { data: templates, error } = await supabase
    .from('document_templates')
    .select('name, base_content')
    .in('name', names);

  if (error) {
    console.error("Erro ao buscar templates:", error);
    process.exit(1);
  }

  let report = "# DOCUMENT_TEMPLATE_AUDIT_PHASE4\n\n";
  report += "## ENGINEERING_DOCUMENTS_REBUILD\n\n";
  report += "Reconstrução profissional de 10 documentos técnicos de engenharia naval.\n\n";
  report += "| DOCUMENTO | STATUS | PLACEHOLDERS VÁLIDOS | DESCONHECIDOS | LEGADOS | DEPENDÊNCIA ENGENHARIA |\n";
  report += "| --- | --- | --- | --- | --- | --- |\n";

  for (const name of names) {
    const template = templates.find(t => t.name === name);
    if (!template) {
        report += `| ${name} | ❌ NÃO ENCONTRADO | - | - | - | - |\n`;
        continue;
    }
    const audit = auditTemplate(template.base_content);
    const status = audit.unknown.length === 0 ? "✅ OK" : "❌ INVÁLIDO";
    
    report += `| ${template.name} | ${status} | ${audit.valid.length} | ${audit.unknown.length} | ${audit.deprecated.length} | **Sim** |\n`;
  }

  console.log(report);
}

runAudit();
