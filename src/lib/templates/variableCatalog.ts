/**
 * Sprint 4D.2.d — Fatia D
 * Catálogo canônico de variáveis de template.
 * Auditado contra o schema real (customers, vessels, processes, companies, profiles).
 */

export type TemplateVariable = {
  key: string;
  label: string;
  group: TemplateVariableGroup;
  description: string;
  sample: string;
  /** Fonte real no schema — quando null, é dado do sistema (data/hora/etc.). */
  source?: string;
};

export type TemplateVariableGroup =
  | "cliente"
  | "embarcacao"
  | "processo"
  | "empresa"
  | "responsavel"
  | "sistema";

export const VARIABLE_GROUPS: { id: TemplateVariableGroup; label: string }[] = [
  { id: "cliente", label: "Cliente" },
  { id: "embarcacao", label: "Embarcação" },
  { id: "processo", label: "Processo" },
  { id: "empresa", label: "Empresa" },
  { id: "responsavel", label: "Responsável" },
  { id: "sistema", label: "Sistema" },
];

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  // Cliente — customers
  { key: "cliente.nome", label: "Nome", group: "cliente", description: "Nome/razão social do cliente.", sample: "João da Silva", source: "customers.name" },
  { key: "cliente.cpf_cnpj", label: "CPF/CNPJ", group: "cliente", description: "Documento do cliente.", sample: "000.000.000-00", source: "customers.document" },
  { key: "cliente.email", label: "E-mail", group: "cliente", description: "E-mail de contato.", sample: "cliente@exemplo.com", source: "customers.email" },
  { key: "cliente.telefone", label: "Telefone", group: "cliente", description: "Telefone de contato.", sample: "(11) 90000-0000", source: "customers.phone" },
  { key: "cliente.endereco", label: "Endereço", group: "cliente", description: "Endereço completo do cliente.", sample: "Rua Exemplo, 123 — São Paulo/SP", source: "customers.address" },

  // Embarcação — vessels
  { key: "embarcacao.nome", label: "Nome", group: "embarcacao", description: "Nome da embarcação.", sample: "Mar Azul", source: "vessels.name" },
  { key: "embarcacao.inscricao", label: "Inscrição", group: "embarcacao", description: "Nº de inscrição / registro.", sample: "TESTE-123", source: "vessels.registration_number" },
  { key: "embarcacao.tipo", label: "Tipo", group: "embarcacao", description: "Tipo de embarcação.", sample: "Lancha", source: "vessels.type" },
  { key: "embarcacao.fabricante", label: "Fabricante", group: "embarcacao", description: "Fabricante/estaleiro.", sample: "Estaleiro Exemplo", source: "vessels.manufacturer" },
  { key: "embarcacao.ano", label: "Ano", group: "embarcacao", description: "Ano de fabricação.", sample: "2020", source: "vessels.year_built" },
  { key: "embarcacao.motor", label: "Motor", group: "embarcacao", description: "Motor/propulsão. Sem coluna direta — usa vessel_engines[0].", sample: "Mercury 250HP", source: "vessel_engines.model" },

  // Processo — processes
  { key: "processo.numero", label: "Número", group: "processo", description: "Número do processo.", sample: "PROC-DEMO-001", source: "processes.process_number" },
  { key: "processo.titulo", label: "Título", group: "processo", description: "Título do processo.", sample: "Vistoria Anual — Mar Azul", source: "processes.title" },
  { key: "processo.tipo", label: "Tipo", group: "processo", description: "Tipo do processo.", sample: "vistoria", source: "processes.type" },
  { key: "processo.status", label: "Status", group: "processo", description: "Status atual.", sample: "em_andamento", source: "processes.status" },
  { key: "processo.data_abertura", label: "Data de abertura", group: "processo", description: "Data de abertura.", sample: "13/07/2026", source: "processes.created_at" },

  // Empresa — companies
  { key: "empresa.nome", label: "Nome", group: "empresa", description: "Razão social da empresa.", sample: "Empresa Naval Exemplo", source: "companies.name" },
  { key: "empresa.cnpj", label: "CNPJ", group: "empresa", description: "CNPJ da empresa.", sample: "00.000.000/0001-00", source: "companies.cnpj" },
  { key: "empresa.endereco", label: "Endereço", group: "empresa", description: "Endereço da empresa.", sample: "Av. Portuária, 1000 — Santos/SP", source: "companies.address" },
  { key: "empresa.logo", label: "Logo", group: "empresa", description: "URL do logo (renderiza como imagem).", sample: "https://placehold.co/160x60?text=Logo", source: "companies.logo_url" },

  // Responsável — profiles
  { key: "responsavel.nome", label: "Nome", group: "responsavel", description: "Nome do responsável técnico.", sample: "Maria Souza", source: "profiles.full_name" },
  { key: "responsavel.cargo", label: "Cargo", group: "responsavel", description: "Cargo/função.", sample: "Engenheira Naval", source: "profiles.job_title" },
  { key: "responsavel.registro", label: "Registro", group: "responsavel", description: "Registro profissional (ex.: CREA).", sample: "CREA-SP 000000", source: "profiles.professional_registration" },

  // Sistema
  { key: "data_atual", label: "Data atual", group: "sistema", description: "Data em que o documento é gerado.", sample: "13/07/2026" },
  { key: "hora_atual", label: "Hora atual", group: "sistema", description: "Hora da geração.", sample: "14:30" },
  { key: "ano_atual", label: "Ano atual", group: "sistema", description: "Ano corrente.", sample: "2026" },
];

/** Índice por chave. */
export const VARIABLE_INDEX: Record<string, TemplateVariable> = Object.fromEntries(
  TEMPLATE_VARIABLES.map((v) => [v.key, v]),
);

export function isKnownVariable(key: string): boolean {
  return Boolean(VARIABLE_INDEX[key]);
}

/** Dados fictícios para preview — nunca leem de tenant real. */
export const SAMPLE_CONTEXT: Record<string, string> = Object.fromEntries(
  TEMPLATE_VARIABLES.map((v) => [v.key, v.sample]),
);
