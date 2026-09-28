/**
 * Catálogo e Auditoria Regulatória de Serviços Náuticos do NavalDocs Pro
 * Base normativa: NORMAM-01/DPC, NORMAM-02/DPC, NORMAM-03/DPC e Capitanias dos Portos.
 *
 * Cada serviço possui auditoria técnica explícita:
 * - 'validated' ("Requisitos conferidos"): com fonte oficial específica e data da conferência.
 * - 'in_review' ("Requisitos em revisão"): mantido como rascunho com o que falta validar e sem conclusão direta.
 */

export type ServiceStatus = "validated" | "in_review" | "unidentified_source";

export interface ServiceDefinition {
  id: string;
  keyAliases: string[];
  title: string;
  category: "esporte_recreio" | "profissional" | "all";
  categoryDisplayName: string;
  status: ServiceStatus;
  statusLabel: string;
  validationDate: string; // Ex: "28/09/2026"
  validationDateFormatted: string; // Ex: "Setembro de 2026"
  officialSource: string;
  sourceUrl: string;
  requiredDocuments: string[];
  generatedDocuments: string[];
  missingValidationNote?: string;
  needsProfessionalReview: boolean; // Indica se os documentos gerados precisam de revisão por profissional habilitado (ex: Engenheiro Naval, Perito)
  canFinalizeProtocol: boolean; // Bloqueia protocolamento final automatizado se ainda em revisão técnica
}

