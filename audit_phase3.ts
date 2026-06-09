import { auditTemplate } from "./src/services/documentTemplateValidator";
import { createClient } from "@supabase/supabase-base";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const ids = [
  '80cdb7fb-ec07-4999-84e9-812de79def48', // Declaração de Responsabilidade
  'dc6ebe24-51ed-43c0-bf93-3728ac256931', // Declaração de Responsabilidade para Processo Naval
  '78ccad11-63ab-40f1-aba3-22656333fc14', // Declaração de Responsabilidade sobre Documentos e Informações Apresentadas
  '073f0074-6b6e-4429-8c53-65acbcb36c2b', // Declaração de Residência
  'b24a8704-4b7f-43fc-8608-983eed3a53d6', // Declaração de Uso e Finalidade da Embarcação
  '61d33d9b-efdc-4086-bebc-82df995d45aa', // Declaração de Procedência e Propriedade da Embarcação
  '5f37b05d-8b7a-4c1c-8261-dfa998366c24', // Declaração de Material e Construção da Embarcação
  'f0e1bbbb-ec7a-4a21-93a2-3865b67160a3', // Declaração de Construção Própria de Embarcação
  '4528ac85-be6e-4f27-9936-4a525a9175bd', // Declaração de Capacidade e Lotação da Embarcação
  '38a3b8ab-45ff-4b26-985c-d9bd05c0033b', // Declaração de Navegação e Área Operacional
  '15a79735-12a8-4e16-ac40-2ed974f089ca', // Declaração de Potência e Motorização
  '7bd6b82a-298d-40b4-b648-de2571c12751', // Declaração de Conformidade da Embarcação
  '4208cf0a-0b13-4ba1-b600-06ab46eeb103', // Declaração de Extravio ou Perda de Documento
  '5d139f49-0e2f-49e1-9b56-3e47bac467d2'  // Declaração de Propriedade – Embarcação Antiga
];

async function runAudit() {
  const { data: templates, error } = await supabase
    .from('document_templates')
    .select('id, name, base_content')
    .in('id', ids);

  if (error) {
    console.error("Erro ao buscar templates:", error);
    process.exit(1);
  }

  let report = "# DOCUMENT_TEMPLATE_AUDIT_PHASE3\n\n";
  report += "## DECLARATION_LIBRARY_REBUILD\n\n";
  report += "| DOCUMENTO | STATUS | PLACEHOLDERS VÁLIDOS | DESCONHECIDOS | LEGADOS | DEPENDÊNCIA ENGENHARIA |\n";
  report += "| --- | --- | --- | --- | --- | --- |\n";

  for (const template of templates) {
    const audit = auditTemplate(template.base_content);
    const status = audit.unknown.length === 0 ? "✅ OK" : "❌ INVÁLIDO";
    const depEngenharia = template.name.includes("Construção") || template.name.includes("Conformidade") ? "Sim" : "Não";
    
    report += `| ${template.name} | ${status} | ${audit.valid.length} | ${audit.unknown.length} | ${audit.deprecated.length} | ${depEngenharia} |\n`;
  }

  console.log(report);
}

runAudit();
