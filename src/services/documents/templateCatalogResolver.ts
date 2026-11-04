/**
 * Serviço de Resolução e Validação de Modelos do Catálogo NavalDocs Pro.
 *
 * Garante a separação estrita entre:
 * 1. Código/slug de catálogo (ex: "proc-representacao-naval")
 * 2. Código oficial (ex: "PROC-NAV")
 * 3. UUID real do registro no banco de dados (document_templates.id)
 * 4. ID do processo e ID da empresa
 *
 * NUNCA envia slug em colunas UUID.
 * NUNCA inventa UUID aleatório para contornar integridade referencial.
 * Respeita escopo multi-empresa (prioridade empresa > global).
 */
import { supabase } from "@/integrations/supabase/client";

export interface CatalogTemplateItem {
  id: string; // Slug único de catálogo (mantido como id para compatibilidade de rotas e seleções)
  slug: string;
  code: string;
  name: string;
  description: string;
  category: "esporte_recreio" | "moto_aquatica" | "profissional" | "geral";
  categoryLabel: string;
  updatedAt: string;
  status: "aprovado" | "em_revisao";
  reviewReason?: string;
  requiredFields: string[];
  isMandatory: boolean;
  isConditional?: boolean;
  conditionText?: string;
  nature: "official_form" | "platform_generated"; // Distingue modelo oficial da Marinha de documento elaborado pela plataforma
  officialSource: string;
  validationDate: string;
  aliases: {
    codes: string[];
    names: string[];
  };
}