export const NAVAL_SERVICES_CATALOG: ServiceDefinition[] = [
  // =========================================================================
  // SERVIÇOS VALIDADOS (REQUISITOS CONFERIDOS)
  // =========================================================================
  {
    id: "transferencia_propriedade",
    keyAliases: ["transferencia_propriedade", "transferencia-propriedade", "transferencia"],
    title: "Transferência de propriedade",
    category: "all",
    categoryDisplayName: "Esporte e recreio",
    status: "validated",
    statusLabel: "Requisitos conferidos",
    validationDate: "28/09/2026",
    validationDateFormatted: "Setembro de 2026",
    officialSource: "NORMAM-03/DPC, Cap. 2, Seção II, Item 0205 • Capitania dos Portos (CPES/CPRJ)",
    sourceUrl: "https://www.marinha.mil.br/cpes/node/382",
    requiredDocuments: [
      "Documento oficial de identificação com foto e CPF do comprador e vendedor (RG/CNH)",
      "Comprovante de residência atualizado do novo proprietário (máximo 90 dias)",
      "Título de Inscrição da Embarcação (TIE/TIEM) original ou declaração formal de extravio com B.O.",
      "Autorização de Transferência de Propriedade (DUT Náutico) com reconhecimento de firma por autenticidade",
      "Guia de Recolhimento da União (GRU DPC cód. 28830-6) com comprovante de pagamento",
    ],
    generatedDocuments: [
      "Requerimento padronizado ao Capitão dos Portos para Transferência de Propriedade",
      "Procuração Náutica específica para representação perante a Capitania",
      "Declaração de Residência do adquirente (quando aplicável)",
    ],
    needsProfessionalReview: false,
    canFinalizeProtocol: true,
  },
  {
    id: "renovacao_inscricao",
    keyAliases: ["renovacao_inscricao", "renovacao-tie", "renovacao"],
    title: "Renovação de inscrição (TIE / TIEM)",
    category: "all",
    categoryDisplayName: "Esporte e recreio",
    status: "validated",
    statusLabel: "Requisitos conferidos",
    validationDate: "28/09/2026",
    validationDateFormatted: "Setembro de 2026",
    officialSource: "NORMAM-03/DPC, Cap. 2, Item 0208 • Capitania dos Portos (CPES/CPRJ)",
    sourceUrl: "https://www.marinha.mil.br/cpes/node/382",
    requiredDocuments: [
      "Documento de identificação do proprietário com foto e CPF (RG/CNH)",
      "Comprovante de residência atualizado",
      "TIE/TIEM original com validade vencida ou a vencer em até 30 dias",
      "Comprovante de pagamento da taxa GRU DPC de renovação de inscrição",
    ],
    generatedDocuments: [
      "Requerimento de Renovação de TIE/TIEM à Capitania dos Portos",
      "Procuração Náutica com poderes de representação administrativa",
    ],
    needsProfessionalReview: false,
    canFinalizeProtocol: true,
  },
  {
    id: "segunda_via",
    keyAliases: ["segunda_via", "segunda-via-tie", "segunda-via"],
    title: "Segunda via de documento (TIE / TIEM)",
    category: "all",
    categoryDisplayName: "Esporte e recreio",
    status: "validated",
    statusLabel: "Requisitos conferidos",
    validationDate: "28/09/2026",
    validationDateFormatted: "Setembro de 2026",
    officialSource: "NORMAM-03/DPC, Cap. 2, Item 0212 • Capitania dos Portos (CPES/CPRJ)",
    sourceUrl: "https://www.marinha.mil.br/cpes/node/382",
    requiredDocuments: [
      "Documento de identificação do proprietário com foto e CPF (RG/CNH)",
      "Comprovante de residência atualizado",
      "Boletim de Ocorrência (em caso de roubo/furto/perda) ou documento original danificado",
      "Declaração de perda/extravio assinada pelo proprietário",
      "Comprovante de pagamento da taxa GRU DPC para 2ª via",
    ],
    generatedDocuments: [
      "Requerimento de 2ª Via de Documento Náutico",
      "Declaração formal de perda/extravio e responsabilidade",
      "Procuração Náutica específica",
    ],
    needsProfessionalReview: false,
    canFinalizeProtocol: true,
  },
  {
    id: "inscricao_embarcacao",
    keyAliases: ["inscricao_embarcacao", "inscricao-inicial", "inscricao"],
    title: "Inscrição de embarcação",
    category: "all",
    categoryDisplayName: "Esporte e recreio",
    status: "validated",
    statusLabel: "Requisitos conferidos",
    validationDate: "28/09/2026",
    validationDateFormatted: "Setembro de 2026",
    officialSource: "NORMAM-03/DPC, Cap. 2, Seção I, Itens 0202 a 0204 • Capitania dos Portos",
    sourceUrl: "https://www.marinha.mil.br/cpes/node/382",
    requiredDocuments: [
      "Nota fiscal de compra do casco (ou fatura consular/documento de importação/escritura)",
      "Nota fiscal de aquisição do(s) motor(es)",
      "Declaração de Conformidade do Construtor / Memorial Descritivo com ART de série",
      "Documento de identificação (RG/CNH) e Comprovante de Residência do proprietário",
      "Fotografias da embarcação (mostrando o nome/inscrição no costado e na popa)",
      "Comprovante de pagamento da GRU de inscrição inicial de embarcação",
    ],
    generatedDocuments: [
      "Requerimento de Inscrição Inicial de Embarcação à Capitania",
      "Termo de Responsabilidade e Guarda da Embarcação",
      "Procuração Náutica específica",
    ],
    needsProfessionalReview: false,
    canFinalizeProtocol: true,
  },
  {
    id: "alteracao_cadastral",
    keyAliases: ["alteracao_cadastral", "alteracao-cadastral", "mudanca-endereco"],
    title: "Alteração de dados cadastrais",
    category: "all",
    categoryDisplayName: "Esporte e recreio",
    status: "validated",
    statusLabel: "Requisitos conferidos",
    validationDate: "28/09/2026",
    validationDateFormatted: "Setembro de 2026",
    officialSource: "NORMAM-03/DPC, Cap. 2, Item 0210 • Diretoria de Portos e Costas (DPC)",
    sourceUrl: "https://www.marinha.mil.br/dpc/",
    requiredDocuments: [
      "Documento comprobatório da alteração (certidão de casamento, novo comprovante de endereço ou contrato social se PJ)",
      "TIE/TIEM original da embarcação",
      "Documento oficial de identificação do proprietário (RG/CNH)",
      "Guia GRU DPC paga quando exigível pela capitania",
    ],
    generatedDocuments: [
      "Requerimento de Alteração de Dados Cadastrais",
      "Declaração de Domicílio e Residência Atualizada",
      "Procuração Náutica",
    ],
    needsProfessionalReview: false,
    canFinalizeProtocol: true,
  },

  // =========================================================================
  // SERVIÇOS EM REVISÃO (NÃO CONFERIDOS INTEGRALMENTE / REQUEREM PROFISSIONAL)
  // =========================================================================
  {
    id: "alteracao_motor",
    keyAliases: ["alteracao_motor", "alteracao-motor", "troca-motor"],
    title: "Alteração de motor / Dados técnicos",
    category: "all",
    categoryDisplayName: "Esporte e recreio / Profissional",
    status: "in_review",
    statusLabel: "Requisitos em revisão",
    validationDate: "15/08/2026",
    validationDateFormatted: "Agosto de 2026 (Parcial)",
    officialSource: "NORMAM-03/DPC, Cap. 2, Item 0209 e NORMAM-01/DPC, Cap. 3",
    sourceUrl: "https://www.marinha.mil.br/dpc/",
    requiredDocuments: [
      "Nota fiscal de aquisição do novo motor ou documento hábil de transferência de motor",
      "Termo de baixa/desinstalação do motor anterior",
      "TIE/TIEM original da embarcação",
      "Comprovante de pagamento de taxa GRU DPC correspondente",
    ],
    generatedDocuments: [
      "Minuta de Requerimento de Alteração de Dados de Motor",
    ],
    missingValidationNote: "Pendente de validação regulatória sobre quando a Capitania exige Laudo de Engenheiro Naval com ART por alteração de potência acima de 10% ou limites de placa.",
    needsProfessionalReview: true,
    canFinalizeProtocol: false,
  },
  {
    id: "vistoria_tecnica",
    keyAliases: ["vistoria_tecnica", "vistoria-tecnica", "pericia-tecnica"],
    title: "Vistoria e perícia técnica",
    category: "all",
    categoryDisplayName: "Esporte e recreio / Profissional",
    status: "in_review",
    statusLabel: "Requisitos em revisão",
    validationDate: "10/08/2026",
    validationDateFormatted: "Agosto de 2026 (Parcial)",
    officialSource: "NORMAM-01/DPC, Cap. 10 e NORMAM-03/DPC, Anexo 2-A",
    sourceUrl: "https://www.marinha.mil.br/dpc/",
    requiredDocuments: [
      "Solicitação de agendamento de vistoria técnica oficial",
      "Comprovante de pagamento da taxa de vistoria da Capitania",
      "Documentação técnica da embarcação (planos de salvatagem e combate a incêndio)",
    ],
    generatedDocuments: [
      "Minuta de Solicitação de Agendamento de Vistoria Oficial",
    ],
    missingValidationNote: "Pendente de conferência com os checklists de vistoria das Capitanias regionais e disponibilidade de perito credenciado.",
    needsProfessionalReview: true,
    canFinalizeProtocol: false,
  },
  {
    id: "cancelamento_inscricao",
    keyAliases: ["cancelamento_inscricao", "cancelamento-inscricao", "baixa-embarcacao"],
    title: "Cancelamento de inscrição",
    category: "all",
    categoryDisplayName: "Esporte e recreio / Profissional",
    status: "in_review",
    statusLabel: "Requisitos em revisão",
    validationDate: "05/08/2026",
    validationDateFormatted: "Agosto de 2026 (Parcial)",
    officialSource: "NORMAM-01/DPC, Cap. 2, Seção IV e NORMAM-03/DPC, Item 0214",
    sourceUrl: "https://www.marinha.mil.br/dpc/",
    requiredDocuments: [
      "TIE/TIEM original da embarcação para devolução",
      "Justificativa formal com comprovação (termo de desmanche, B.O. de naufrágio ou documento de exportação)",
      "Certidão Negativa de Ônus do Tribunal Marítimo (se registrada no TM)",
    ],
    generatedDocuments: [
      "Minuta de Requerimento de Cancelamento de Inscrição / Baixa",
    ],
    missingValidationNote: "Pendente de validação do rito entre embarcações registradas no Tribunal Marítimo (> 100 AB) versus inscritas exclusivamente na Capitania (< 100 AB).",
    needsProfessionalReview: true,
    canFinalizeProtocol: false,
  },
  {
    id: "laudo_engenharia",
    keyAliases: ["laudo_engenharia", "laudo-engenharia", "estabilidade-naval"],
    title: "Laudo de estabilidade e engenharia naval",
    category: "profissional",
    categoryDisplayName: "Embarcações profissionais",
    status: "in_review",
    statusLabel: "Requisitos em revisão",
    validationDate: "01/09/2026",
    validationDateFormatted: "Setembro de 2026 (Restrição Legal Identificada)",
    officialSource: "NORMAM-01/DPC, Cap. 3 e Lei Federal 5.194/1966 (CREA/CONFEA)",
    sourceUrl: "https://www.marinha.mil.br/dpc/",
    requiredDocuments: [
      "Plano de linhas e tabela de cotas do casco",
      "Relatório de prova de inclinação e cálculo do centro de gravidade",
      "Anotação de Responsabilidade Técnica (ART) do Engenheiro Naval responsável",
    ],
    generatedDocuments: [
      "Minuta estrutural de Memorial Descritivo de Estabilidade Naval",
    ],
    missingValidationNote: "Atenção: Por determinação legal (Lei 5.194/66 e NORMAM-01), este laudo não pode ser emitido de forma automatizada sem conferência técnica, cálculo pericial e assinatura presencial ou digital ICP-Brasil com ART quitada por Engenheiro Naval registrado no CREA.",
    needsProfessionalReview: true,
    canFinalizeProtocol: false,
  },
  {
    id: "despacho_maritimo",
    keyAliases: ["despacho_maritimo", "despacho-maritimo", "despacho-cts"],
    title: "Despacho e registro de tripulação / CTS",
    category: "profissional",
    categoryDisplayName: "Embarcações profissionais",
    status: "in_review",
    statusLabel: "Requisitos em revisão",
    validationDate: "18/08/2026",
    validationDateFormatted: "Agosto de 2026 (Parcial)",
    officialSource: "NORMAM-01/DPC, Cap. 9 (Despacho) e NORMAM-13/DPC (Aquaviários)",
    sourceUrl: "https://www.marinha.mil.br/dpc/",
    requiredDocuments: [
      "Rol de equipagem assinado pelo Comandante da embarcação",
      "Caderneta de Inscrição e Registro (CIR) de todos os aquaviários com certificados STCW em dia",
      "Cartão de Tripulação de Segurança (CTS) original",
      "Certificados estatutários de navegabilidade da embarcação válidos",
    ],
    generatedDocuments: [
      "Minuta de Pedido de Despacho e Declaração de Tripulação de Segurança",
    ],
    missingValidationNote: "Pendente de validação da interoperabilidade com o sistema PSP/SISGEMAR da Capitania para conferência em tempo real de tripulantes aquaviários habilitados.",
    needsProfessionalReview: true,
    canFinalizeProtocol: false,
  },
];

