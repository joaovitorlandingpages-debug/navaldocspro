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
    validationDate: "22/10/2026",
    validationDateFormatted: "Outubro de 2026",
    officialSource: "NORMAM-211/DPC (Portaria DPC/MB nº 115/2023 consolidada 2026), Cap. 2, Seção II, Item 0212 c/c CFPA (node/842) e CPSP (node/1134)",
    sourceUrl: "https://www.marinha.mil.br/cpsp/node/1134",
    requiredDocuments: [
      "Documento oficial de identificação com foto e CPF do adquirente e do alienante (RG/CNH ou carteira profissional válida)",
      "Comprovante de residência do adquirente expedido há no máximo 120 dias (ou a vencer), ou Declaração de Residência (NORMAM-211/DPC, Anexo 2-I)",
      "Título de Inscrição da Embarcação (TIE/TIEM) original (se físico antigo) ou cópia simples legível com QR Code (se TIE digital)",
      "Autorização para Transferência de Propriedade (ATP / DUT Náutico - NORMAM-211/DPC, Anexo 2-M) com firmas de vendedor e comprador reconhecidas por autenticidade em cartório (prazo regulatório: 60 dias da data de reconhecimento)",
      "Boletim Simplificado de Atualização de Dados da Embarcação (BSADE - NORMAM-211/DPC, Anexo 2-B) preenchido em 2 vias",
      "Guia de Recolhimento da União (GRU DPC) quitada referente ao serviço de transferência de propriedade",
      "Nota: A Comunicação de Transferência de Propriedade (NORMAM-211/DPC, Anexo 2-I) é ato facultativo e exclusivo do vendedor para comunicação da venda à Autoridade Marítima, não integrando a lista obrigatória do comprador nem bloqueando a transferência",
    ],
    generatedDocuments: [
      "Requerimento padrão de Transferência à Capitania dos Portos (NORMAM-211/DPC, Anexo 2-C)",
      "BSADE (NORMAM-211/DPC, Anexo 2-B)",
      "Procuração Náutica específica com poderes para representação administrativa",
      "Declaração de Residência (NORMAM-211/DPC, Anexo 2-I c/c Lei 7.115/1983)",
    ],
    needsProfessionalReview: false,
    canFinalizeProtocol: true,
  },
  {
    id: "renovacao_inscricao",
    keyAliases: [
      "renovacao_inscricao",
      "renovacao-inscricao",
      "renovacao_tie",
      "renovacao-tie",
      "renovacao",
    ],
    title: "Renovação de inscrição (TIE / TIEM)",
    category: "all",
    categoryDisplayName: "Esporte e recreio",
    status: "validated",
    statusLabel: "Requisitos conferidos",
    validationDate: "22/10/2026",
    validationDateFormatted: "Outubro de 2026",
    officialSource: "NORMAM-211/DPC, Cap. 2, Item 0214 • CFPA (node/842) / CPSP (node/1134)",
    sourceUrl: "https://www.marinha.mil.br/cfpa/node/842",
    requiredDocuments: [
      "Documento oficial com foto e CPF do proprietário (RG/CNH)",
      "Comprovante de residência expedido há no máximo 120 dias ou Declaração de Residência (NORMAM-211 Anexo 2-G)",
      "TIE/TIEM original com validade vencida ou a vencer em até 30 dias (ou cópia com QR Code se TIE digital)",
      "BSADE preenchido em 2 vias (NORMAM-211 Anexo 2-B)",
      "Comprovante de recolhimento da taxa GRU DPC de renovação de inscrição",
    ],
    generatedDocuments: [
      "Requerimento de Serviços à Capitania dos Portos (NORMAM-211/DPC, Anexo 2-C)",
      "BSADE (NORMAM-211/DPC, Anexo 2-B)",
      "Procuração Náutica para representação perante a Capitania",
    ],
    needsProfessionalReview: false,
    canFinalizeProtocol: true,
  },
  {
    id: "segunda_via",
    keyAliases: [
      "segunda_via",
      "segunda-via",
      "segunda_via_tie",
      "segunda-via-tie",
    ],
    title: "Segunda via de TIE físico antigo / Regularização",
    category: "all",
    categoryDisplayName: "Esporte e recreio",
    status: "validated",
    statusLabel: "Requisitos conferidos",
    validationDate: "22/10/2026",
    validationDateFormatted: "Outubro de 2026",
    officialSource: "NORMAM-211/DPC, Cap. 2, Item 0218 c/c Anexo 2-C e Anexo 2-H • CFPA / CPSP",
    sourceUrl: "https://www.marinha.mil.br/cfpa/node/842",
    requiredDocuments: [
      "Documento oficial com foto e CPF do proprietário (RG/CNH)",
      "Comprovante de residência com vencimento ocorrido há até 120 dias ou Declaração de Residência (NORMAM-211 Anexo 2-I)",
      "Declaração de Perda / Extravio (NORMAM-211/DPC, Anexo 2-H) assinada pelo proprietário sob as penas da lei (dispensa Boletim de Ocorrência policial em perda acidental)",
      "Boletim de Ocorrência Policial (BO) somente em casos comprovados de roubo ou furto",
      "BSADE em 2 vias (NORMAM-211 Anexo 2-B) e fotografias da embarcação (costado e popa)",
      "Guia GRU DPC quitada referente à 2ª via (Nota: se o documento já for TIE Digital com QR Code, a reimpressão no sistema oficial da Marinha é gratuita e independe de processo de 2ª via)",
    ],
    generatedDocuments: [
      "Requerimento de 2ª Via de Documento Náutico (NORMAM-211/DPC Anexo 2-C)",
      "Declaração de Perda / Extravio de Documento Náutico (NORMAM-211/DPC Anexo 2-H)",
      "BSADE (NORMAM-211/DPC Anexo 2-B)",
      "Procuração Náutica específica",
    ],
    needsProfessionalReview: false,
    canFinalizeProtocol: true,
  },
  {
    id: "inscricao_embarcacao",
    keyAliases: [
      "inscricao_embarcacao",
      "inscricao-embarcacao",
      "inscricao_inicial",
      "inscricao-inicial",
      "inscricao",
    ],
    title: "Inscrição inicial de embarcação",
    category: "all",
    categoryDisplayName: "Esporte e recreio",
    status: "validated",
    statusLabel: "Requisitos conferidos",
    validationDate: "22/10/2026",
    validationDateFormatted: "Outubro de 2026",
    officialSource: "NORMAM-211/DPC, Cap. 2, Seção I, Itens 0202 a 0205 • CFPA / CPSP",
    sourceUrl: "https://www.marinha.mil.br/cpsp/node/1134",
    requiredDocuments: [
      "Nota fiscal de aquisição do casco (ou documento de importação/escritura pública ou Declaração de Construção)",
      "Nota fiscal de aquisição do(s) motor(es) com número de série legível",
      "Declaração de Conformidade do Construtor / Memorial Descritivo (com ART quitada de Engenheiro Naval responsável quando exigido pelas características técnicas da embarcação)",
      "Documento oficial de identificação (RG/CNH) e Comprovante de Residência (expedido há no máximo 120 dias ou Declaração Anexo 2-I)",
      "Fotografias da embarcação (costado e popa com nome e porto visíveis)",
      "BSADE preenchido em 2 vias (NORMAM-211 Anexo 2-B)",
      "Comprovante de pagamento da GRU DPC para inscrição inicial",
    ],
    generatedDocuments: [
      "Requerimento para Inscrição de Embarcação (NORMAM-211/DPC Anexo 2-C)",
      "BSADE (NORMAM-211/DPC Anexo 2-B)",
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
    validationDate: "22/10/2026",
    validationDateFormatted: "Outubro de 2026",
    officialSource: "NORMAM-211/DPC, Cap. 2, Item 0216 • CFPA / CPSP",
    sourceUrl: "https://www.marinha.mil.br/cfpa/node/842",
    requiredDocuments: [
      "Documento comprobatório da alteração (certidão civil de casamento/divórcio, comprovante de endereço com até 120 dias ou contrato social se PJ)",
      "TIE/TIEM da embarcação (original físico ou cópia digital com QR Code)",
      "Documento oficial com foto e CPF do proprietário (RG/CNH)",
      "BSADE em 2 vias com os dados cadastrais retificados (NORMAM-211 Anexo 2-B)",
      "Guia GRU DPC paga quando exigível",
    ],
    generatedDocuments: [
      "Requerimento de Alteração de Dados Cadastrais (NORMAM-211 Anexo 2-C)",
      "BSADE (NORMAM-211 Anexo 2-B)",
      "Declaração de Residência Atualizada (NORMAM-211 Anexo 2-I c/c Lei 7.115/1983)",
      "Procuração Náutica",
    ],
    needsProfessionalReview: false,
    canFinalizeProtocol: true,
  },
  {
    id: "inscricao_moto_aquatica",
    keyAliases: ["inscricao_moto_aquatica", "moto_aquatica", "jet_ski", "registro_moto_aquatica"],
    title: "Inscrição de Moto Aquática (Jet Ski)",
    category: "all",
    categoryDisplayName: "Esporte e recreio",
    status: "validated",
    statusLabel: "Requisitos conferidos",
    validationDate: "22/10/2026",
    validationDateFormatted: "Outubro de 2026",
    officialSource: "NORMAM-212/DPC, Cap. 2 c/c Anexo 2-A • DPC",
    sourceUrl: "https://www.marinha.mil.br/cpsp/node/1134",
    requiredDocuments: [
      "Nota fiscal de aquisição da moto aquática e do motor (com número do casco - HIN/MIC)",
      "Documento oficial com foto e CPF do proprietário (habilitação náutica não exigida para titularidade)",
      "Comprovante de residência do adquirente expedido há no máximo 120 dias ou Declaração Anexo 2-I",
      "Termo de ciência de que a navegação exige condutor com habilitação de Motonauta (MTA)",
      "Comprovante de recolhimento da taxa GRU DPC para moto aquática",
    ],
    generatedDocuments: [
      "Requerimento Específico para Moto Aquática (NORMAM-212/DPC, Anexo 2-A)",
      "Procuração Náutica específica para Capitania dos Portos",
    ],
    needsProfessionalReview: false,
    canFinalizeProtocol: true,
  },
  {
    id: "renovacao_cha",
    keyAliases: ["renovacao_cha", "renovacao-cha", "cha", "habilitacao_amador"],
    title: "Renovação de Carteira de Habilitação de Amador (CHA)",
    category: "all",
    categoryDisplayName: "Esporte e recreio",
    status: "validated",
    statusLabel: "Requisitos conferidos",
    validationDate: "22/10/2026",
    validationDateFormatted: "Outubro de 2026",
    officialSource: "NORMAM-211/DPC, Cap. 5, Item 0515 c/c Portaria DPC/MB nº 54/2023",
    sourceUrl: "https://www.marinha.mil.br/cfpa/node/842",
    requiredDocuments: [
      "Carteira de Habilitação de Amador (CHA) anterior ou cópia",
      "Documento de identificação oficial com foto e CPF (RG ou CNH)",
      "Comprovante de residência expedido há no máximo 120 dias ou Declaração Anexo 2-G",
      "Cópia da CNH física ou digital válida (dispensa atestado médico por equivalência de aptidão física e mental)",
      "Comprovante de recolhimento da taxa GRU DPC de renovação de habilitação náutica",
    ],
    generatedDocuments: [
      "Requerimento de Serviços para Amador à Capitania dos Portos (NORMAM-211 Anexo 5-H)",
      "Procuração Náutica para retirada de CHA (se representado por despachante)",
    ],
    needsProfessionalReview: false,
    canFinalizeProtocol: true,
  },

  // =========================================================================
  // SERVIÇOS EM REVISÃO (REQUEREM ENGENHEIRO NAVAL / VISTORIA TÉCNICA)
  // =========================================================================
  {
    id: "alteracao_motor",
    keyAliases: ["alteracao_motor", "alteracao-motor", "troca-motor"],
    title: "Alteração de motor / Dados técnicos",
    category: "all",
    categoryDisplayName: "Esporte e recreio / Profissional",
    status: "in_review",
    statusLabel: "Requisitos em revisão",
    validationDate: "22/10/2026",
    validationDateFormatted: "Outubro de 2026 (Parcial)",
    officialSource: "NORMAM-211/DPC, Cap. 2, Item 0210 c/c NORMAM-201/DPC Cap. 3",
    sourceUrl: "https://www.marinha.mil.br/dpc/",
    requiredDocuments: [
      "Nota fiscal de aquisição do novo motor com potência, marca e número de série legíveis",
      "Termo de baixa/desinstalação do motor anterior",
      "TIE/TIEM da embarcação para averbação",
      "BSADE em 2 vias retificado (NORMAM-211 Anexo 2-B)",
      "Laudo Técnico com ART: pendente de confirmação do dispositivo normativo exato quanto aos limites de potência/placa exigidos por cada Capitania",
      "Comprovante de pagamento de taxa GRU DPC correspondente",
    ],
    generatedDocuments: [
      "Requerimento de Serviços para Alteração (NORMAM-211 Anexo 2-C)",
      "BSADE (NORMAM-211 Anexo 2-B)",
    ],
    missingValidationNote:
      "Pendente de localização do dispositivo oficial consolidado da DPC que define as balizas exatas de exigência de laudo e ART de instalação/troca de propulsão.",
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
    generatedDocuments: ["Minuta de Solicitação de Agendamento de Vistoria Oficial"],
    missingValidationNote:
      "Pendente de conferência com os checklists de vistoria das Capitanias regionais e disponibilidade de perito credenciado.",
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
    generatedDocuments: ["Minuta de Requerimento de Cancelamento de Inscrição / Baixa"],
    missingValidationNote:
      "Pendente de validação do rito entre embarcações registradas no Tribunal Marítimo (> 100 AB) versus inscritas exclusivamente na Capitania (< 100 AB).",
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
    generatedDocuments: ["Minuta estrutural de Memorial Descritivo de Estabilidade Naval"],
    missingValidationNote:
      "Atenção: Por determinação legal (Lei 5.194/66 e NORMAM-01), este laudo não pode ser emitido de forma automatizada sem conferência técnica, cálculo pericial e assinatura presencial ou digital ICP-Brasil com ART quitada por Engenheiro Naval registrado no CREA.",
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
    generatedDocuments: ["Minuta de Pedido de Despacho e Declaração de Tripulação de Segurança"],
    missingValidationNote:
      "Pendente de validação da interoperabilidade com o sistema PSP/SISGEMAR da Capitania para conferência em tempo real de tripulantes aquaviários habilitados.",
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
    (svc) => svc.id === normalized || svc.keyAliases.includes(normalized),
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
    generatedDocuments: ["Requerimento genérico à Capitania dos Portos"],
    missingValidationNote:
      "Este serviço não possui norma ou procedimento consolidado identificado. Requer consulta prévia à Capitania local.",
    needsProfessionalReview: true,
    canFinalizeProtocol: false,
  };
}

export const VALIDATED_SERVICES = NAVAL_SERVICES_CATALOG.filter((s) => s.status === "validated");
export const IN_REVIEW_SERVICES = NAVAL_SERVICES_CATALOG.filter((s) => s.status === "in_review");
export const UNIDENTIFIED_SERVICES = NAVAL_SERVICES_CATALOG.filter(
  (s) => s.status === "unidentified_source",
);