export const CATALOG_TEMPLATES: CatalogTemplateItem[] = [
  {
    id: "req-padrao-cpes",
    slug: "req-padrao-cpes",
    name: "Requerimento Padrão do Interessado",
    code: "REQ-001",
    description:
      "Requerimento oficial padronizado elaborado com base na NORMAM-211/DPC, Anexo 2-C para solicitação de serviços de registro, transferência, 2ª via e emissão de TIE/TIEM perante a Capitania dos Portos / Del / Agência.",
    category: "esporte_recreio",
    categoryLabel: "Esporte e recreio",
    updatedAt: "29/10/2026",
    status: "aprovado",
    nature: "official_form",
    reviewReason: "Modelo em conferência pela equipe NavalDocs",
    requiredFields: [
      "Nome do Cliente",
      "CPF/CNPJ do Cliente",
      "Nome da Embarcação",
    ],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC (Portaria DPC/MB nº 115/2023 consolidada 2026), Anexo 2-C • DPC / CPES",
    validationDate: "29/10/2026",
    aliases: {
      codes: ["req-padrao-cpes", "REQ-001", "REQ_INSCR", "REQ_PADRAO"],
      names: [
        "Requerimento Padrão do Interessado",
        "Requerimento de Inscrição",
        "Requerimento de Registro Inicial de Embarcação",
      ],
    },
  },
  {
    id: "proc-representacao-naval",
    slug: "proc-representacao-naval",
    name: "Procuração Específica para Capitania dos Portos",
    code: "PROC-NAV",
    description:
      "Instrumento particular de mandato outorgando poderes de representação ao despachante náutico para protocolo e acompanhamento administrativo perante a Marinha do Brasil.",
    category: "geral",
    categoryLabel: "Geral",
    updatedAt: "29/10/2026",
    status: "aprovado",
    nature: "platform_generated",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Responsável", "Outorgado"],
    isMandatory: true,
    isConditional: false,
    officialSource: "Código Civil Brasileiro (Lei 10.406/02, art. 653) c/c NORMAM-211/DPC e NORMAM-201/DPC",
    validationDate: "29/10/2026",
    aliases: {
      codes: [
        "proc-representacao-naval",
        "PROC-NAV",
        "PROC_PART_NAVAL",
        "PROC_SIMPLES_NAVAL",
      ],
      names: [
        "Procuração para Representação em Processo Naval",
        "Procuração Específica para Capitania dos Portos",
        "Procuração",
        "Procuração Simples Naval",
      ],
    },
  },
  {
    id: "decl-residencia-naval",
    slug: "decl-residencia-naval",
    name: "Declaração de Residência do Proprietário",
    code: "DEC-RES",
    description:
      "Declaração formal de domicílio sob as penas da Lei Federal nº 7.115/1983 e art. 299 do Código Penal para instrução de processos marítimos (NORMAM-211/DPC, Anexo 2-I).",
    category: "geral",
    categoryLabel: "Geral",
    updatedAt: "29/10/2026",
    status: "aprovado",
    nature: "platform_generated",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Endereço Completo"],
    isMandatory: false,
    isConditional: true,
    conditionText:
      "Dispensável caso o interessado apresente comprovante de residência próprio em seu nome emitido há menos de 120 dias.",
    officialSource: "NORMAM-211/DPC, Anexo 2-I c/c Lei Federal nº 7.115/1983",
    validationDate: "29/10/2026",
    aliases: {
      codes: ["decl-residencia-naval", "DEC-RES", "DECL_RES_NAVAL"],
      names: [
        "Declaração de Residência do Proprietário",
        "Declaração de Residência",
      ],
    },
  },
  {
    id: "req-moto-aquatica",
    slug: "req-moto-aquatica",
    name: "Requerimento Específico para Moto Aquática (Jet Ski)",
    code: "REQ-JET",
    description:
      "Formulário oficial padronizado (NORMAM-212/DPC, Anexo 2-A) para inscrição, transferência ou regularização de moto aquática com especificações de casco (HIN), propulsão a hidrojato e termo de salvatagem.",
    category: "moto_aquatica",
    categoryLabel: "Moto aquática",
    updatedAt: "03/11/2026",
    status: "aprovado",
    nature: "official_form",
    reviewReason: "Modelo oficial homologado conforme NORMAM-212/DPC Anexo 2-A",
    requiredFields: [
      "Nome do Cliente",
      "CPF/CNPJ do Cliente",
      "Nome da Embarcação",
    ],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-212/DPC, Anexo 2-A / Anexo 3-B • Diretoria de Portos e Costas / Marinha do Brasil",
    validationDate: "03/11/2026",
    aliases: {
      codes: [
        "req-moto-aquatica",
        "REQ-JET",
        "REQ_MOTO_AQUATICA",
        "doc_req_moto_aquatica",
        "MOTO_AQUATICA",
        "REQ_MOTO",
        "ANEXO-2-A-212",
      ],
      names: [
        "Requerimento Específico para Moto Aquática (Jet Ski)",
        "Requerimento para Moto Aquática",
        "Requerimento Jet Ski",
        "Requerimento de Moto Aquática",
      ],
    },
  },
  {
    id: "bsade-simplificado",
    slug: "bsade-simplificado",
    name: "Boletim de Simplificação e Atualização de Dados (BSADE)",
    code: "BSADE-001",
    description:
      "Boletim oficial padronizado (NORMAM-211/DPC, Anexo 2-B) para inscrição inicial e registro das características técnicas, dimensões, propulsão e lotação em 2 vias.",
    category: "esporte_recreio",
    categoryLabel: "Esporte e recreio",
    updatedAt: "29/10/2026",
    status: "aprovado",
    nature: "official_form",
    reviewReason: "Modelo em conferência pela equipe NavalDocs",
    requiredFields: [
      "Nome do Cliente",
      "CPF/CNPJ do Cliente",
      "Nome da Embarcação",
    ],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC (Portaria DPC/DGN/MB Nº 200/2026), Anexo 2-B",
    validationDate: "29/10/2026",
    aliases: {
      codes: ["bsade-simplificado", "BSADE-001", "BSADE", "BADE_BSADE"],
      names: [
        "Boletim de Simplificação e Atualização de Dados (BSADE)",
        "BSADE",
        "Boletim Simplificado",
        "BADE/BSADE",
      ],
    },
  },
  {
    id: "req-transferencia",
    slug: "req-transferencia",
    name: "Requerimento de Transferência de Propriedade",
    code: "REQ-TRANSF",
    description:
      "Requerimento oficial padronizado (NORMAM-211/DPC, Anexo 2-C c/c item 2.11) para emissão de novo TIE decorrente de transferência de propriedade e/ou jurisdição.",
    category: "esporte_recreio",
    categoryLabel: "Esporte e recreio",
    updatedAt: "03/11/2026",
    status: "aprovado",
    nature: "official_form",
    reviewReason: "Modelo em conferência pela equipe NavalDocs",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Nome da Embarcação", "Número de Inscrição"],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC (Portaria DPC/DGN/MB Nº 200/2026), Anexo 2-C c/c item 2.11 • DPC / Marinha do Brasil",
    validationDate: "03/11/2026",
    aliases: {
      codes: ["req-transferencia", "REQ-TRANSF", "REQ_TRANSFERENCIA", "doc_req_transf"],
      names: [
        "Requerimento de Transferência de Propriedade",
        "Requerimento de Transferência",
        "Transferência de Propriedade",
      ],
    },
  },
  {
    id: "termo-entrega-transf",
    slug: "termo-entrega-transf",
    name: "Autorização de Transferência de Propriedade (Anexo 2-K)",
    code: "TER-ENTR",
    description:
      "Formulário oficial de Autorização de Transferência de Propriedade (NORMAM-211/DPC, Anexo 2-K e item 2.11) com discriminação de motores, qualificação bilateral de vendedor e comprador e reconhecimento de firmas por autenticidade.",
    category: "esporte_recreio",
    categoryLabel: "Esporte e recreio",
    updatedAt: "03/11/2026",
    status: "aprovado",
    nature: "official_form",
    reviewReason: "Modelo em conferência pela equipe NavalDocs",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Nome da Embarcação", "Número de Inscrição"],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC (Portaria DPC/MB nº 115/2023 consolidada pela Portaria DPC/DGN/MB Nº 200/2026), Anexo 2-K • Marinha do Brasil",
    validationDate: "03/11/2026",
    aliases: {
      codes: [
        "termo-entrega-transf",
        "TER-ENTR",
        "DECL_TRANSF",
        "ATPE",
        "ATPE-001",
        "ANEXO-2-K",
        "ANEXO-2-M",
        "doc_decl_transf",
      ],
      names: [
        "Autorização de Transferência de Propriedade (Anexo 2-K)",
        "Autorização de Transferência de Propriedade (Anexo 2-M)",
        "Termo de Entrega e Responsabilidade (Transferência)",
        "Termo de Entrega e Declaração de Responsabilidade",
        "Declaração de Transferência",
        "Autorização de Transferência de Propriedade",
        "ATPE",
      ],
    },
  },
  {
    id: "req-renovacao-tie",
    slug: "req-renovacao-tie",
    name: "Requerimento de Renovação de TIE/TIEM",
    code: "REQ-RENOV",
    description:
      "Requerimento padronizado oficial (NORMAM-211/DPC, item 2.7 / Anexo 2-C) para prorrogação da validade do documento de inscrição náutica (TIE/TIEM).",
    category: "esporte_recreio",
    categoryLabel: "Esporte e recreio",
    updatedAt: "03/11/2026",
    status: "aprovado",
    nature: "official_form",
    reviewReason: "Modelo oficial homologado conforme NORMAM-211/DPC item 2.7 e Anexo 2-C",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Nome da Embarcação", "Número de Inscrição"],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC, item 2.7 e Anexo 2-C (Portaria DPC/DGN/MB Nº 200/2026)",
    validationDate: "03/11/2026",
    aliases: {
      codes: ["req-renovacao-tie", "REQ-RENOV", "REQ_RENOVACAO", "doc_req_renov"],
      names: [
        "Requerimento de Renovação de TIE/TIEM",
        "Requerimento de Renovação",
        "Renovação de Documento",
        "Requerimento de Renovação de TIE",
      ],
    },
  },
  {
    id: "decl-manutencao-renov",
    slug: "decl-manutencao-renov",
    name: "Declaração de Manutenção e Condições Operacionais",
    code: "DEC-OPER",
    description:
      "Declaração formal sob as penas da Lei Federal nº 7.115/1983 e NORMAM-211/DPC (item 2.7) atestando integridade do casco, propulsão original e salvatagem completa para renovação de TIE/TIEM sem vistoria prévia.",
    category: "geral",
    categoryLabel: "Geral",
    updatedAt: "03/11/2026",
    status: "aprovado",
    nature: "platform_generated",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Nome da Embarcação", "Número de Inscrição"],
    isMandatory: false,
    isConditional: true,
    conditionText: "Exigida para renovação de TIE quando dispensada a vistoria técnica presencial.",
    officialSource: "NORMAM-211/DPC item 2.7 c/c Lei Federal nº 7.115/1983",
    validationDate: "03/11/2026",
    aliases: {
      codes: ["decl-manutencao-renov", "DEC-OPER", "DECL_RENOV", "doc_decl_renov", "DEC-MANUT"],
      names: [
        "Declaração de Manutenção e Condições Operacionais",
        "Declaração do Interessado para Renovação",
        "Declaração de Manutenção Operacional",
      ],
    },
  },
  {
    id: "req-alteracao-motor",
    slug: "req-alteracao-motor",
    name: "Requerimento de Alteração de Motor e Termo de Responsabilidade",
    code: "REQ-MOT",
    description:
      "Requerimento oficial padronizado (NORMAM-211/DPC, item 2.12 / 2.10 e Anexo 2-C) para averbação de nova propulsão no TIE/TIEM acompanhado de termo de compatibilidade técnica.",
    category: "esporte_recreio",
    categoryLabel: "Esporte e recreio",
    updatedAt: "03/11/2026",
    status: "aprovado",
    nature: "official_form",
    reviewReason: "Modelo oficial homologado conforme NORMAM-211/DPC item 2.12 e Anexo 2-C",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Nome da Embarcação", "Número de Inscrição", "Potência do Motor"],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC, item 2.12 / 2.10 e Anexo 2-C (Portaria DPC/DGN/MB Nº 200/2026)",
    validationDate: "03/11/2026",
    aliases: {
      codes: ["req-alteracao-motor", "REQ-MOT", "TERMO_MOTOR", "ALT_MOTOR", "doc_termo_motor"],
      names: [
        "Requerimento de Alteração de Motor e Termo de Responsabilidade",
        "Requerimento de Alteração de Motor",
        "Termo de Responsabilidade Técnica (Motor)",
        "Autorização para Substituição de Motor",
      ],
    },
  },
  {
    id: "comunicacao-transf-anexo-2i",
    slug: "comunicacao-transf-anexo-2i",
    name: "Comunicação de Transferência de Propriedade (Anexo 2-I)",
    code: "COM-TRANSF",
    description:
      "Formulário oficial de Comunicação de Transferência de Propriedade (NORMAM-211/DPC, Anexo 2-I, pág. 198) protocolado pelo proprietário anterior (vendedor) para afastar penalidades e responsabilidades perante a Capitania dos Portos.",
    category: "esporte_recreio",
    categoryLabel: "Esporte e recreio",
    updatedAt: "03/11/2026",
    status: "aprovado",
    nature: "official_form",
    reviewReason: "Modelo oficial homologado conforme NORMAM-211/DPC Anexo 2-I",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Nome da Embarcação", "Número de Inscrição"],
    isMandatory: false,
    isConditional: true,
    conditionText: "Recomendado ao proprietário anterior (vendedor) para evitar a incidência de multas após a entrega da embarcação.",
    officialSource: "NORMAM-211/DPC, Anexo 2-I (Portaria DPC/MB nº 115/2023 consolidada pela Portaria DPC/DGN/MB Nº 200/2026, pág. 198)",
    validationDate: "03/11/2026",
    aliases: {
      codes: ["comunicacao-transf-anexo-2i", "COM-TRANSF", "ANEXO-2I", "ANEXO_2I", "doc_comunicacao_transf"],
      names: [
        "Comunicação de Transferência de Propriedade (Anexo 2-I)",
        "Comunicação de Transferência",
        "Anexo 2-I Comunicação",
        "Comunicação de Venda Náutica",
      ],
    },
  },
  {
    id: "req-segunda-via-tie",
    slug: "req-segunda-via-tie",
    name: "Requerimento de Segunda Via de Documento Náutico",
    code: "REQ-2VIA",
    description:
      "Requerimento oficial padronizado (NORMAM-211/DPC, item 0214 / Anexo 2-C) para solicitação de 2ª via de TIE/TIEM por perda, extravio ou dano.",
    category: "esporte_recreio",
    categoryLabel: "Esporte e recreio",
    updatedAt: "29/10/2026",
    status: "aprovado",
    nature: "official_form",
    reviewReason: "Modelo em conferência pela equipe NavalDocs",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Nome da Embarcação", "Número de Inscrição"],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC (Portaria DPC/DGN/MB Nº 200/2026), Anexo 2-C c/c item 2.14 • DPC / Marinha do Brasil",
    validationDate: "29/10/2026",
    aliases: {
      codes: ["req-segunda-via-tie", "REQ-2VIA", "REQ_2VIA", "doc_req_segunda_via"],
      names: [
        "Requerimento de Segunda Via de Documento Náutico",
        "Requerimento de 2ª Via de TIE/TIEM",
        "Segunda Via TIE",
      ],
    },
  },
  {
    id: "decl-perda-extravio",
    slug: "decl-perda-extravio",
    name: "Declaração de Perda / Extravio de Documento Náutico",
    code: "DEC-PERD",
    description:
      "Declaração formal sob as penas da lei (NORMAM-211/DPC, Anexo 2-H) para perda acidental, extravio, furto, roubo ou dano irreparável de documento náutico.",
    category: "geral",
    categoryLabel: "Geral",
    updatedAt: "03/11/2026",
    status: "aprovado",
    nature: "official_form",
    reviewReason: "Modelo em conferência pela equipe NavalDocs",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Nome da Embarcação", "Número de Inscrição"],
    isMandatory: false,
    isConditional: true,
    conditionText:
      "Exigido formalmente em casos de perda, extravio, furto ou roubo do documento original de inscrição da embarcação para solicitação de 2ª via perante a Capitania dos Portos.",
    officialSource: "NORMAM-211/DPC (Portaria DPC/MB nº 115/2023 consolidada pela Portaria DPC/DGN/MB Nº 200/2026), Anexo 2-H c/c art. 299 do Código Penal",
    validationDate: "03/11/2026",
    aliases: {
      codes: [
        "decl-perda-extravio",
        "DEC-PERD",
        "DEC-PERDA",
        "DECL_PERDA",
        "DECL_EXTRAVIO",
        "doc_decl_perda",
        "ANEXO-2-H",
      ],
      names: [
        "Declaração de Perda / Extravio de TIE",
        "Declaração de Extravio ou Perda de Documento",
        "Declaração de Perda",
      ],
    },
  },
  {
    id: "req-vistoria-naval",
    slug: "req-vistoria-naval",
    name: "Requerimento de Vistoria / Perícia Naval",
    code: "REQ-VIST",
    description:
      "Requerimento oficial padronizado (NORMAM-211/DPC, Capítulo 3 c/c Anexo 2-C) para solicitação de vistoria inicial, arqueação, reclassificação ou especial pela Capitania dos Portos.",
    category: "esporte_recreio",
    categoryLabel: "Esporte e recreio",
    updatedAt: "03/11/2026",
    status: "aprovado",
    nature: "official_form",
    reviewReason: "Modelo oficial homologado conforme NORMAM-211/DPC Capítulo 3 e Anexo 2-C",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Nome da Embarcação"],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC (Portaria DPC/DGN/MB Nº 200/2026), Capítulo 3 c/c Anexo 2-C • DPC / Marinha do Brasil",
    validationDate: "03/11/2026",
    aliases: {
      codes: [
        "req-vistoria-naval",
        "REQ-VIST",
        "REQ_VISTORIA",
        "doc_req_vistoria",
        "REQ_VISTORIA_NAVAL",
        "VISTORIA_NAVAL",
      ],
      names: [
        "Requerimento de Vistoria / Perícia Naval",
        "Requerimento de Vistoria Técnica",
        "Vistoria Naval",
        "Requerimento de Vistoria",
      ],
    },
  },
  {
    id: "req-comercial-prof",
    slug: "req-comercial-prof",
    name: "Requerimento de Embarcação Profissional / Comercial",
    code: "REQ-PROF",
    description:
      "Requerimento oficial padronizado (NORMAM-201/DPC, Anexo 2-E) para inscrição, regularização ou transferência de embarcações comerciais e profissionais (transporte de passageiros, carga, pesca e apoio portuário).",
    category: "profissional",
    categoryLabel: "Embarcações profissionais",
    updatedAt: "03/11/2026",
    status: "aprovado",
    nature: "official_form",
    reviewReason: "Modelo oficial homologado conforme NORMAM-201/DPC Anexo 2-E",
    requiredFields: [
      "Nome do Cliente",
      "CPF/CNPJ do Cliente",
      "Nome da Embarcação",
    ],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-201/DPC, Anexo 2-E • Diretoria de Portos e Costas / Marinha do Brasil",
    validationDate: "03/11/2026",
    aliases: {
      codes: [
        "req-comercial-prof",
        "REQ-PROF",
        "REQ_INSCR",
        "doc_req_comercial",
        "REQ_COMERCIAL",
        "REQ_PROFISSIONAL",
        "EMB_COMERCIAL",
        "ANEXO-2-E-201",
      ],
      names: [
        "Requerimento de Embarcação Profissional / Comercial",
        "Requerimento de Inscrição Comercial",
        "Requerimento Comercial",
        "Requerimento de Regularização de Embarcação Comercial",
      ],
    },
  },
  {
    id: "req-habilitacao-cha",
    slug: "req-habilitacao-cha",
    name: "Requerimento para Habilitação Náutica de Amador (CHA)",
    code: "REQ-CHA",
    description:
      "Requerimento oficial padronizado (NORMAM-211/DPC Anexo 5-H / Capítulo 5) para inscrição em exame, emissão ou renovação da Carteira de Habilitação de Amador em 2 páginas.",
    category: "geral",
    categoryLabel: "Geral",
    updatedAt: "03/11/2026",
    status: "aprovado",
    nature: "official_form",
    reviewReason:
      "Homologado em auditoria com o Anexo 5-H da NORMAM-211/DPC (páginas 254-255 da Portaria DPC/MB consolidada) contendo os 12 serviços oficiais e discriminação do pedido em 2 páginas estritas.",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente"],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC, Capítulo 5 c/c Anexo 5-H • DPC",
    validationDate: "03/11/2026",
    aliases: {
      codes: [
        "req-habilitacao-cha",
        "REQ-CHA",
        "REQ_CHA",
        "doc_req_cha",
        "ANEXO-5-H",
        "ANEXO_5_H",
      ],
      names: [
        "Requerimento para Habilitação Náutica de Amador (CHA)",
        "Requerimento de CHA",
        "Habilitação Náutica Amador",
        "Requerimento de Amador (Anexo 5-H)",
        "Requerimento de Habilitação de Amador",
      ],
    },
  },
  {
    id: "req-alteracao-cadastral",
    slug: "req-alteracao-cadastral",
    name: "Requerimento de Alteração Cadastral do Proprietário",
    code: "REQ-CAD",
    description:
      "Requerimento padronizado (NORMAM-211/DPC, item 0213 / Anexo 2-C) para atualização de domicílio ou dados civis do titular perante a Capitania dos Portos.",
    category: "geral",
    categoryLabel: "Geral",
    updatedAt: "03/11/2026",
    status: "aprovado",
    nature: "official_form",
    reviewReason:
      "Homologado em auditoria com NORMAM-211/DPC Anexo 2-C c/c item 0213 para atualização cadastral e comprovação de endereço em 1 página estrita.",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Endereço Completo"],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC, item 0213 c/c Anexo 2-C • DPC",
    validationDate: "03/11/2026",
    aliases: {
      codes: [
        "req-alteracao-cadastral",
        "REQ-CAD",
        "ALT_CADASTRO",
        "doc_req_alteracao_cadastral",
        "doc_req_alt_cad",
        "ALT_CAD",
      ],
      names: [
        "Requerimento de Alteração Cadastral do Proprietário",
        "Alteração Cadastral",
        "Atualização Cadastral do Proprietário",
      ],
    },
  },
  {
    id: "comunicacao-despacho",
    slug: "comunicacao-despacho",
    name: "Comunicação de Saída / Despacho na Capitania",
    code: "COM-DESP",
    description:
      "Aviso oficial prévio de saída, tráfego, trajeto e rol de pessoas a bordo (NORMAM-211/DPC, Anexo 4-A / Diretrizes NAVSEG).",
    category: "geral",
    categoryLabel: "Geral",
    updatedAt: "03/11/2026",
    status: "aprovado",
    nature: "official_form",
    reviewReason:
      "Homologado em auditoria com NORMAM-211/DPC Anexo 4-A (Aviso de Saída de Embarcação) c/c Diretrizes NAVSEG da Autoridade Marítima em 1 página estrita.",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Nome da Embarcação"],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC, Anexo 4-A c/c Diretrizes NAVSEG • DPC",
    validationDate: "03/11/2026",
    aliases: {
      codes: [
        "comunicacao-despacho",
        "COM-DESP",
        "DESPACHO_SAIDA",
        "doc_comunicacao_despacho",
        "AVISO_SAIDA",
        "ANEXO_4_A",
        "ANEXO-4-A",
      ],
      names: [
        "Comunicação de Saída / Despacho na Capitania",
        "Comunicação de Despacho",
        "Despacho de Saída",
        "Aviso de Saída de Embarcação (Anexo 4-A)",
        "Aviso de Saída NAVSEG",
      ],
    },
  },
  {
    id: "decl-perda-cha",
    slug: "decl-perda-cha",
    name: "Declaração de Perda / Extravio de CHA (Anexo 5-D)",
    code: "DEC-CHA",
    description:
      "Declaração militar oficial padronizada (NORMAM-211/DPC, Anexo 5-D) para solicitação de 2ª via de Carteira de Habilitação de Amador em caso de perda, roubo, furto ou dano.",
    category: "geral",
    categoryLabel: "Geral",
    updatedAt: "03/11/2026",
    status: "aprovado",
    nature: "official_form",
    reviewReason:
      "Homologado em auditoria com o Anexo 5-D da NORMAM-211/DPC (página física 244) com advertência penal do Art. 299 do Código Penal em 1 página estrita.",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente"],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC, Capítulo 5 c/c Anexo 5-D • DPC",
    validationDate: "03/11/2026",
    aliases: {
      codes: [
        "decl-perda-cha",
        "DEC-CHA",
        "doc_decl_perda_cha",
        "ANEXO-5-D",
        "ANEXO_5_D",
        "PERDA_CHA",
      ],
      names: [
        "Declaração de Perda / Extravio de CHA (Anexo 5-D)",
        "Declaração de Extravio de Habilitação de Amador",
        "Declaração de Extravio CHA",
      ],
    },
  },
  {
    id: "bade-embarcacao-maior",
    slug: "bade-embarcacao-maior",
    name: "Boletim de Atualização de Embarcações - BADE (Anexo 2-A)",
    code: "BADE-001",
    description:
      "Formulário cadastral oficial (NORMAM-211/DPC, Anexo 2-A) em 2 páginas para inscrição ou atualização de embarcações de médio/grande porte (não miúdas ou sujeitas ao TM).",
    category: "geral",
    categoryLabel: "Geral",
    updatedAt: "04/11/2026",
    status: "aprovado",
    nature: "official_form",
    reviewReason:
      "Homologado em auditoria com o Anexo 2-A da NORMAM-211/DPC (páginas físicas 179-180) cobrindo os 70 campos oficiais em 2 páginas estritas.",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Nome da Embarcação"],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC, Capítulo 2 c/c Anexo 2-A • DPC",
    validationDate: "04/11/2026",
    aliases: {
      codes: [
        "bade-embarcacao-maior",
        "BADE-001",
        "doc_bade",
        "ANEXO-2-A",
        "ANEXO_2_A",
        "BADE",
      ],
      names: [
        "Boletim de Atualização de Embarcações - BADE (Anexo 2-A)",
        "BADE Oficial Marinha",
        "Boletim BADE",
      ],
    },
  },
  {
    id: "decl-construcao-miuda",
    slug: "decl-construcao-miuda",
    name: "Declaração de Construção de Embarcação Miúda (Anexo 2-J)",
    code: "DEC-CONST",
    description:
      "Declaração oficial sob as penas da lei (NORMAM-211/DPC, Anexo 2-J) para comprovação de construção amadora de embarcação miúda com recursos próprios.",
    category: "geral",
    categoryLabel: "Geral",
    updatedAt: "04/11/2026",
    status: "aprovado",
    nature: "official_form",
    reviewReason:
      "Homologado em auditoria com o Anexo 2-J da NORMAM-211/DPC (página física 200) com advertência penal do Art. 299 CP em 1 página estrita.",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente", "Nome da Embarcação"],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC, Capítulo 2 c/c Anexo 2-J • DPC",
    validationDate: "04/11/2026",
    aliases: {
      codes: [
        "decl-construcao-miuda",
        "DEC-CONST",
        "doc_decl_construcao",
        "ANEXO-2-J",
        "ANEXO_2_J",
        "CONSTRUCAO_MIUDA",
      ],
      names: [
        "Declaração de Construção de Embarcação Miúda (Anexo 2-J)",
        "Declaração de Construção Amadora",
        "Construção Miúda Anexo 2-J",
      ],
    },
  },
  {
    id: "atestado-treinamento-ara",
    slug: "atestado-treinamento-ara",
    name: "Atestado de Treinamento para Arrais-Amador (Anexo 5-E)",
    code: "ATE-ARA",
    description:
      "Atestado oficial emitido por Estabelecimento de Treinamento Náutico (NORMAM-211/DPC, Anexo 5-E) comprovando treinamento prático de no mínimo 6 horas para Arrais-Amador.",
    category: "geral",
    categoryLabel: "Geral",
    updatedAt: "03/11/2026",
    status: "aprovado",
    nature: "official_form",
    reviewReason:
      "Homologado em auditoria com o Anexo 5-E da NORMAM-211/DPC (página física 246) contendo plano de treinamento, carga horária e responsabilidade técnica em 1 página estrita.",
    requiredFields: ["Nome do Cliente", "CPF/CNPJ do Cliente"],
    isMandatory: true,
    isConditional: false,
    officialSource: "NORMAM-211/DPC, Capítulo 5 c/c Anexo 5-E • DPC",
    validationDate: "03/11/2026",
    aliases: {
      codes: [
        "atestado-treinamento-ara",
        "ATE-ARA",
        "doc_atestado_ara",
        "ANEXO-5-E",
        "ANEXO_5_E",
        "TREINAMENTO_ARA",
      ],
      names: [
        "Atestado de Treinamento para Arrais-Amador (Anexo 5-E)",
        "Atestado de Embarque para Arrais-Amador",
        "Atestado de Treinamento Náutico (ARA)",
      ],
    },
  },
];

