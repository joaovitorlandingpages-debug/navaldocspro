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
      "Comprovante de residência atualizado (expedido há no máximo 120 dias ou a vencer)",
    ],
    vesselDocs: [
      "TIE/TIEM original com validade vencida ou a vencer em até 30 dias (ou cópia simples se TIE digital)",
      "Boletim Simplificado de Atualização de Dados (BSADE - NORMAM-211 Anexo 2-D)",
    ],
    generatedDocs: [
      "Requerimento padrão ao Capitão dos Portos (NORMAM-211/DPC Anexo 2-E)",
      "BSADE (NORMAM-211/DPC Anexo 2-D)",
      "Procuração Náutica específica",
      "Guia de Recolhimento da União (GRU DPC)",
    ],
  },
  {
    kind: "transferencia",
    name: "Transferência de Propriedade",
    description: "Transferência de propriedade de embarcação (NORMAM-211/DPC item 0212 c/c CPES node/405)",
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
      "Autorização para Transferência de Propriedade (ATP / DUT Náutico) com reconhecimento de firma por autenticidade de comprador e vendedor (prazo: 60 dias para embarcações inscritas na Capitania; 15 dias no Tribunal Marítimo para AB > 100)",
      "Boletim Simplificado de Atualização de Dados (BSADE - NORMAM-211 Anexo 2-D) preenchido em 2 vias",
    ],
    generatedDocs: [
      "Requerimento padrão ao Capitão dos Portos (NORMAM-211/DPC Anexo 2-E)",
      "BSADE (NORMAM-211/DPC Anexo 2-D)",
      "Procuração Náutica específica",
      "Declaração de Residência do comprador (NORMAM-211 Anexo 2-I c/c Lei 7.115/1983)",
      "Guia de Recolhimento da União (GRU DPC)",
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
      "Comprovante de residência atualizado do proprietário (expedido há no máximo 120 dias ou a vencer)",
    ],
    vesselDocs: [
      "Nota fiscal do casco (ou documento de importação/escritura pública)",
      "Nota fiscal de aquisição do(s) motor(es) com número de série",
      "Declaração de Conformidade do Construtor / Memorial Descritivo com ART quitada de Engenheiro Naval responsável",
      "Fotografias da embarcação (costado e popa com nome e porto de inscrição visíveis)",
      "BSADE preenchido (NORMAM-211 Anexo 2-D)",
    ],
    generatedDocs: [
      "Requerimento padrão ao Capitão dos Portos (NORMAM-211/DPC Anexo 2-E)",
      "BSADE (NORMAM-211/DPC Anexo 2-D)",
      "Termo de Responsabilidade e Guarda da Embarcação",
      "Procuração Náutica específica",
      "Guia de Recolhimento da União (GRU DPC)",
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
      "BSADE retificado (NORMAM-211 Anexo 2-D)",
      "Laudo de Engenheiro Naval com ART: obrigatório se houver acréscimo de potência > 10% ou se exceder os limites da placa do fabricante",
    ],
    generatedDocs: [
      "Requerimento de Alteração de Motor / Dados Técnicos (NORMAM-211 Anexo 2-E)",
      "BSADE (NORMAM-211 Anexo 2-D)",
      "Procuração Náutica específica",
      "Guia de Recolhimento da União (GRU DPC)",
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
      "BSADE preenchido com as novas dimensões (NORMAM-211 Anexo 2-D)",
    ],
    generatedDocs: [
      "Requerimento de Alteração de Características (NORMAM-211 Anexo 2-E)",
      "BSADE (NORMAM-211 Anexo 2-D)",
      "Procuração Náutica específica",
      "Guia de Recolhimento da União (GRU DPC)",
    ],
  },
  {
    kind: "segunda_via",
    name: "Segunda Via",
    description: "Segunda via de documento náutico físico antigo (NORMAM-211/DPC item 0218 c/c Anexo 2-E e 2-J; TIE Digital com QR Code possui reimpressão gratuita)",
    icon: "📄",
    processType: "Segunda Via",
    needsPersonal: true,
    needsVessel: true,
    personalDocs: [
      "Documento oficial com foto e CPF do proprietário (RG/CNH)",
      "Comprovante de residência atualizado (expedido há no máximo 120 dias ou a vencer) ou Declaração Anexo 2-I",
    ],
    vesselDocs: [
      "Declaração de Perda/Extravio assinada (NORMAM-211/DPC Anexo 2-J, dispensado BO)",
      "Boletim de Ocorrência policial (BO) exclusivamente em caso comprovado de roubo ou furto",
      "BSADE (NORMAM-211 Anexo 2-D) e fotos da embarcação",
    ],
    generatedDocs: [
      "Requerimento de Segunda Via de Documento Náutico (NORMAM-211 Anexo 2-E)",
      "Declaração de Perda / Extravio de TIE/TIEM (NORMAM-211 Anexo 2-J)",
      "BSADE (NORMAM-211 Anexo 2-D)",
      "Procuração Náutica específica",
      "Guia de Recolhimento da União (GRU DPC)",
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
      "Comprovante de residência atualizado do requerente (máximo 120 dias)",
    ],
    vesselDocs: [
      "Documentos comprobatórios da posse/propriedade da embarcação",
      "BSADE preenchido (NORMAM-211 Anexo 2-D)",
      "Fotografias da embarcação e motor",
    ],
    generatedDocs: [
      "Requerimento padrão ao Capitão dos Portos (NORMAM-211/DPC Anexo 2-E)",
      "BSADE (NORMAM-211 Anexo 2-D)",
      "Termo de Responsabilidade e Guarda da Embarcação",
      "Declaração de Residência (NORMAM-211 Anexo 2-I c/c Lei 7.115/1983)",
      "Procuração Náutica específica",
      "Guia de Recolhimento da União (GRU DPC)",
    ],
  },
];

export const findService = (kind: ServiceKind) => SERVICES.find((s) => s.kind === kind)!;
