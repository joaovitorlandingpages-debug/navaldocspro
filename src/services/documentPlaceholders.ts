/**
 * FASE 0 — Catálogo Canônico de Placeholders Documentais.
 *
 * Fonte única da verdade para todos os placeholders aceitos pelos templates
 * documentais do NavalDocs Pro. Qualquer placeholder fora deste catálogo
 * é considerado INVÁLIDO pelo validador.
 *
 * Formato padrão: {{namespace.campo}}  (snake_case dentro do namespace)
 */

export type PlaceholderNamespace =
  | "cliente"
  | "embarcacao"
  | "motor"
  | "empresa"
  | "engenheiro"
  | "processo"
  | "sistema";

export interface PlaceholderSpec {
  key: string;                       // ex.: "cliente.nome"
  namespace: PlaceholderNamespace;
  label: string;                     // rótulo humano
  sourceTable?: string;              // tabela de origem (auditoria)
  sourceField?: string;              // coluna de origem
  required?: boolean;                // padrão: false
  aliases?: string[];                // placeholders legados aceitos como sinônimo
}

export const CANONICAL_PLACEHOLDERS: PlaceholderSpec[] = [
  // ---------------- Cliente ----------------
  { key: "cliente.nome",      namespace: "cliente", label: "Nome / Razão Social", sourceTable: "customers", sourceField: "name", required: true,
    aliases: ["customer.name", "customer_name", "cliente.razao_social"] },
  { key: "cliente.cpf",       namespace: "cliente", label: "CPF", sourceTable: "customers", sourceField: "cpf_cnpj",
    aliases: ["cliente.cpf_cnpj", "customer_cpf", "cpf"] },
  { key: "cliente.rg",        namespace: "cliente", label: "RG", sourceTable: "customers", sourceField: "rg" },
  { key: "cliente.endereco",  namespace: "cliente", label: "Endereço", sourceTable: "customers", sourceField: "address",
    aliases: ["cliente.address"] },
  { key: "cliente.cidade",    namespace: "cliente", label: "Cidade", sourceTable: "customers", sourceField: "city",
    aliases: ["cliente.cidade_uf", "localidade.cidade"] },
  { key: "cliente.estado",    namespace: "cliente", label: "Estado (UF)", sourceTable: "customers", sourceField: "state" },
  { key: "cliente.telefone",  namespace: "cliente", label: "Telefone", sourceTable: "customers", sourceField: "phone" },
  { key: "cliente.email",     namespace: "cliente", label: "E-mail", sourceTable: "customers", sourceField: "email" },

  // ---------------- Embarcação ----------------
  { key: "embarcacao.nome",         namespace: "embarcacao", label: "Nome da Embarcação", sourceTable: "vessels", sourceField: "name", required: true,
    aliases: ["vessel_name"] },
  { key: "embarcacao.inscricao",    namespace: "embarcacao", label: "Inscrição / TIE",     sourceTable: "vessels", sourceField: "registration_number",
    aliases: ["vessel.registration_number", "vessel_id", "embarcacao.tie"] },
  { key: "embarcacao.tipo",         namespace: "embarcacao", label: "Tipo",                sourceTable: "vessels", sourceField: "vessel_type",
    aliases: ["embarcacao.categoria", "vessel_type"] },
  { key: "embarcacao.material",     namespace: "embarcacao", label: "Material do Casco",   sourceTable: "vessels", sourceField: "hull_material",
    aliases: ["embarcacao.material_casco"] },
  { key: "embarcacao.comprimento",  namespace: "embarcacao", label: "Comprimento (m)",     sourceTable: "vessels", sourceField: "length" },
  { key: "embarcacao.boca",         namespace: "embarcacao", label: "Boca (m)",            sourceTable: "vessels", sourceField: "beam" },
  { key: "embarcacao.pontal",       namespace: "embarcacao", label: "Pontal (m)",          sourceTable: "vessels", sourceField: "depth" },
  { key: "embarcacao.capacidade",   namespace: "embarcacao", label: "Capacidade / Lotação", sourceTable: "vessels", sourceField: "capacity" },

  // ---------------- Motor ----------------
  { key: "motor.fabricante", namespace: "motor", label: "Fabricante", sourceTable: "vessels", sourceField: "engine_brand" },
  { key: "motor.modelo",     namespace: "motor", label: "Modelo",     sourceTable: "vessels", sourceField: "engine_model" },
  { key: "motor.potencia",   namespace: "motor", label: "Potência",   sourceTable: "vessels", sourceField: "engine_power" },
  { key: "motor.serie",      namespace: "motor", label: "Número de Série", sourceTable: "vessels", sourceField: "engine_serial",
    aliases: ["motor.numero_serie"] },

  // ---------------- Empresa ----------------
  { key: "empresa.nome", namespace: "empresa", label: "Razão Social", sourceTable: "companies", sourceField: "name", required: true,
    aliases: ["company_name"] },
  { key: "empresa.cnpj", namespace: "empresa", label: "CNPJ",         sourceTable: "companies", sourceField: "cnpj" },

  // ---------------- Engenheiro ----------------
  { key: "engenheiro.nome", namespace: "engenheiro", label: "Engenheiro Responsável", sourceTable: "profiles", sourceField: "name",
    aliases: ["engineer_name"] },
  { key: "engenheiro.crea", namespace: "engenheiro", label: "CREA / Registro Profissional", sourceTable: "profiles", sourceField: "crea",
    aliases: ["engineer_crea"] },

  // ---------------- Processo / Sistema ----------------
  { key: "processo.numero", namespace: "processo", label: "Número do Processo", sourceTable: "processes", sourceField: "protocol_number",
    aliases: ["processo.protocolo"] },
  { key: "processo.tipo",   namespace: "processo", label: "Tipo de Processo",   sourceTable: "processes", sourceField: "process_type",
    aliases: ["process_type"] },
  { key: "sistema.data_atual", namespace: "sistema", label: "Data atual", aliases: ["data_atual", "current_date"] },
  { key: "sistema.local",      namespace: "sistema", label: "Local de emissão", aliases: ["location"] },
  { key: "sistema.hash",       namespace: "sistema", label: "Hash de autenticidade", aliases: ["hash_autenticidade"] },
];

export const CANONICAL_KEYS = new Set(CANONICAL_PLACEHOLDERS.map((p) => p.key));

/** Mapa alias -> chave canônica. Permite migrar placeholders antigos sem quebrar templates. */
export const ALIAS_TO_CANONICAL: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const p of CANONICAL_PLACEHOLDERS) {
    map[p.key] = p.key;
    for (const a of p.aliases ?? []) map[a] = p.key;
  }
  return map;
})();

/** Extrai todos os placeholders {{...}} de um corpo textual. */
export function extractPlaceholders(content: string | null | undefined): string[] {
  if (!content) return [];
  const re = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) out.push(m[1]);
  return out;
}

/** Normaliza um placeholder via aliases. Retorna null se for desconhecido. */
export function resolveCanonical(key: string): string | null {
  return ALIAS_TO_CANONICAL[key] ?? null;
}