export interface ResolvedTemplateResult {
  catalogItem: CatalogTemplateItem;
  dbTemplateId: string | null;
  dbTemplateRecord: any | null;
  resolutionSource: "company_code" | "company_alias" | "company_name" | "global_code" | "global_alias" | "global_name" | "not_found";
}

/**
 * Carrega todos os templates disponíveis para a empresa atual e globais
 */
export async function loadDatabaseTemplates(companyId?: string): Promise<any[]> {
  try {
    let query = supabase
      .from("document_templates")
      .select("id, code, name, category, is_global, company_id, lifecycle_status, is_active");

    if (companyId) {
      query = query.or(`company_id.eq.${companyId},company_id.is.null,is_global.eq.true`);
    } else {
      query = query.or("company_id.is.null,is_global.eq.true");
    }

    const { data, error } = await query;
    if (error) {
      console.error("[templateCatalogResolver] Erro ao carregar templates do banco:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("[templateCatalogResolver] Falha inesperada ao consultar templates:", err);
    return [];
  }
}

/**
 * Resolve um item do catálogo para um registro real no banco de dados.
 * Prioridade:
 * 1. Template da empresa por código exato (slug ou code)
 * 2. Template da empresa por códigos alternativos
 * 3. Template da empresa por nome
 * 4. Template global por código exato (slug ou code)
 * 5. Template global por códigos alternativos
 * 6. Template global por nome
 */
export function resolveCatalogTemplate(
  catalogItem: CatalogTemplateItem,
  dbTemplates: any[],
  companyId?: string,
): ResolvedTemplateResult {
  const norm = (s?: string | null) => (s || "").trim().toLowerCase();

  // 1. Empresa: código exato
  let match = dbTemplates.find(
    (t) =>
      companyId &&
      t.company_id === companyId &&
      (norm(t.code) === norm(catalogItem.slug) || norm(t.code) === norm(catalogItem.code)),
  );
  if (match) {
    return {
      catalogItem,
      dbTemplateId: match.id,
      dbTemplateRecord: match,
      resolutionSource: "company_code",
    };
  }

  // 2. Empresa: alias de código
  match = dbTemplates.find(
    (t) =>
      companyId &&
      t.company_id === companyId &&
      catalogItem.aliases.codes.some((c) => norm(c) === norm(t.code)),
  );
  if (match) {
    return {
      catalogItem,
      dbTemplateId: match.id,
      dbTemplateRecord: match,
      resolutionSource: "company_alias",
    };
  }

  // 3. Empresa: alias de nome
  match = dbTemplates.find(
    (t) =>
      companyId &&
      t.company_id === companyId &&
      catalogItem.aliases.names.some((n) => norm(n) === norm(t.name)),
  );
  if (match) {
    return {
      catalogItem,
      dbTemplateId: match.id,
      dbTemplateRecord: match,
      resolutionSource: "company_name",
    };
  }

  // 4. Global: código exato
  match = dbTemplates.find(
    (t) =>
      (t.is_global || !t.company_id) &&
      (norm(t.code) === norm(catalogItem.slug) || norm(t.code) === norm(catalogItem.code)),
  );
  if (match) {
    return {
      catalogItem,
      dbTemplateId: match.id,
      dbTemplateRecord: match,
      resolutionSource: "global_code",
    };
  }

  // 5. Global: alias de código
  match = dbTemplates.find(
    (t) =>
      (t.is_global || !t.company_id) &&
      catalogItem.aliases.codes.some((c) => norm(c) === norm(t.code)),
  );
  if (match) {
    return {
      catalogItem,
      dbTemplateId: match.id,
      dbTemplateRecord: match,
      resolutionSource: "global_alias",
    };
  }

  // 6. Global: alias de nome
  match = dbTemplates.find(
    (t) =>
      (t.is_global || !t.company_id) &&
      catalogItem.aliases.names.some((n) => norm(n) === norm(t.name)),
  );
  if (match) {
    return {
      catalogItem,
      dbTemplateId: match.id,
      dbTemplateRecord: match,
      resolutionSource: "global_name",
    };
  }

  return {
    catalogItem,
    dbTemplateId: null,
    dbTemplateRecord: null,
    resolutionSource: "not_found",
  };
}

/**
 * Validação granular de campos obrigatórios por modelo.
 * Bloqueia APENAS os documentos que realmente exigem campos ausentes.
 * Por exemplo: Declaração de Residência NUNCA exige dados de embarcação.
 */
export function checkTemplateMissingRequirements(
  tpl: CatalogTemplateItem,
  customer: any,
  vessel: any,
  staff: any,
  company?: any,
  outorgadoTypeOverride?: "pf" | "pj",
): { isBlocked: boolean; missingFields: string[] } {
  const missing: string[] = [];

  const hasCustomerName = !!(customer?.name || customer?.fantasy_name);
  const hasCustomerDoc = !!(customer?.cpf_cnpj || customer?.document);
  const hasCustomerAddress = !!(customer?.address && customer?.city);
  const hasStaff = !!(staff?.name && staff?.name !== "Não informado");
  const hasVesselName = !!vessel?.name;
  const hasVesselRegistration = !!(vessel?.registration_number && vessel.registration_number.trim() !== "");
  const hasVesselOwner = !!(vessel?.current_owner_name && vessel.current_owner_name.trim() !== "") || hasCustomerName;

  // Outorgado da Procuração: identificação explícita de PF vs PJ
  // Se explicitado pelo usuário/processo, usa a preferência.
  // Caso contrário, se a empresa tiver outorgado_tipo configurado, usa ele.
  // Se não houver preferência e a empresa NÃO tiver CNPJ de PJ (ou se tiver procurador_nome/cpf), considera PF.
  const explicitType = outorgadoTypeOverride || company?.outorgado_tipo || (company?.cnpj ? "pj" : "pf");
  const isOutorgadoPF = explicitType === "pf" || (!company?.cnpj && !outorgadoTypeOverride);

  const hasProcuradorPFName = !!(company?.procurador_nome || staff?.name);
  const hasProcuradorPFCpf = !!company?.procurador_cpf;
  const hasCompanyPJDoc = !!(company?.cnpj && (company?.contact_address || company?.address));
  const hasCompanyPJName = !!(company?.name || company?.razao_social);

  for (const field of tpl.requiredFields) {
    if (field === "Nome do Cliente" && !hasCustomerName) {
      missing.push("Nome do Cliente");
    }
    if (field === "CPF/CNPJ do Cliente" && !hasCustomerDoc) {
      missing.push("CPF ou CNPJ do Cliente");
    }
    if (field === "Endereço Completo" && !hasCustomerAddress) {
      missing.push("Endereço Completo");
    }
    if (field === "Responsável" && !hasStaff) {
      missing.push("Funcionário / Operador Responsável");
    }
    if (field === "Nome da Embarcação" && !hasVesselName) {
      missing.push("Nome da Embarcação");
    }
    if (field === "Proprietário da Embarcação" && !hasVesselOwner) {
      missing.push("Proprietário da Embarcação");
    }
    if (field === "Número de Inscrição" && !hasVesselRegistration) {
      missing.push("Número de Inscrição da Embarcação");
    }
    if (field === "Potência do Motor") {
      const hasEnginePower = !!(
        vessel?.engine_power ||
        vessel?.motor_power ||
        (vessel as any)?.potencia_motor ||
        (vessel as any)?.novo_motor_potencia
      );
      if (!hasEnginePower) {
        missing.push("Potência do Motor");
      }
    }
    if (field === "Outorgado") {
      if (isOutorgadoPF) {
        if (!hasProcuradorPFName) {
          missing.push("Nome Completo do Outorgado (Pessoa Física)");
        }
        if (!hasProcuradorPFCpf) {
          missing.push("CPF do Outorgado (Pessoa Física)");
        }
      } else {
        if (!hasCompanyPJName) {
          missing.push("Razão Social da Outorgada (Pessoa Jurídica)");
        }
        if (!hasCompanyPJDoc) {
          missing.push("CNPJ e Endereço da Sede (Outorgada Pessoa Jurídica)");
        }
      }
    }
  }

  return {
    isBlocked: missing.length > 0,
    missingFields: missing,
  };
}

/**
 * Busca item do catálogo por slug ou ID
 */
export function getCatalogTemplateBySlug(slug: string): CatalogTemplateItem | undefined {
  return CATALOG_TEMPLATES.find((t) => t.slug === slug || t.id === slug);
}
