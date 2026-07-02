// Glossário Naval — traduz termos técnicos/status para linguagem de despachante/engenheiro.
// Uso: label(term) devolve rótulo humano; hint(term) devolve descrição curta.

const LABELS: Record<string, string> = {
  // Status de processo
  draft: "Rascunho",
  new: "Novo",
  pending: "Novo",
  in_progress: "Em andamento",
  waiting_docs: "Aguardando documentos",
  waiting_signature: "Aguardando assinatura",
  awaiting_signature: "Aguardando assinatura",
  awaiting_client: "Aguardando cliente",
  review: "Em revisão",
  ready_to_generate: "Pronto para geração",
  protocolado: "Protocolado",
  completed: "Finalizado",
  archived: "Arquivado",
  cancelled: "Cancelado",
  // Status de documento
  gerado: "Gerado pelo sistema",
  anexado: "Anexado pelo cliente",
  pending_signature: "Aguardando assinatura",
  signed: "Assinado",
  approved: "Aprovado",
  rejected: "Recusado",
  missing: "Falta enviar",
  // Prioridade
  high: "Alta",
  medium: "Média",
  low: "Baixa",
  // Papéis técnicos
  company_admin: "Gestor da empresa",
  admin_master: "Administrador Master",
  admin_master_global: "Administrador Global",
  operator: "Operador",
  customer: "Cliente",
  client: "Cliente",
  // Termos operacionais
  ocr: "Leitura automática de PDF",
  blueprint: "Roteiro do processo",
  checklist: "Lista de documentos exigidos",
  dossier: "Dossiê final",
  package: "Pacote de documentos",
  compliance: "Conformidade regulatória",
  sla: "Prazo operacional",
  protocol: "Protocolo oficial",
  materialize: "Aplicar roteiro",
};

const HINTS: Record<string, string> = {
  ocr: "O sistema lê o PDF e extrai os dados automaticamente.",
  blueprint: "Roteiro guiado com todos os passos deste tipo de processo.",
  dossier: "Documento único que reúne tudo o que foi assinado e aprovado.",
  compliance: "Indica se os documentos atendem NORMAM/DPC/Marinha.",
  sla: "Prazo interno para conclusão do processo.",
  protocol: "Número oficial dado pelo órgão regulador após envio.",
};

export function translateTerm(term?: string | null): string {
  if (!term) return "—";
  const key = String(term).toLowerCase().trim();
  return LABELS[key] ?? term;
}

export function termHint(term?: string | null): string | null {
  if (!term) return null;
  const key = String(term).toLowerCase().trim();
  return HINTS[key] ?? null;
}
