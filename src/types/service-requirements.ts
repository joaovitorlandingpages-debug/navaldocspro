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
    description: "Renovação do Título de Inscrição de Embarcação",
    icon: "🔄",
    processType: "Renovação de TIE/TIEM",
    needsPersonal: true,
    needsVessel: true,
    personalDocs: ["Documento com foto (CNH/RG)", "Comprovante de residência"],
    vesselDocs: ["Título anterior (TIE/TIEM)"],
    generatedDocs: ["Requerimento", "GRU"],
  },
  {
    kind: "transferencia",
    name: "Transferência de Propriedade",
    description: "Mudança de proprietário da embarcação",
    icon: "🔁",
    processType: "Transferência de Propriedade",
    needsPersonal: true,
    needsVessel: true,
    personalDocs: ["Documentos do comprador", "Documentos do vendedor"],
    vesselDocs: ["Título anterior", "Nota fiscal / contrato de compra e venda"],
    generatedDocs: ["Requerimento", "GRU", "Contrato"],
  },
  {
    kind: "registro_inicial",
    name: "Registro Inicial",
    description: "Primeira inscrição da embarcação",
    icon: "🆕",
    processType: "Registro Inicial",
    needsPersonal: true,
    needsVessel: true,
    personalDocs: ["Documento com foto", "Comprovante de residência"],
    vesselDocs: ["Nota fiscal da embarcação", "Memorial descritivo"],
    generatedDocs: ["Requerimento", "GRU", "Memorial"],
  },
  {
    kind: "alteracao_motor",
    name: "Alteração de Motor",
    description: "Substituição ou inclusão de motor",
    icon: "⚙️",
    processType: "Alteração de Motor",
    needsPersonal: false,
    needsVessel: true,
    personalDocs: [],
    vesselDocs: ["Nota fiscal do motor", "Dados técnicos do motor"],
    generatedDocs: ["Requerimento", "GRU"],
  },
  {
    kind: "alteracao_caracteristica",
    name: "Alteração de Característica",
    description: "Mudança de característica técnica da embarcação",
    icon: "📐",
    processType: "Alteração de Característica",
    needsPersonal: false,
    needsVessel: true,
    personalDocs: [],
    vesselDocs: ["Título atual", "Memorial das alterações"],
    generatedDocs: ["Requerimento", "GRU"],
  },
  {
    kind: "segunda_via",
    name: "Segunda Via",
    description: "Emissão de segunda via do título",
    icon: "📄",
    processType: "Segunda Via",
    needsPersonal: true,
    needsVessel: true,
    personalDocs: ["Documento com foto"],
    vesselDocs: ["Boletim de ocorrência (se aplicável)"],
    generatedDocs: ["Requerimento", "GRU"],
  },
  {
    kind: "regularizacao",
    name: "Regularização",
    description: "Regularização de embarcação não inscrita",
    icon: "✅",
    processType: "Regularização",
    needsPersonal: true,
    needsVessel: true,
    personalDocs: ["Documento com foto", "Comprovante de residência"],
    vesselDocs: ["Documentos disponíveis da embarcação"],
    generatedDocs: ["Requerimento", "GRU", "Declaração"],
  },
];

export const findService = (kind: ServiceKind) =>
  SERVICES.find((s) => s.kind === kind)!;
