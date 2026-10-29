export type ServiceKind =
  | "renovacao"
  | "transferencia"
  | "registro_inicial"
  | "alteracao_motor"
  | "alteracao_caracteristica"
  | "segunda_via"
  | "regularizacao";

export interface ServiceDef {
  kind: ServiceKind;
  name: string;
  description: string;
  icon: string;
  processType: string; // value stored in processes.process_type
  needsPersonal: boolean;
  needsVessel: boolean;
  personalDocs: string[];
  vesselDocs: string[];
  generatedDocs: string[];
}

export const SERVICES: ServiceDef[] = [
  {
    kind: "renovacao",
    name: "Renovação de TIE/TIEM",
    description: "Renovação do Título de Inscrição de Embarcação (NORMAM-211/DPC item 0214)",
    icon: "🔄",
    processType: "Renovação de TIE/TIEM",
    needsPersonal: true,
    needsVessel: true,
    personalDocs: [
      "Documento oficial com foto e CPF (RG/CNH)",
      "Comprovante de residência atualizado (expedido há no máximo 120 dias ou a vencer) ou Declaração Anexo 2-I",
    ],
    vesselDocs: [
      "TIE/TIEM original com validade vencida ou a vencer em até 30 dias (ou cópia simples se TIE digital)",
      "Boletim Simplificado de Atualização de Dados em 2 vias (BSADE - NORMAM-211 Anexo 2-B)",
      "Comprovante de recolhimento da taxa GRU DPC emitida no canal oficial da Marinha",
    ],
    generatedDocs: [
      "Requerimento de Serviços à Capitania dos Portos (NORMAM-211/DPC Anexo 2-C)",
      "BSADE (NORMAM-211/DPC Anexo 2-B)",
      "Procuração Náutica específica",
    ],
  },
  {
    kind: "transferencia",
    name: "Transferência de Propriedade",
    description: "Transferência de propriedade de embarcação (NORMAM-211/DPC item 0212 c/c CFPA node/842 e CPSP node/1134)",
    icon: "🔁",
    processType: "Transferência de Propriedade",
    needsPersonal: true,
    needsVessel: true,
    personalDocs: [
      "Documento oficial com foto e CPF do adquirente e alienante (RG/CNH)",
      "Comprovante de residência do adquirente (expedido há no máximo 120 dias ou a vencer) ou Declaração Anexo 2-I",
    ],
    vesselDocs: [
      "Título de Inscrição da Embarcação (TIE/TIEM) original (se físico antigo) ou cópia com QR Code (se TIE digital)",
      "Autorização para Transferência de Propriedade (ATP / DUT Náutico - NORMAM-211 Anexo 2-M) com reconhecimento de firma por autenticidade em cartório de ambas as partes (prazo: 60 dias da data de reconhecimento)",
      "Boletim Simplificado de Atualização de Dados (BSADE - NORMAM-211 Anexo 2-B) preenchido em 2 vias",
      "Comprovante de pagamento da GRU DPC correspondente à transferência emitida no canal oficial da Marinha",
    ],
    generatedDocs: [
      "Requerimento padrão à Capitania dos Portos (NORMAM-211/DPC Anexo 2-C)",
      "BSADE (NORMAM-211/DPC Anexo 2-B)",
      "Procuração Náutica específica",
      "Declaração de Residência do comprador (NORMAM-211 Anexo 2-I c/c Lei 7.115/1983)",
    ],
  },
  {
    kind: "registro_inicial",
    name: "Registro Inicial",
    description: "Inscrição inicial de embarcação nova ou construída (NORMAM-211/DPC itens 0202 a 0205)",
    icon: "🆕",
    processType: "Registro Inicial",
    needsPersonal: true,
    needsVessel: true,
    personalDocs: [
      "Documento oficial de identificação com foto e CPF (RG/CNH)",
      "Comprovante de residência atualizado do proprietário (expedido há no máximo 120 dias ou Declaração Anexo 2-I)",
    ],
    vesselDocs: [
      "Nota fiscal do casco (ou documento de importação/escritura pública ou Declaração de Construção)",
      "Nota fiscal de aquisição do(s) motor(es) com número de série",
      "Declaração de Conformidade do Construtor / Memorial Descritivo com ART de Engenheiro Naval quando exigido pela norma",
      "Fotografias da embarcação (costado e popa com nome e porto de inscrição visíveis)",
      "BSADE preenchido em 2 vias (NORMAM-211 Anexo 2-B)",
      "Comprovante de pagamento da taxa GRU DPC de inscrição inicial emitida no canal oficial da Marinha",
    ],
    generatedDocs: [
      "Requerimento de Serviços à Capitania dos Portos (NORMAM-211/DPC Anexo 2-C)",
      "BSADE (NORMAM-211/DPC Anexo 2-B)",
      "Termo de Responsabilidade e Guarda da Embarcação",
      "Procuração Náutica específica",
    ],
  },
  {
    kind: "alteracao_motor",
    name: "Alteração de Motor",
    description: "Substituição, troca ou averbação de motor (NORMAM-211/DPC item 0210 c/c NORMAM-201/DPC Cap. 3)",
    icon: "⚙️",
    processType: "Alteração de Motor",
    needsPersonal: false,
    needsVessel: true,
    personalDocs: [
      "Documento de identificação do proprietário (RG/CNH)",
    ],
    vesselDocs: [
      "TIE/TIEM original da embarcação (ou cópia se TIE digital)",
      "Nota fiscal do novo motor com potência, marca e número de série legíveis",
      "Termo de baixa/desinstalação do motor anterior",
      "BSADE retificado em 2 vias (NORMAM-211 Anexo 2-B)",
      "Laudo de Engenheiro Naval com ART (conforme exigência técnica aplicável ao caso)",
      "Comprovante de pagamento da taxa GRU DPC emitida no canal oficial da Marinha",
    ],
    generatedDocs: [
      "Requerimento de Serviços para Alteração (NORMAM-211 Anexo 2-C)",
      "BSADE (NORMAM-211 Anexo 2-B)",
      "Procuração Náutica específica",
    ],
  },
  {
    kind: "alteracao_caracteristica",
    name: "Alteração de Característica",
    description: "Modificação estrutural ou técnica de embarcação (NORMAM-201/DPC e NORMAM-211/DPC)",
    icon: "📐",
    processType: "Alteração de Característica",
    needsPersonal: false,
    needsVessel: true,
    personalDocs: [
      "Documento de identificação do proprietário (RG/CNH)",
    ],
    vesselDocs: [
      "TIE/TIEM da embarcação",
      "Memorial descritivo das alterações técnicas e plano de estabilidade",
      "ART quitada de Engenheiro Naval responsável",
      "BSADE preenchido com as novas dimensões (NORMAM-211 Anexo 2-B)",
      "Comprovante de pagamento da taxa GRU DPC emitida no canal oficial da Marinha",
    ],
    generatedDocs: [
      "Requerimento de Serviços para Alteração (NORMAM-211 Anexo 2-C)",
      "BSADE (NORMAM-211 Anexo 2-B)",
      "Procuração Náutica específica",
    ],
  },
  {
    kind: "segunda_via",
    name: "Segunda Via",
    description: "Segunda via de documento náutico físico antigo (NORMAM-211/DPC item 0218 c/c Anexo 2-C e 2-H; TIE Digital com QR Code possui reimpressão gratuita)",
    icon: "📄",
    processType: "Segunda Via",
    needsPersonal: true,
    needsVessel: true,
    personalDocs: [
      "Documento oficial com foto e CPF do proprietário (RG/CNH)",
      "Comprovante de residência atualizado (expedido há no máximo 120 dias ou a vencer) ou Declaração Anexo 2-I",
    ],
    vesselDocs: [
      "Declaração de Perda / Extravio assinada (NORMAM-211/DPC Anexo 2-H, dispensado BO)",
      "Boletim de Ocorrência policial (BO) exclusivamente em caso comprovado de roubo ou furto",
      "BSADE em 2 vias (NORMAM-211 Anexo 2-B) e fotos da embarcação",
      "Comprovante de recolhimento da taxa GRU DPC de 2ª via emitida no canal oficial da Marinha",
    ],
    generatedDocs: [
      "Requerimento de Segunda Via de Documento Náutico (NORMAM-211 Anexo 2-C)",
      "Declaração de Perda / Extravio de TIE/TIEM (NORMAM-211 Anexo 2-H)",
      "BSADE (NORMAM-211 Anexo 2-B)",
      "Procuração Náutica específica",
    ],
  },
  {
    kind: "regularizacao",
    name: "Regularização",
    description: "Regularização de documentação ou situação cadastral de embarcação perante a Autoridade Marítima",
    icon: "✅",
    processType: "Regularização",
    needsPersonal: true,
    needsVessel: true,
    personalDocs: [
      "Documento oficial com foto e CPF (RG/CNH)",
      "Comprovante de residência atualizado do requerente (máximo 120 dias ou Declaração Anexo 2-I)",
    ],
    vesselDocs: [
      "Documentos comprobatórios da posse/propriedade da embarcação",
      "BSADE preenchido em 2 vias (NORMAM-211 Anexo 2-B)",
      "Fotografias da embarcação e motor",
      "Comprovante de pagamento de taxa GRU DPC correspondente emitida no canal oficial da Marinha",
    ],
    generatedDocs: [
      "Requerimento padrão à Capitania dos Portos (NORMAM-211/DPC Anexo 2-C)",
      "BSADE (NORMAM-211 Anexo 2-B)",
      "Termo de Responsabilidade e Guarda da Embarcação",
      "Declaração de Residência (NORMAM-211 Anexo 2-I c/c Lei 7.115/1983)",
      "Procuração Náutica específica",
    ],
  },
];

export const findService = (kind: ServiceKind) => SERVICES.find((s) => s.kind === kind)!;