/**
 * Busca uma definição de serviço no catálogo a partir de qualquer identificador ou alias.
 */
export function getServiceDefinition(identifier: string): ServiceDefinition {
  const normalized = (identifier || "").trim().toLowerCase();
  
  const found = NAVAL_SERVICES_CATALOG.find(
    (svc) => svc.id === normalized || svc.keyAliases.includes(normalized)
  );

  if (found) return found;

  // Fallback seguro caso um ID não mapeado seja enviado
  return {
    id: normalized || "servico_generico",
    keyAliases: [normalized],
    title: identifier || "Serviço Náutico",
    category: "all",
    categoryDisplayName: "Esporte e recreio / Geral",
    status: "unidentified_source",
    statusLabel: "Fonte não identificada",
    validationDate: "Pendente",
    validationDateFormatted: "Não validado",
    officialSource: "Em levantamento de normas",
    sourceUrl: "https://www.marinha.mil.br/dpc/",
    requiredDocuments: [
      "Documento de identificação com CPF",
      "Comprovante de residência atualizado",
      "Documento atual da embarcação",
    ],
    generatedDocuments: [
      "Requerimento genérico à Capitania dos Portos",
    ],
    missingValidationNote: "Este serviço não possui norma ou procedimento consolidado identificado. Requer consulta prévia à Capitania local.",
    needsProfessionalReview: true,
    canFinalizeProtocol: false,
  };
}

export const VALIDATED_SERVICES = NAVAL_SERVICES_CATALOG.filter((s) => s.status === "validated");
export const IN_REVIEW_SERVICES = NAVAL_SERVICES_CATALOG.filter((s) => s.status === "in_review");
export const UNIDENTIFIED_SERVICES = NAVAL_SERVICES_CATALOG.filter((s) => s.status === "unidentified_source");

