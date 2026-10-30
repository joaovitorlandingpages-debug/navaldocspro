import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import {
  ArrowLeft, Search, Check, Ship, ArrowLeftRight, FileText,
  Wrench, FileCheck, CheckCircle2, ChevronRight, X, Info,
  AlertCircle, Upload, Sparkles, User, Award, FileSpreadsheet,
  UserCheck, Anchor, Loader2, ArrowRight, Pencil, ChevronDown,
  ChevronUp, Plus, Building2, CheckSquare, Eye, Clock, AlertTriangle,
  FolderOpen, ExternalLink, RefreshCw, Layers, Shield, FileSignature, Paperclip
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/routes/dashboard";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/processes/novo-pedido")({
  validateSearch: (search: Record<string, unknown>): { customerId?: string; vesselId?: string; preview?: string; step?: string; services?: string } => ({
    customerId: (search.customerId as string) || undefined,
    vesselId: (search.vesselId as string) || undefined,
    preview: (search.preview as string) || undefined,
    step: (search.step as string) || undefined,
    services: (search.services as string) || undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <NovoPedidoPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

// Catálogo de serviços oficial do NavalDocs Pro
interface ServiceItem {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: any;
  requiresVessel: boolean;
  category: "maritimo" | "pessoal" | "tecnico";
}

const SERVICES_CATALOG: ServiceItem[] = [
  {
    id: "inscricao",
    name: "Inscrição de embarcação",
    shortName: "Inscrição",
    description: "Cadastrar uma embarcação no sistema.",
    icon: Ship,
    requiresVessel: true,
    category: "maritimo",
  },
  {
    id: "transferencia",
    name: "Transferência de propriedade",
    shortName: "Transferência",
    description: "Registrar a mudança de proprietário.",
    icon: ArrowLeftRight,
    requiresVessel: true,
    category: "maritimo",
  },
  {
    id: "renovacao",
    name: "Renovação de documento",
    shortName: "Renovação",
    description: "Renovar um documento existente.",
    icon: FileText,
    requiresVessel: true,
    category: "maritimo",
  },
  {
    id: "alteracao_motor",
    name: "Alteração de motor",
    shortName: "Alteração de motor",
    description: "Atualizar dados do motor da embarcação.",
    icon: Wrench,
    requiresVessel: true,
    category: "maritimo",
  },
  {
    id: "vistoria",
    name: "Vistoria",
    shortName: "Vistoria",
    description: "Organizar a solicitação de vistoria.",
    icon: Search,
    requiresVessel: true,
    category: "maritimo",
  },
  {
    id: "segunda_via",
    name: "Segunda via de documento",
    shortName: "Segunda via",
    description: "Emitir uma segunda via.",
    icon: FileCheck,
    requiresVessel: true,
    category: "maritimo",
  },
  // Serviços adicionais do catálogo
  {
    id: "habilitacao_cha",
    name: "Emissão / Renovação de CHA",
    shortName: "Habilitação náutica",
    description: "Carteira de Habilitação de Amador (Arrais, Mestre ou Capitão).",
    icon: Award,
    requiresVessel: false,
    category: "pessoal",
  },
  {
    id: "laudo_engenharia",
    name: "Laudo Técnico Pericial",
    shortName: "Laudo técnico",
    description: "Perícia de estabilidade, arqueação e engenharia naval.",
    icon: FileSpreadsheet,
    requiresVessel: true,
    category: "tecnico",
  },
  {
    id: "alteracao_cadastral",
    name: "Alteração Cadastral",
    shortName: "Alteração cadastral",
    description: "Atualização de endereço ou dados do proprietário.",
    icon: UserCheck,
    requiresVessel: false,
    category: "pessoal",
  },
  {
    id: "despacho_porto",
    name: "Despacho de Saída / Entrada",
    shortName: "Despacho",
    description: "Comunicação de tráfego e autorização na Capitania.",
    icon: Anchor,
    requiresVessel: true,
    category: "maritimo",
  },
];

// Dados mock para o modo preview (idênticos à referência visual)
const PREVIEW_CUSTOMERS = [
  { id: "prev-c1", name: "Marina Costa", document_number: "042.819.330-12", email: "marina@costa.com.br", phone: "(11) 98765-4321", type: "PF" },
  { id: "prev-c2", name: "Carlos Eduardo Ramos", document_number: "192.834.721-09", email: "carlos.ramos@empresa.com", phone: "(21) 99876-1234", type: "PF" },
  { id: "prev-c3", name: "Roberto Alencar", document_number: "554.218.990-44", email: "roberto@nautica.com", phone: "(13) 97654-8899", type: "PF" },
  { id: "prev-c4", name: "Oceanic Brasil Navegação LTDA", document_number: "12.345.678/0001-90", email: "contato@oceanic.com.br", phone: "(11) 3344-5566", type: "PJ" },
];

const PREVIEW_VESSELS = [
  { id: "prev-v1", name: "Mar Azul", vessel_type: "Lancha", customer_id: "prev-c1", customer_name: "Marina Costa", registration_number: "381-000123" },
  { id: "prev-v2", name: "Vento Forte", vessel_type: "Veleiro", customer_id: "prev-c1", customer_name: "Marina Costa", registration_number: "381-000456" },
  { id: "prev-v3", name: "Estrela do Mar", vessel_type: "Iate", customer_id: "prev-c2", customer_name: "Carlos Eduardo Ramos", registration_number: "381-000789" },
];

export interface ExtractedFieldItem {
  id: string;
  label: string;
  value: string;
  confidence: number;
  page: number;
  isCritical?: boolean;
}

export type OutputDocAction = "gerar" | "anexar" | "ignorar";

export interface OutputDocRequirementItem {
  id: string;
  name: string;
  isProtocolOnly: boolean; // Se false: necessário para preencher PDF; se true: exigido apenas para protocolo
  why: string;
  sharedWithDocIds?: string[];
}

export interface OutputDocumentConfig {
  id: string;
  name: string;
  serviceId: string;
  serviceName: string;
  documentType: "official_form" | "platform_generated";
  officialSource: string;
  sourceUrl: string;
  editionDate: string;
  purpose: string;
  signerRole: string;
  personalDataFields: { name: string; found: boolean; value?: string }[];
  vesselDataFields: { name: string; found: boolean; value?: string }[];
  attachments: OutputDocRequirementItem[];
}

export const OUTPUT_DOCS_CATALOG: OutputDocumentConfig[] = [
  {
    id: "doc_req_inscricao",
    name: "Requerimento de Inscrição Inicial de Embarcação",
    serviceId: "inscricao",
    serviceName: "Inscrição de embarcação",
    documentType: "official_form",
    officialSource: "NORMAM-211/DPC, Anexo 2-C / Anexo 2-E (Portaria DPC/MB nº 115/2023 consolidada 2026)",
    sourceUrl: "https://www.marinha.mil.br/dpc/normam-211",
    editionDate: "Edição Consolidada 2026 (Portaria DPC/MB nº 115/2023)",
    purpose: "Formalizar o pedido oficial de inscrição da embarcação de esporte e recreio perante a Capitania dos Portos, Delegacia ou Agência.",
    signerRole: "Proprietário Requerente (ou Procurador constituído)",
    personalDataFields: [
      { name: "Nome Completo do Proprietário", found: true },
      { name: "CPF / CNPJ", found: true },
      { name: "RG e Órgão Emissor", found: true },
      { name: "Endereço Residencial Completo com CEP", found: true },
      { name: "Telefone e E-mail", found: true },
    ],
    vesselDataFields: [
      { name: "Nome Pretendido da Embarcação", found: true },
      { name: "Tipo / Classificação / Atividade", found: true },
      { name: "Área de Navegação (Interior/Mar Aberto)", found: true },
      { name: "Comprimento e Arqueação", found: true },
    ],
    attachments: [
      { id: "doc-nf-casco", name: "Nota Fiscal do Casco / Declaração de Construção", isProtocolOnly: false, why: "Fornece número da NF e estaleiro/construtor para preenchimento dos campos do formulário", sharedWithDocIds: ["doc_bsade"] },
      { id: "doc-nf-motor-inscricao", name: "Nota Fiscal do Motor", isProtocolOnly: false, why: "Fornece marca, modelo, potência (HP) e número de série para o formulário", sharedWithDocIds: ["doc_bsade"] },
      { id: "doc-id-proprietario", name: "Documento de Identidade do Proprietário (RG/CNH)", isProtocolOnly: false, why: "Qualificação civil completa do requerente", sharedWithDocIds: ["doc_procuracao"] },
      { id: "doc-comp-residencia", name: "Comprovante de Residência", isProtocolOnly: false, why: "Endereço e comarca da autoridade de registro" },
      { id: "doc-fotos-embarcacao", name: "Fotografias da Embarcação (costado e popa)", isProtocolOnly: true, why: "Exigência exclusiva de protocolo da Capitania para conferência do nome e porto gravados no casco" },
    ],
  },
  {
    id: "doc_bsade",
    name: "Boletim de Simplificação e Atualização de Dados (BSADE)",
    serviceId: "inscricao",
    serviceName: "Inscrição de embarcação",
    documentType: "official_form",
    officialSource: "NORMAM-211/DPC, Anexo 2-B / Anexo 2-D (Portaria DPC/MB nº 115/2023 consolidada 2026)",
    sourceUrl: "https://www.marinha.mil.br/dpc/normam-211",
    editionDate: "Edição Consolidada 2026 (Portaria DPC/MB nº 115/2023)",
    purpose: "Boletim oficial emitido em 2 vias contendo a ficha técnica estrutural, dimensões, arqueação, sistema de propulsão e lotação da embarcação.",
    signerRole: "Proprietário ou Responsável Legal",
    personalDataFields: [
      { name: "Nome do Proprietário", found: true },
      { name: "CPF / CNPJ", found: true },
    ],
    vesselDataFields: [
      { name: "Comprimento total, Boca, Pontal e Calado", found: true },
      { name: "Arqueação Bruta e Líquida", found: true },
      { name: "Ano de Construção e Estaleiro", found: true },
      { name: "Quantidade de Motores, Marca, Potência e Série", found: true },
      { name: "Lotação autorizada (tripulantes + passageiros)", found: true },
    ],
    attachments: [
      { id: "doc-nf-casco", name: "Nota Fiscal do Casco", isProtocolOnly: false, why: "Extração de dimensões e número de série do fabricante", sharedWithDocIds: ["doc_req_inscricao"] },
      { id: "doc-nf-motor-inscricao", name: "Nota Fiscal do Motor", isProtocolOnly: false, why: "Extração de potência (HP) e série do propulsor", sharedWithDocIds: ["doc_req_inscricao"] },
    ],
  },
  {
    id: "doc_procuracao",
    name: "Instrumento Particular de Procuração Náutica",
    serviceId: "inscricao",
    serviceName: "Inscrição de embarcação",
    documentType: "platform_generated",
    officialSource: "Código Civil (Lei nº 10.406/2002, art. 653) c/c NORMAM-211/DPC item 0205",
    sourceUrl: "https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm",
    editionDate: "Lei Federal consolidada / NORMAM-211 item 0205",
    purpose: "Documento particular da plataforma para constituir procurador com poderes específicos para representar o outorgante perante a Capitania dos Portos.",
    signerRole: "Outorgante (Proprietário da Embarcação)",
    personalDataFields: [
      { name: "Nome do Outorgante", found: true },
      { name: "CPF e RG do Outorgante", found: true },
      { name: "Endereço Completo", found: true },
      { name: "Qualificação do Outorgado (Despachante)", found: true },
    ],
    vesselDataFields: [
      { name: "Identificação da Embarcação Objeto do Mandato", found: true },
    ],
    attachments: [
      { id: "doc-id-proprietario", name: "Documento de Identidade do Outorgante", isProtocolOnly: false, why: "Qualificação do mandante no instrumento", sharedWithDocIds: ["doc_req_inscricao"] },
    ],
  },
  {
    id: "doc_req_transf",
    name: "Requerimento de Transferência de Propriedade",
    serviceId: "transferencia",
    serviceName: "Transferência de propriedade",
    documentType: "official_form",
    officialSource: "NORMAM-211/DPC, Anexo 2-C / Anexo 2-E e item 0208",
    sourceUrl: "https://www.marinha.mil.br/dpc/normam-211",
    editionDate: "Edição Consolidada 2026 (Portaria DPC/MB nº 115/2023)",
    purpose: "Requerer a averbação de nova titularidade e expedição de novo TIE em nome do comprador adquirente.",
    signerRole: "Adquirente (Comprador) e/ou Vendedor",
    personalDataFields: [
      { name: "Qualificação do Adquirente", found: true },
      { name: "Qualificação do Transmitente (Vendedor)", found: true },
    ],
    vesselDataFields: [
      { name: "Nome e Número de Inscrição (TIE)", found: true },
      { name: "Porto de Inscrição", found: true },
    ],
    attachments: [
      { id: "doc-embarcacao-transf", name: "Documento da Embarcação (TIE anterior)", isProtocolOnly: false, why: "Conferência do número de inscrição e titularidade anterior", sharedWithDocIds: ["doc_decl_transf"] },
      { id: "doc-comprador", name: "Documento de Identificação do Comprador", isProtocolOnly: false, why: "Qualificação civil do novo proprietário", sharedWithDocIds: ["doc_decl_transf"] },
      { id: "doc-vendedor", name: "Documento de Identificação do Vendedor", isProtocolOnly: false, why: "Validação da firma transmitente", sharedWithDocIds: ["doc_decl_transf"] },
    ],
  },
  {
    id: "doc_decl_transf",
    name: "Autorização de Transferência de Propriedade (Anexo 2-M)",
    serviceId: "transferencia",
    serviceName: "Transferência de propriedade",
    documentType: "official_form",
    officialSource: "NORMAM-211/DPC, Anexo 2-M (Portaria DPC/MB nº 115/2023 consolidada 2026)",
    sourceUrl: "https://www.marinha.mil.br/dpc/normam-211",
    editionDate: "Edição Consolidada 2026",
    purpose: "Formulário oficial de autorização de transferência de propriedade com firmas reconhecidas por autenticidade do vendedor e comprador.",
    signerRole: "Transmitente (Vendedor) e Adquirente (Comprador)",
    personalDataFields: [
      { name: "Identificação das Partes e Endereços", found: true },
      { name: "Valor da Transação Comercial", found: true },
    ],
    vesselDataFields: [
      { name: "Dados da Embarcação e Motores Instalados", found: true },
    ],
    attachments: [
      { id: "doc-embarcacao-transf", name: "TIE da Embarcação", isProtocolOnly: false, why: "Vinculação formal da embarcação e motores", sharedWithDocIds: ["doc_req_transf"] },
    ],
  },
  {
    id: "doc_req_renov",
    name: "Requerimento de Renovação de TIE/TIEM",
    serviceId: "renovacao",
    serviceName: "Renovação de documento",
    documentType: "official_form",
    officialSource: "NORMAM-211/DPC, Anexo 2-C / Anexo 2-E e item 0212",
    sourceUrl: "https://www.marinha.mil.br/dpc/normam-211",
    editionDate: "Edição Consolidada 2026",
    purpose: "Solicitar nova via de documento de inscrição com prazo de validade prorrogado por mais 5 anos.",
    signerRole: "Proprietário Requerente",
    personalDataFields: [
      { name: "Nome e Documento do Proprietário", found: true },
    ],
    vesselDataFields: [
      { name: "Nome, Inscrição e Validade Anterior", found: true },
    ],
    attachments: [
      { id: "doc-embarcacao-renov", name: "TIE/TIEM Vencido ou a Vencer", isProtocolOnly: false, why: "Registro dos dados anteriores para renovação", sharedWithDocIds: ["doc_decl_renov"] },
    ],
  },
  {
    id: "doc_decl_renov",
    name: "Declaração de Manutenção e Condições Operacionais",
    serviceId: "renovacao",
    serviceName: "Renovação de documento",
    documentType: "platform_generated",
    officialSource: "Documento Próprio da Plataforma c/c NORMAM-211/DPC item 0212 e Lei Federal nº 7.115/1983",
    sourceUrl: "https://www.marinha.mil.br/dpc/normam-211",
    editionDate: "Modelo Próprio NavalDocs / Lei Federal 7.115/1983",
    purpose: "Declaração particular elaborada pela plataforma atestando sob as penas da lei que a embarcação mantém inalteradas as condições de salvatagem.",
    signerRole: "Proprietário ou Responsável Operacional",
    personalDataFields: [
      { name: "Nome e CPF do Declarante", found: true },
    ],
    vesselDataFields: [
      { name: "Dados de Inscrição da Embarcação", found: true },
    ],
    attachments: [
      { id: "doc-embarcacao-renov", name: "TIE/TIEM da Embarcação", isProtocolOnly: false, why: "Conferência cadastral", sharedWithDocIds: ["doc_req_renov"] },
    ],
  },
  {
    id: "doc_termo_motor",
    name: "Requerimento de Alteração de Motor e Termo de Responsabilidade",
    serviceId: "alteracao_motor",
    serviceName: "Alteração de motor",
    documentType: "official_form",
    officialSource: "NORMAM-211/DPC, item 0210 e Anexo 2-C / Anexo 2-E",
    sourceUrl: "https://www.marinha.mil.br/dpc/normam-211",
    editionDate: "Edição Consolidada 2026",
    purpose: "Requerer a averbação da substituição de motor de propulsão e registrar nova potência/série no TIE.",
    signerRole: "Proprietário e Responsável Técnico (quando couber)",
    personalDataFields: [
      { name: "Qualificação do Requerente", found: true },
    ],
    vesselDataFields: [
      { name: "Embarcação e Dados do Novo Motor", found: true },
    ],
    attachments: [
      { id: "doc-motor-alt", name: "Nota Fiscal do Novo Motor", isProtocolOnly: false, why: "Comprovação de aquisição legítima e especificações técnicas do propulsor" },
    ],
  },
  {
    id: "doc_req_segunda_via",
    name: "Requerimento de Segunda Via de Documento Náutico",
    serviceId: "segunda_via",
    serviceName: "Segunda via de documento",
    documentType: "official_form",
    officialSource: "NORMAM-211/DPC, Anexo 2-C / Anexo 2-E e item 0214",
    sourceUrl: "https://www.marinha.mil.br/dpc/normam-211",
    editionDate: "Edição Consolidada 2026",
    purpose: "Solicitar 2ª via de TIE/TIEM por perda, extravio, furto, roubo ou dano irreparável do documento original.",
    signerRole: "Proprietário Requerente",
    personalDataFields: [
      { name: "Nome Completo do Proprietário", found: true },
      { name: "CPF / CNPJ", found: true },
    ],
    vesselDataFields: [
      { name: "Nome e Número de Inscrição da Embarcação", found: true },
    ],
    attachments: [
      { id: "doc-bo-extravio", name: "Boletim de Ocorrência (BO) ou Declaração Anexo 2-J", isProtocolOnly: false, why: "Comprovação formal do extravio perante a autoridade" },
      { id: "doc-id-proprietario", name: "Documento de Identidade do Proprietário", isProtocolOnly: false, why: "Qualificação civil do titular", sharedWithDocIds: ["doc_decl_perda"] },
    ],
  },
  {
    id: "doc_decl_perda",
    name: "Declaração de Perda / Extravio de Documento Náutico",
    serviceId: "segunda_via",
    serviceName: "Segunda via de documento",
    documentType: "official_form",
    officialSource: "NORMAM-211/DPC, Anexo 2-J (Portaria DPC/MB nº 115/2023 consolidada 2026)",
    sourceUrl: "https://www.marinha.mil.br/dpc/normam-211",
    editionDate: "Edição Consolidada 2026",
    purpose: "Formulário oficial preenchido pelo proprietário declarando o extravio de TIE/TIEM sob as penas do art. 299 do Código Penal.",
    signerRole: "Proprietário Declarante",
    personalDataFields: [
      { name: "Nome e CPF do Declarante", found: true },
      { name: "Endereço Residencial Completo", found: true },
    ],
    vesselDataFields: [
      { name: "Identificação da Embarcação e Documento Extraviado", found: true },
    ],
    attachments: [
      { id: "doc-id-proprietario", name: "Documento de Identidade do Proprietário", isProtocolOnly: false, why: "Validação da firma declarante", sharedWithDocIds: ["doc_req_segunda_via"] },
    ],
  },
  {
    id: "doc_req_vistoria",
    name: "Requerimento de Vistoria / Perícia Naval",
    serviceId: "vistoria",
    serviceName: "Vistoria",
    documentType: "official_form",
    officialSource: "NORMAM-211/DPC, Anexo 2-E e Capítulo 3 / NORMAM-201/DPC item 0302",
    sourceUrl: "https://www.marinha.mil.br/dpc/normam-211",
    editionDate: "Edição Consolidada 2026",
    purpose: "Requerer formalmente a realização de vistoria de arqueação, reclassificação ou renovação junto à Capitania dos Portos.",
    signerRole: "Requerente ou Responsável Técnico",
    personalDataFields: [
      { name: "Qualificação do Interessado", found: true },
    ],
    vesselDataFields: [
      { name: "Dados Técnicos e Local para Inspeção", found: true },
    ],
    attachments: [
      { id: "doc-tie-vistoria", name: "TIE/TIEM ou Documento de Aquisição", isProtocolOnly: false, why: "Identificação formal da embarcação a ser inspecionada" },
      { id: "doc-laudo-art", name: "ART / Laudo Prévio de Engenharia Naval", isProtocolOnly: true, why: "Exigência exclusiva de protocolo para embarcações que demandam ART do CREA" },
    ],
  },
  {
    id: "doc_req_moto_aquatica",
    name: "Requerimento Específico para Moto Aquática (Jet Ski)",
    serviceId: "inscricao",
    serviceName: "Inscrição de embarcação",
    documentType: "official_form",
    officialSource: "NORMAM-212/DPC, Anexo 2-A (Requerimento para Inscrição ou Transferência de Moto Aquática)",
    sourceUrl: "https://www.marinha.mil.br/dpc/normam-212",
    editionDate: "Edição Consolidada NORMAM-212/DPC",
    purpose: "Formulário oficial exclusivo para moto aquática, contemplando propulsão a hidrojato e código identificador de casco (HIN).",
    signerRole: "Proprietário Requerente",
    personalDataFields: [
      { name: "Qualificação do Requerente", found: true },
    ],
    vesselDataFields: [
      { name: "Marca/Modelo, Nº do Casco (HIN) e Potência", found: true },
    ],
    attachments: [
      { id: "doc-nf-casco", name: "Nota Fiscal da Moto Aquática", isProtocolOnly: false, why: "Fornece número HIN e potência do motor para os campos do formulário", sharedWithDocIds: ["doc_req_inscricao"] },
    ],
  },
  {
    id: "doc_req_comercial",
    name: "Requerimento para Embarcação Profissional / Comercial",
    serviceId: "inscricao",
    serviceName: "Inscrição de embarcação",
    documentType: "official_form",
    officialSource: "NORMAM-201/DPC, Anexo 2-E (Requerimento de Serviços para Regularização de Embarcações)",
    sourceUrl: "https://www.marinha.mil.br/dpc/normam-201",
    editionDate: "Edição Consolidada NORMAM-201/DPC",
    purpose: "Formulário oficial para inscrição, averbação ou regularização de embarcações comerciais/profissionais (transporte, pesca, carga).",
    signerRole: "Armador ou Representante Legal",
    personalDataFields: [
      { name: "Razão Social e CNPJ ou Nome do Armador", found: true },
    ],
    vesselDataFields: [
      { name: "Atividade Comercial, Arqueação e Lotação Profissional", found: true },
    ],
    attachments: [
      { id: "doc-contrato-social", name: "Contrato Social / Cartão CNPJ", isProtocolOnly: false, why: "Qualificação da pessoa jurídica armadora nos campos do formulário" },
      { id: "doc-nf-casco", name: "Nota Fiscal da Embarcação Comercial", isProtocolOnly: false, why: "Dados de aquisição e estaleiro construtor", sharedWithDocIds: ["doc_req_inscricao"] },
    ],
  },
  {
    id: "doc_req_cha",
    name: "Requerimento para Habilitação Náutica de Amador (CHA)",
    serviceId: "habilitacao_cha",
    serviceName: "Emissão / Renovação de CHA",
    documentType: "official_form",
    officialSource: "NORMAM-211/DPC, Anexo 5-H (Requerimento de Amador)",
    sourceUrl: "https://www.marinha.mil.br/dpc/normam-211",
    editionDate: "Edição Consolidada NORMAM-211/DPC",
    purpose: "Formulário oficial para inscrição em exame, emissão, renovação ou 2ª via da Carteira de Habilitação de Amador.",
    signerRole: "Candidato / Amador Requerente",
    personalDataFields: [
      { name: "Nome Completo do Candidato", found: true },
      { name: "CPF e RG", found: true },
      { name: "Categoria Amadora Solicitada", found: true },
    ],
    vesselDataFields: [],
    attachments: [
      { id: "doc-atestado-medico", name: "Atestado Médico de Aptidão Física/Mental ou CNH", isProtocolOnly: true, why: "Exigência de protocolo da Capitania para comprovação de higidez física e visual" },
      { id: "doc-id-proprietario", name: "RG e CPF do Amador", isProtocolOnly: false, why: "Qualificação civil completa no formulário" },
    ],
  },
  {
    id: "doc_req_alteracao_cadastral",
    name: "Requerimento de Alteração Cadastral do Proprietário",
    serviceId: "alteracao_cadastral",
    serviceName: "Alteração Cadastral",
    documentType: "official_form",
    officialSource: "NORMAM-211/DPC, Anexo 2-C / Anexo 2-E e item 0213",
    sourceUrl: "https://www.marinha.mil.br/dpc/normam-211",
    editionDate: "Edição Consolidada 2026",
    purpose: "Requerer a averbação de mudança de domicílio ou dados civis do titular perante os registros da Autoridade Marítima.",
    signerRole: "Proprietário Requerente",
    personalDataFields: [
      { name: "Nome do Titular e Novo Endereço", found: true },
    ],
    vesselDataFields: [
      { name: "Embarcações Vinculadas ao Titular", found: true },
    ],
    attachments: [
      { id: "doc-comp-residencia", name: "Novo Comprovante de Residência", isProtocolOnly: false, why: "Comprovação do novo endereço a ser averbado" },
    ],
  },
  {
    id: "doc_comunicacao_despacho",
    name: "Aviso de Saída de Embarcação (Anexo 4-A / NAVSEG)",
    serviceId: "despacho_porto",
    serviceName: "Despacho de Saída / Entrada",
    documentType: "official_form",
    officialSource: "NORMAM-211/DPC, Anexo 4-A (Aviso de Saída) c/c Diretrizes NAVSEG",
    sourceUrl: "https://www.marinha.mil.br/dpc/normam-211",
    editionDate: "Edição Consolidada NORMAM-211/DPC",
    purpose: "Formulário oficial de aviso de saída entregue a marina/iate clube ou transmitido perante a Capitania dos Portos.",
    signerRole: "Comandante / Mestre da Embarcação",
    personalDataFields: [
      { name: "Nome do Comandante e Nº da Habilitação", found: true },
    ],
    vesselDataFields: [
      { name: "Embarcação, Porto de Saída, Destino e Rol de Pessoas", found: true },
    ],
    attachments: [
      { id: "doc-tie-orig", name: "TIE/TIEM da Embarcação", isProtocolOnly: false, why: "Comprovação de regularidade documental da embarcação navegando" },
    ],
  },
];

export interface OrderDocumentRequirement {
  id: string;
  name: string;
  fileName: string | null;
  fileSize?: string;
  usedInLabel: string;
  status: "recebido" | "conferir" | "falta_enviar";
  targetServiceIds: string[];
  personOrVessel: string;
  whyNeeded: string;
  outputDocuments: string[];
  extractedFields?: ExtractedFieldItem[];
}

export function getDynamicOrderRequirements(
  serviceIds: string[],
  customer?: { id: string; name: string; document_number?: string } | null,
  vessel?: { id: string; name: string; registration_number?: string } | null,
  options?: { isCleanPreview?: boolean; existingReqs?: OrderDocumentRequirement[] }
): OrderDocumentRequirement[] {
  const reqs: OrderDocumentRequirement[] = [];
  const clientName = customer?.name || "Cliente Solicitante";
  const vesselName = vessel?.name || "Embarcação";

  const findExisting = (id: string) => options?.existingReqs?.find(r => r.id === id);

  // 1. INSCRIÇÃO INICIAL
  if (serviceIds.includes("inscricao")) {
    const exCasco = findExisting("doc-nf-casco");
    reqs.push({
      id: "doc-nf-casco",
      name: "Nota Fiscal do Casco / Declaração de Construção",
      fileName: exCasco?.fileName || (options?.isCleanPreview ? null : "NF-Casco-Aquisicao.pdf"),
      fileSize: exCasco?.fileSize || (options?.isCleanPreview ? undefined : "1.8 MB"),
      usedInLabel: "Inscrição",
      status: exCasco?.status || (options?.isCleanPreview ? "falta_enviar" : "recebido"),
      targetServiceIds: ["inscricao"],
      personOrVessel: vesselName,
      whyNeeded: "Comprova a procedência e propriedade do casco perante a Capitania dos Portos (NORMAM-211/DPC itens 0202 a 0205).",
      outputDocuments: [
        "Requerimento de Inscrição Inicial de Embarcação (NORMAM-211 Anexo 2-C)",
        "Boletim Simplificado de Atualização de Embarcação - BSADE (NORMAM-211 Anexo 2-B)"
      ],
      extractedFields: exCasco?.extractedFields || [
        { id: "nf_casco_num", label: "Nº da Nota Fiscal / Documento", value: "NF-e 004.821", confidence: 99, page: 1, isCritical: true },
        { id: "nf_casco_construtor", label: "Estaleiro / Construtor", value: "Estaleiro Naval Brasil", confidence: 97, page: 1 },
      ]
    });

    const exMotor = findExisting("doc-nf-motor-inscricao");
    reqs.push({
      id: "doc-nf-motor-inscricao",
      name: "Nota Fiscal / Comprovante do Motor",
      fileName: exMotor?.fileName || (options?.isCleanPreview ? null : "NF-Motor-Mercury.pdf"),
      fileSize: exMotor?.fileSize || (options?.isCleanPreview ? undefined : "920 KB"),
      usedInLabel: "Inscrição",
      status: exMotor?.status || (options?.isCleanPreview ? "falta_enviar" : "recebido"),
      targetServiceIds: ["inscricao"],
      personOrVessel: `${vesselName} (Motor)`,
      whyNeeded: "Documento de entrada obrigatório comprovando aquisição e potência/número de série do motor de propulsão.",
      outputDocuments: [
        "Boletim Simplificado de Atualização de Embarcação - BSADE (NORMAM-211 Anexo 2-B)",
        "Requerimento de Inscrição Inicial de Embarcação (NORMAM-211 Anexo 2-C)"
      ],
      extractedFields: exMotor?.extractedFields || [
        { id: "nf_motor_pot", label: "Potência do Motor", value: "115 HP", confidence: 98, page: 1, isCritical: true },
        { id: "nf_motor_serie", label: "Nº de Série do Motor", value: "SN-982173", confidence: 96, page: 1 },
      ]
    });

    const exIdProp = findExisting("doc-id-proprietario");
    reqs.push({
      id: "doc-id-proprietario",
      name: "Documento de Identificação Oficial (RG/CNH)",
      fileName: exIdProp?.fileName || (options?.isCleanPreview ? null : `Doc-Identificacao-${clientName.split(" ")[0]}.pdf`),
      fileSize: exIdProp?.fileSize || (options?.isCleanPreview ? undefined : "1.2 MB"),
      usedInLabel: "Inscrição",
      status: exIdProp?.status || (options?.isCleanPreview ? "falta_enviar" : "recebido"),
      targetServiceIds: ["inscricao"],
      personOrVessel: clientName,
      whyNeeded: "Qualificação civil do proprietário requerente perante a Autoridade Marítima.",
      outputDocuments: [
        "Requerimento de Inscrição Inicial de Embarcação (NORMAM-211 Anexo 2-C)",
        "Procuração Náutica Específica"
      ],
      extractedFields: exIdProp?.extractedFields || [
        { id: "nome_prop", label: "Nome Completo", value: clientName, confidence: 99, page: 1, isCritical: true },
        { id: "cpf_prop", label: "CPF", value: customer?.document_number || "000.000.000-00", confidence: 99, page: 1, isCritical: true },
      ]
    });

    const exRes = findExisting("doc-comp-residencia");
    reqs.push({
      id: "doc-comp-residencia",
      name: "Comprovante de Residência ou Declaração Anexo 2-I",
      fileName: exRes?.fileName || (options?.isCleanPreview ? null : "Comprovante-Residencia.pdf"),
      fileSize: exRes?.fileSize || (options?.isCleanPreview ? undefined : "650 KB"),
      usedInLabel: "Inscrição",
      status: exRes?.status || (options?.isCleanPreview ? "falta_enviar" : "recebido"),
      targetServiceIds: ["inscricao"],
      personOrVessel: clientName,
      whyNeeded: "Comprovação de domicílio do proprietário da embarcação emitida há menos de 120 dias ou declaração firmada.",
      outputDocuments: [
        "Requerimento de Inscrição Inicial de Embarcação (NORMAM-211 Anexo 2-C)"
      ],
    });

    const exFotos = findExisting("doc-fotos-embarcacao");
    reqs.push({
      id: "doc-fotos-embarcacao",
      name: "Fotografias da Embarcação",
      fileName: exFotos?.fileName || (options?.isCleanPreview ? null : "Fotos-Embarcacao.pdf"),
      fileSize: exFotos?.fileSize || (options?.isCleanPreview ? undefined : "3.1 MB"),
      usedInLabel: "Inscrição",
      status: exFotos?.status || (options?.isCleanPreview ? "falta_enviar" : "recebido"),
      targetServiceIds: ["inscricao"],
      personOrVessel: vesselName,
      whyNeeded: "Fotos nítidas do costado e da popa com nome e porto de inscrição visíveis (NORMAM-211 item 0205).",
      outputDocuments: [
        "Dossiê Fotográfico para Inscrição na Capitania"
      ]
    });
  }

  // 2. TRANSFERÊNCIA
  if (serviceIds.includes("transferencia")) {
    const exEmb = findExisting("doc-embarcacao-transf");
    reqs.push({
      id: "doc-embarcacao-transf",
      name: "Documento da Embarcação (TIE/TIEM)",
      fileName: exEmb?.fileName || (options?.isCleanPreview ? null : `TIE-${vesselName.replace(/\s+/g, "-")}.pdf`),
      fileSize: exEmb?.fileSize || (options?.isCleanPreview ? undefined : "2.4 MB"),
      usedInLabel: "Transferência",
      status: exEmb?.status || (options?.isCleanPreview ? "falta_enviar" : "recebido"),
      targetServiceIds: ["transferencia"],
      personOrVessel: vesselName,
      whyNeeded: "Comprova o registro atual e dados técnicos da embarcação.",
      outputDocuments: ["Requerimento de Transferência de Propriedade"],
      extractedFields: exEmb?.extractedFields || [
        { id: "tie", label: "Nº de Inscrição (TIE)", value: vessel?.registration_number || "381-000123", confidence: 99, page: 1, isCritical: true },
        { id: "nome_emb", label: "Nome da Embarcação", value: vesselName, confidence: 98, page: 1 },
      ]
    });

    const exComprador = findExisting("doc-comprador");
    reqs.push({
      id: "doc-comprador",
      name: "Documento do Comprador",
      fileName: exComprador?.fileName || (options?.isCleanPreview ? null : "documento-comprador.pdf"),
      fileSize: exComprador?.fileSize || (options?.isCleanPreview ? undefined : "1.1 MB"),
      usedInLabel: "Transferência",
      status: exComprador?.status || (options?.isCleanPreview ? "falta_enviar" : "conferir"),
      targetServiceIds: ["transferencia"],
      personOrVessel: "Comprador / Adquirente",
      whyNeeded: "Identificação civil obrigatória para emissão do novo título de propriedade.",
      outputDocuments: ["Requerimento de Transferência de Propriedade"],
      extractedFields: exComprador?.extractedFields || [
        { id: "nome_comp", label: "Nome Completo", value: "Novo Proprietário", confidence: 98, page: 1, isCritical: true },
        { id: "cpf_comp", label: "CPF", value: "192.834.721-09", confidence: 99, page: 1, isCritical: true },
      ]
    });

    const exVendedor = findExisting("doc-vendedor");
    reqs.push({
      id: "doc-vendedor",
      name: "Documento do Vendedor",
      fileName: exVendedor?.fileName || (options?.isCleanPreview ? null : "documento-vendedor.pdf"),
      fileSize: exVendedor?.fileSize || (options?.isCleanPreview ? undefined : "980 KB"),
      usedInLabel: "Transferência",
      status: exVendedor?.status || (options?.isCleanPreview ? "falta_enviar" : "recebido"),
      targetServiceIds: ["transferencia"],
      personOrVessel: `${clientName} (Vendedor)`,
      whyNeeded: "Identificação civil do vendedor transmitente cadastrado perante a Capitania dos Portos.",
      outputDocuments: ["Requerimento de Transferência de Propriedade"],
      extractedFields: exVendedor?.extractedFields || [
        { id: "nome_vend", label: "Nome Completo", value: clientName, confidence: 99, page: 1 },
        { id: "cpf_vend", label: "CPF", value: customer?.document_number || "042.819.330-12", confidence: 99, page: 1 },
      ]
    });
  }

  // 3. RENOVAÇÃO
  if (serviceIds.includes("renovacao")) {
    const exRenov = findExisting("doc-embarcacao-renov");
    if (!reqs.some(r => r.id === "doc-embarcacao-transf")) {
      reqs.push({
        id: "doc-embarcacao-renov",
        name: "Documento da Embarcação (TIE/TIEM)",
        fileName: exRenov?.fileName || (options?.isCleanPreview ? null : `TIE-${vesselName.replace(/\s+/g, "-")}.pdf`),
        fileSize: exRenov?.fileSize || (options?.isCleanPreview ? undefined : "2.1 MB"),
        usedInLabel: "Renovação",
        status: exRenov?.status || (options?.isCleanPreview ? "falta_enviar" : "recebido"),
        targetServiceIds: ["renovacao"],
        personOrVessel: vesselName,
        whyNeeded: "Documento com validade a expirar ou já expirada para procedimento de renovação.",
        outputDocuments: ["Requerimento de Renovação de TIE/TIEM"],
      });
    }

    const exIdRenov = findExisting("doc-id-renov");
    if (!reqs.some(r => r.id === "doc-id-proprietario")) {
      reqs.push({
        id: "doc-id-renov",
        name: "Identificação do Proprietário",
        fileName: exIdRenov?.fileName || (options?.isCleanPreview ? null : `ID-${clientName.split(" ")[0]}.pdf`),
        fileSize: exIdRenov?.fileSize || (options?.isCleanPreview ? undefined : "1.0 MB"),
        usedInLabel: "Renovação",
        status: exIdRenov?.status || (options?.isCleanPreview ? "falta_enviar" : "recebido"),
        targetServiceIds: ["renovacao"],
        personOrVessel: clientName,
        whyNeeded: "Comprovante de identificação civil do titular do documento.",
        outputDocuments: ["Requerimento de Renovação de TIE/TIEM"],
      });
    }
  }

  // 4. ALTERAÇÃO DE MOTOR
  if (serviceIds.includes("alteracao_motor")) {
    const exMotorAlt = findExisting("doc-motor-alt");
    reqs.push({
      id: "doc-motor-alt",
      name: "Nota Fiscal / Comprovante do Novo Motor",
      fileName: exMotorAlt?.fileName || null,
      fileSize: exMotorAlt?.fileSize,
      usedInLabel: "Alteração de motor",
      status: exMotorAlt?.status || "falta_enviar",
      targetServiceIds: ["alteracao_motor"],
      personOrVessel: `${vesselName} (Novo Motor)`,
      whyNeeded: "Nota fiscal de aquisição ou declaração com número de série para averbação do novo motor.",
      outputDocuments: ["Requerimento de Alteração de Dados Cadastrais (Motor)", "Termo de Responsabilidade Técnica"],
    });
  }

  // Se nenhum serviço dos acima, mas há serviços selecionados
  if (reqs.length === 0 && serviceIds.length > 0) {
    const firstServ = SERVICES_CATALOG.find(s => s.id === serviceIds[0]);
    reqs.push({
      id: `doc-${serviceIds[0]}`,
      name: `Documentação para ${firstServ?.shortName || "Serviço"}`,
      fileName: null,
      usedInLabel: firstServ?.shortName || "Serviço",
      status: "falta_enviar",
      targetServiceIds: serviceIds,
      personOrVessel: vesselName || clientName,
      whyNeeded: "Documentação comprobatória requerida pela Autoridade Marítima para análise do processo.",
      outputDocuments: ["Requerimento Geral Padronizado"],
    });
  }

  return reqs;
}

const DEFAULT_ORDER_REQUIREMENTS: OrderDocumentRequirement[] = [];

const WORKSPACE_PREVIEW_DOCS = [
  { id: "ws-1", name: "RG e CPF.pdf", size: "1.2 MB", origin: "Cadastro do Cliente", date: "14/09/2026" },
  { id: "ws-2", name: "TIE Embarcacao.pdf", size: "2.4 MB", origin: "Cadastro da Embarcação", date: "10/09/2026" },
  { id: "ws-3", name: "Nota Fiscal Motor.pdf", size: "850 KB", origin: "Cofre de Documentos", date: "16/09/2026", targetReqId: "doc-nf-motor-inscricao" },
  { id: "ws-4", name: "Comprovante de Residência.pdf", size: "640 KB", origin: "Cadastro do Cliente", date: "12/09/2026" },
];

function PdfBadgeIcon({ className }: { className?: string }) {
  return (
    <div className={cn("h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-red-600 text-white flex flex-col items-center justify-center font-bold shrink-0 shadow-2xs select-none", className)}>
      <span className="text-[9px] font-black tracking-tighter leading-none">PDF</span>
    </div>
  );
}

function NovoPedidoPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/processes/novo-pedido" });
  const { profile } = useAuth();
  const isPreview = (search && search.preview === "true") || (typeof window !== "undefined" && window.location.search.includes("preview=true"));

  // Etapa atual: 1 = Serviços, 2 = Dados, 3 = Documentos, 4 = Revisão e geração
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(() => {
    if (search.step === "2" || (typeof window !== "undefined" && window.location.search.includes("step=2"))) {
      return 2;
    }
    if (search.step === "3" || (typeof window !== "undefined" && window.location.search.includes("step=3"))) {
      return 3;
    }
    if (search.step === "4" || (typeof window !== "undefined" && window.location.search.includes("step=4"))) {
      return 4;
    }
    return 1;
  });

  // Seleção múltipla de serviços (armazena os IDs selecionados)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() => {
    if (search.services) {
      return search.services.split(",").map(s => s.trim()).filter(Boolean);
    }
    // Tenta recuperar do localStorage apenas se houver rascunho anterior
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("navaldocs_pedido_draft_services");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {
          // ignore
        }
      }
    }
    return [];
  });

  // Busca de serviços
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  // Controle para exibir mais serviços do catálogo
  const [showAllServices, setShowAllServices] = useState(false);

  // Lista de clientes e embarcações do workspace
  const [customers, setCustomers] = useState<any[]>(() => isPreview ? PREVIEW_CUSTOMERS : []);
  const [vessels, setVessels] = useState<any[]>(() => isPreview ? PREVIEW_VESSELS : []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dados do pedido (Etapa 2)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(() => {
    if (search.customerId) return search.customerId;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("navaldocs_pedido_draft_customer");
      if (saved) return saved;
    }
    return "";
  });

  const [selectedVesselId, setSelectedVesselId] = useState<string>(() => {
    if (search.vesselId) return search.vesselId;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("navaldocs_pedido_draft_vessel");
      if (saved) return saved;
    }
    return "";
  });

  const [orderNotes, setOrderNotes] = useState("");

  // Dados específicos de cada serviço
  const [transferData, setTransferData] = useState({
    vendedorId: "",
    compradorId: "",
    compradorNome: "",
  });

  const [renovacaoData, setRenovacaoData] = useState({
    tipoDocumento: "TIE (Título de Inscrição de Embarcação)",
    numeroDocumento: "",
    validadeAtual: "",
  });

  const [motorData, setMotorData] = useState({
    motorAtualPotencia: "250 HP",
    motorAtualMarca: "Mercury Verado",
    motorAtualSerie: "",
    novoMotorPotencia: "",
    novoMotorMarca: "",
    novoMotorSerie: "",
    novoMotorCombustivel: "Gasolina",
  });

  // Controle de expansão das seções específicas
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({
    transferencia: true,
    renovacao: false,
    alteracao_motor: false,
  });

  const toggleAccordion = (id: string) => {
    setExpandedAccordions(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Modais de cadastro in-context
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isNewVesselModalOpen, setIsNewVesselModalOpen] = useState(false);
  const [isNewBuyerModalOpen, setIsNewBuyerModalOpen] = useState(false);

  // Controle de Ações de Documentos de Saída (Gerar / Anexar / Ignorar)
  const [outputDocActions, setOutputDocActions] = useState<Record<string, OutputDocAction>>(() => {
    const initial: Record<string, OutputDocAction> = {};
    OUTPUT_DOCS_CATALOG.forEach(doc => {
      initial[doc.id] = "gerar";
    });
    return initial;
  });

  const setDocAction = (docId: string, action: OutputDocAction) => {
    setOutputDocActions(prev => ({
      ...prev,
      [docId]: action,
    }));
  };

  // Estados da Etapa 3: Documentos
  const [requirements, setRequirements] = useState<OrderDocumentRequirement[]>(() => {
    return getDynamicOrderRequirements(
      selectedServiceIds,
      null,
      null,
      { isCleanPreview: !isPreview }
    );
  });
  const [documentFilter, setDocumentFilter] = useState<"todos" | "recebidos" | "falta_enviar" | "conferir">("todos");
  const [showOutputFiles, setShowOutputFiles] = useState(true);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedReviewReq, setSelectedReviewReq] = useState<OrderDocumentRequirement | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedViewReq, setSelectedViewReq] = useState<OrderDocumentRequirement | null>(null);
  const [isRegisteredDocsModalOpen, setIsRegisteredDocsModalOpen] = useState(false);
  const [targetUploadReqId, setTargetUploadReqId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Manipulador de upload de arquivos (simula processamento e extração OCR)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    toast.loading(`Processando e realizando OCR de ${file.name}...`, { id: "upload-ocr" });

    setTimeout(() => {
      setRequirements(prev => {
        // Se houver um requisito alvo explícito
        if (targetUploadReqId) {
          return prev.map(req => {
            if (req.id === targetUploadReqId) {
              return {
                ...req,
                fileName: file.name,
                fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
                status: "recebido",
              };
            }
            return req;
          });
        }

        // Senão, preenche o primeiro que estiver com "falta_enviar"
        let filled = false;
        return prev.map(req => {
          if (!filled && req.status === "falta_enviar") {
            filled = true;
            return {
              ...req,
              fileName: file.name,
              fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
              status: "recebido",
            };
          }
          return req;
        });
      });

      toast.success(`Arquivo ${file.name} recebido e conferido com sucesso!`, { id: "upload-ocr" });
      setTargetUploadReqId(null);
      if (e.target) e.target.value = "";
    }, 900);
  };

  // Confirmar dados revisados no modal de conferência
  const handleConfirmExtractedData = (reqId: string, updatedFields: ExtractedFieldItem[]) => {
    setRequirements(prev =>
      prev.map(r => {
        if (r.id === reqId) {
          return {
            ...r,
            status: "recebido",
            extractedFields: updatedFields,
          };
        }
        return r;
      })
    );
    toast.success("Dados conferidos e aprovados para geração dos documentos!");
    setReviewModalOpen(false);
    setSelectedReviewReq(null);
  };

  // Vincular documento do cofre / cadastrado
  const handleLinkRegisteredDoc = (vaultDoc: any) => {
    setRequirements(prev =>
      prev.map(r => {
        if (r.id === "doc-motor" || r.status === "falta_enviar") {
          return {
            ...r,
            fileName: vaultDoc.name,
            fileSize: vaultDoc.size,
            status: "recebido",
          };
        }
        return r;
      })
    );
    toast.success(`Documento "${vaultDoc.name}" vinculado com sucesso aos requisitos do pedido!`);
    setIsRegisteredDocsModalOpen(false);
  };

  // Salva rascunho das seleções no localStorage para evitar perda em navegação acidental
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("navaldocs_pedido_draft_services", JSON.stringify(selectedServiceIds));
      if (selectedCustomerId) localStorage.setItem("navaldocs_pedido_draft_customer", selectedCustomerId);
      if (selectedVesselId) localStorage.setItem("navaldocs_pedido_draft_vessel", selectedVesselId);
    }
  }, [selectedServiceIds, selectedCustomerId, selectedVesselId]);

  // Carrega clientes e embarcações reais da empresa no Supabase
  useEffect(() => {
    if (!profile?.company_id) return;

    const loadWorkspaceEntities = async () => {
      try {
        const [cRes, vRes] = await Promise.all([
          supabase.from("customers").select("id, name, document_number, email, phone").eq("company_id", profile.company_id).order("name"),
          supabase.from("vessels").select("id, name, customer_id, registration_number, tie_number, vessel_type").eq("company_id", profile.company_id).order("name"),
        ]);
        if (cRes.data && cRes.data.length > 0) {
          setCustomers(cRes.data);
        } else if (isPreview) {
          setCustomers(PREVIEW_CUSTOMERS);
        }
        if (vRes.data && vRes.data.length > 0) {
          setVessels(vRes.data);
        } else if (isPreview) {
          setVessels(PREVIEW_VESSELS);
        }
      } catch (err) {
        console.error("Erro ao carregar clientes/embarcações:", err);
      }
    };

    loadWorkspaceEntities();
  }, [profile?.company_id, isPreview]);

  // Lista unificada de clientes
  const allCustomers = useMemo(() => {
    if (customers.length > 0) return customers;
    return isPreview ? PREVIEW_CUSTOMERS : [];
  }, [customers, isPreview]);

  // Lista unificada de embarcações
  const allVessels = useMemo(() => {
    if (vessels.length > 0) return vessels;
    return isPreview ? PREVIEW_VESSELS : [];
  }, [vessels, isPreview]);

  // Filtra embarcações pelo cliente selecionado se aplicável, priorizando as dele
  const filteredVessels = useMemo(() => {
    if (!selectedCustomerId) return allVessels;
    const clientVessels = allVessels.filter(v => v.customer_id === selectedCustomerId);
    return clientVessels.length > 0 ? clientVessels : allVessels;
  }, [allVessels, selectedCustomerId]);

  // Dados da embarcação selecionada
  const currentVessel = useMemo(() => {
    return allVessels.find(v => v.id === selectedVesselId);
  }, [allVessels, selectedVesselId]);

  // Proprietário registrado da embarcação selecionada
  const currentVesselOwnerName = useMemo(() => {
    if (!currentVessel) return "";
    if (currentVessel.customer_name) return currentVessel.customer_name;
    const owner = allCustomers.find(c => c.id === currentVessel.customer_id);
    return owner?.name || "";
  }, [currentVessel, allCustomers]);

  // Nome do cliente e embarcação ativos para exibição no cabeçalho
  const currentCustomerName = useMemo(() => {
    return allCustomers.find(c => c.id === selectedCustomerId)?.name || "Cliente do Pedido";
  }, [allCustomers, selectedCustomerId]);

  const currentVesselName = useMemo(() => {
    return allVessels.find(v => v.id === selectedVesselId)?.name || "Embarcação";
  }, [allVessels, selectedVesselId]);

  // Sincroniza dinamicamente os requisitos documentais conforme os serviços, cliente e embarcação mudam
  useEffect(() => {
    const cust = allCustomers.find(c => c.id === selectedCustomerId) || null;
    const vess = allVessels.find(v => v.id === selectedVesselId) || null;
    setRequirements(prev =>
      getDynamicOrderRequirements(selectedServiceIds, cust, vess, {
        isCleanPreview: !isPreview,
        existingReqs: prev,
      })
    );
  }, [selectedServiceIds, selectedCustomerId, selectedVesselId, allCustomers, allVessels, isPreview]);

  // Contadores de documentos da Etapa 3
  const receivedCount = useMemo(() => requirements.filter(r => r.status === "recebido").length, [requirements]);
  const needsReviewCount = useMemo(() => requirements.filter(r => r.status === "conferir").length, [requirements]);
  const pendingCount = useMemo(() => requirements.filter(r => r.status === "falta_enviar").length, [requirements]);

  const filteredRequirements = useMemo(() => {
    if (documentFilter === "recebidos") return requirements.filter(r => r.status === "recebido");
    if (documentFilter === "conferir") return requirements.filter(r => r.status === "conferir");
    if (documentFilter === "falta_enviar") return requirements.filter(r => r.status === "falta_enviar");
    return requirements;
  }, [requirements, documentFilter]);

  // Sincroniza o vendedor padrão da transferência com o proprietário cadastrado da embarcação
  useEffect(() => {
    if (currentVessel && !transferData.vendedorId) {
      setTransferData(prev => ({
        ...prev,
        vendedorId: currentVessel.customer_id || selectedCustomerId || "",
      }));
    }
  }, [currentVessel, selectedCustomerId, transferData.vendedorId]);

  // Serviços selecionados completos
  const selectedServices = useMemo(() => {
    return SERVICES_CATALOG.filter(s => selectedServiceIds.includes(s.id));
  }, [selectedServiceIds]);

  // Modelos de saída aplicáveis aos serviços selecionados
  const applicableOutputDocs = useMemo(() => {
    return OUTPUT_DOCS_CATALOG.filter(doc => selectedServiceIds.includes(doc.serviceId));
  }, [selectedServiceIds]);

  // Documentos que estão marcados como 'gerar' pelo sistema
  const activeGeneratingDocs = useMemo(() => {
    return applicableOutputDocs.filter(doc => (outputDocActions[doc.id] || "gerar") === "gerar");
  }, [applicableOutputDocs, outputDocActions]);

  const activeGeneratingDocIds = useMemo(() => {
    return activeGeneratingDocs.map(d => d.id);
  }, [activeGeneratingDocs]);

  // Total de arquivos previstos a serem gerados no pedido (exclusivamente os selecionados com "gerar")
  const totalOutputFilesCount = useMemo(() => {
    return activeGeneratingDocs.length;
  }, [activeGeneratingDocs]);

  // Verifica se algum serviço selecionado exige embarcação
  const requiresVessel = useMemo(() => {
    return selectedServices.some(s => s.requiresVessel);
  }, [selectedServices]);

  // Alterna a seleção de um serviço
  const toggleService = (serviceId: string) => {
    setSelectedServiceIds(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      }
      return [...prev, serviceId];
    });
  };

  // Remove um serviço pela etiqueta
  const removeService = (serviceId: string) => {
    setSelectedServiceIds(prev => prev.filter(id => id !== serviceId));
  };

  // Lista de serviços visíveis considerando a busca e o botão "Ver todos os serviços"
  const visibleServices = useMemo(() => {
    const term = serviceSearchTerm.trim().toLowerCase();
    let list = SERVICES_CATALOG;

    if (!showAllServices && !term) {
      list = SERVICES_CATALOG.slice(0, 6);
    }

    if (term) {
      list = SERVICES_CATALOG.filter(
        s => s.name.toLowerCase().includes(term) || s.description.toLowerCase().includes(term)
      );
    }

    return list;
  }, [serviceSearchTerm, showAllServices]);

  // Ação "Salvar e sair" da etapa 2
  const handleSaveAndExit = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("navaldocs_pedido_draft_services", JSON.stringify(selectedServiceIds));
      localStorage.setItem("navaldocs_pedido_draft_customer", selectedCustomerId);
      localStorage.setItem("navaldocs_pedido_draft_vessel", selectedVesselId);
    }
    toast.success("Rascunho do pedido salvo com sucesso!");
    navigate({ to: "/processes" });
  };

  // Ação "Continuar para documentos"
  const handleContinueToDocuments = () => {
    if (!selectedCustomerId && allCustomers.length > 0) {
      toast.info("Selecione o cliente do pedido para continuar.");
      return;
    }
    if (requiresVessel && !selectedVesselId && allVessels.length > 0) {
      toast.info("Selecione a embarcação associada para os serviços marítimos.");
      return;
    }
    setCurrentStep(3);
  };

  // Finalizar e criar os processos do pedido (Etapa 4)
  const handleCreateOrderProcesses = async () => {
    if (!profile?.company_id && !isPreview) {
      toast.error("Você precisa estar em um espaço de trabalho ativo.");
      return;
    }

    if (selectedServices.length === 0) {
      toast.error("Selecione pelo menos um serviço.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (profile?.company_id) {
        const inserts = selectedServices.map(service => ({
          company_id: profile.company_id,
          customer_id: selectedCustomerId || null,
          vessel_id: service.requiresVessel ? (selectedVesselId || null) : null,
          title: `${service.name}${selectedVesselId ? ` - ${allVessels.find(v => v.id === selectedVesselId)?.name || ""}` : ""}`,
          process_type: service.id,
          status: "waiting_docs",
          priority: "normal",
          notes: orderNotes || `Pedido com ${selectedServices.length} serviço(s) unificado(s).`,
        }));

        const { error } = await supabase.from("processes").insert(inserts);
        if (error) {
          console.error("Erro ao criar processos do pedido:", error);
          toast.error("Não foi possível criar os processos. Tente novamente.");
          return;
        }
      }

      // Limpa rascunho
      if (typeof window !== "undefined") {
        localStorage.removeItem("navaldocs_pedido_draft_services");
        localStorage.removeItem("navaldocs_pedido_draft_customer");
        localStorage.removeItem("navaldocs_pedido_draft_vessel");
      }

      window.dispatchEvent(new CustomEvent("processes:changed"));
      toast.success(`Pedido com ${selectedServices.length} processo(s) criado com sucesso!`);
      navigate({
        to: "/processes/arquivos-gerados",
        search: {
          preview: isPreview ? "true" : undefined,
          customerId: selectedCustomerId || undefined,
          vesselId: selectedVesselId || undefined,
          services: selectedServiceIds.join(",") || undefined,
          docs: activeGeneratingDocIds.join(",") || undefined,
        },
      });
    } catch (err) {
      console.error("Exceção na criação do pedido:", err);
      toast.error("Erro inesperado ao registrar pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-300 max-w-5xl mx-auto space-y-6 pb-20">
      {/* 1. CABEÇALHO DA TELA & VOLTAR */}
      <div>
        <Link
          to="/processes"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1868db] hover:underline mb-2 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Voltar aos processos</span>
        </Link>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f1d36] tracking-tight">
          Novo pedido
        </h1>
        <p className="text-slate-500 text-sm sm:text-base mt-1 font-normal">
          {currentStep === 1
            ? "Prepare um ou vários serviços de uma só vez."
            : currentStep === 2
            ? "Informe os dados uma vez para os serviços selecionados."
            : currentStep === 3
            ? "Envie uma vez. Reaproveite nos serviços deste pedido."
            : "Confira os detalhes e gere os documentos do pedido."}
        </p>
      </div>

      {/* 2. STEPPER DE ETAPAS */}
      {/* Desktop Stepper */}
      <div className="hidden sm:flex items-center gap-3 py-2 select-none">
        {[
          { num: 1, label: "Serviços" },
          { num: 2, label: "Dados" },
          { num: 3, label: "Documentos" },
          { num: 4, label: "Revisão e geração" },
        ].map((step, idx) => {
          const isActive = currentStep === step.num;
          const isDone = currentStep > step.num;

          return (
            <div key={step.num} className="flex items-center gap-3 flex-1 last:flex-initial">
              <button
                type="button"
                onClick={() => {
                  if (step.num > 1 && selectedServiceIds.length === 0) {
                    toast.info("Selecione pelo menos um serviço para avançar.");
                    return;
                  }
                  setCurrentStep(step.num as any);
                }}
                className={cn(
                  "flex items-center gap-2 text-xs font-semibold transition-colors cursor-pointer",
                  isActive
                    ? "text-[#1868db]"
                    : isDone
                    ? "text-slate-700"
                    : "text-slate-400"
                )}
              >
                <div
                  className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors",
                    isActive
                      ? "bg-[#1868db] text-white"
                      : isDone
                      ? "bg-blue-100 text-[#1868db]"
                      : "bg-slate-100 text-slate-400"
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : step.num}
                </div>
                <span className={cn(isActive && "border-b-2 border-[#1868db] pb-0.5 font-bold")}>
                  {step.label}
                </span>
              </button>

              {idx < 3 && (
                <div className="flex-1 h-px bg-slate-200" />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile Stepper (indicador compacto + barra em 4 segmentos) */}
      <div className="sm:hidden space-y-2 select-none">
        <div className="flex items-center justify-between text-xs font-bold text-[#0f1d36]">
          <span>Etapa {currentStep} de 4 · {
            currentStep === 1 ? "Serviços" :
            currentStep === 2 ? "Dados" :
            currentStep === 3 ? "Documentos" : "Revisão e geração"
          }</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
          <div className={cn("rounded-full", currentStep >= 1 ? "bg-[#1868db]" : "bg-slate-200")} />
          <div className={cn("rounded-full", currentStep >= 2 ? "bg-[#1868db]" : "bg-slate-200")} />
          <div className={cn("rounded-full", currentStep >= 3 ? "bg-[#1868db]" : "bg-slate-200")} />
          <div className={cn("rounded-full", currentStep >= 4 ? "bg-[#1868db]" : "bg-slate-200")} />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CONTEÚDO DA ETAPA 1: SERVIÇOS */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-2xs space-y-6">
          {/* Título & Descrição da Seleção */}
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#0f1d36]">
              O que você precisa preparar?
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Selecione os serviços para o mesmo cliente e embarcação.
            </p>
          </div>

          {/* Campo de Busca de Serviços */}
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#1868db] transition-colors" />
            <input
              type="text"
              value={serviceSearchTerm}
              onChange={(e) => setServiceSearchTerm(e.target.value)}
              placeholder="Buscar serviço..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20 focus:border-[#1868db] transition-all"
            />
            {serviceSearchTerm && (
              <button
                type="button"
                onClick={() => setServiceSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Grid de Cartões de Serviço com Checkboxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {visibleServices.map((service) => {
              const isSelected = selectedServiceIds.includes(service.id);
              const IconComp = service.icon;

              return (
                <div
                  key={service.id}
                  onClick={() => toggleService(service.id)}
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      toggleService(service.id);
                    }
                  }}
                  className={cn(
                    "p-4 sm:p-5 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[#1868db]/30",
                    isSelected
                      ? "border-[#1868db] bg-blue-50/20 shadow-2xs"
                      : "border-slate-200/80 hover:border-slate-300 bg-white"
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? "text-[#1868db] bg-blue-50" : "text-[#0f1d36] bg-slate-50"
                    )}>
                      <IconComp className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-bold text-xs sm:text-sm text-[#0f1d36] leading-snug">
                        {service.name}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {service.description}
                      </p>
                    </div>
                  </div>

                  {/* Checkbox customizado acessível */}
                  <div className="shrink-0 pl-1">
                    <div
                      className={cn(
                        "h-5 w-5 rounded-md flex items-center justify-center transition-all",
                        isSelected
                          ? "bg-[#1868db] border-2 border-[#1868db] text-white"
                          : "border-2 border-slate-300 bg-white"
                      )}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Link "Ver todos os serviços" */}
          {!serviceSearchTerm && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setShowAllServices(!showAllServices)}
                className="text-xs font-semibold text-[#1868db] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{showAllServices ? "Ver menos serviços" : "Ver todos os serviços"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* RESUMO: Contador Dinâmico + Etiquetas Removíveis */}
          <div className="pt-2 space-y-3">
            <h4 className="font-bold text-xs sm:text-sm text-[#0f1d36]">
              {selectedServiceIds.length === 1
                ? "1 serviço selecionado"
                : `${selectedServiceIds.length} serviços selecionados`}
            </h4>

            {selectedServices.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedServices.map((service) => (
                  <span
                    key={service.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-[#1868db] border border-blue-100/80 animate-in fade-in-50 duration-150"
                  >
                    <span>{service.shortName}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeService(service.id);
                      }}
                      aria-label={`Remover serviço ${service.name}`}
                      className="h-4 w-4 rounded-full hover:bg-blue-200/60 text-[#1868db] inline-flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-medium italic">
                Nenhum serviço selecionado ainda. Marque um ou mais cartões acima.
              </p>
            )}
          </div>

          {/* Bloco Informativo */}
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100/70 flex items-start gap-3 text-xs text-slate-700">
            <Info className="h-4 w-4 text-[#1868db] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">
                Preencha os dados uma vez. Os documentos comuns serão reaproveitados.
              </p>
              <p className="text-slate-500 text-[11px] sm:text-xs mt-0.5">
                Ao final, confira e baixe os arquivos por serviço ou em um único ZIP.
              </p>
            </div>
          </div>

          {/* Botões de Ação da Etapa 1 */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: "/processes" })}
              className="w-full sm:w-auto h-11 px-6 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              disabled={selectedServiceIds.length === 0}
              onClick={() => setCurrentStep(2)}
              className={cn(
                "w-full sm:w-auto h-11 px-7 rounded-xl font-semibold text-xs sm:text-sm shadow-sm transition-all",
                selectedServiceIds.length > 0
                  ? "bg-[#1868db] hover:bg-[#1456b8] text-white cursor-pointer"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              <span>
                {selectedServiceIds.length === 0
                  ? "Selecione pelo menos um serviço"
                  : selectedServiceIds.length === 1
                  ? "Continuar com 1 serviço →"
                  : `Continuar com ${selectedServiceIds.length} serviços →`}
              </span>
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CONTEÚDO DA ETAPA 2: DADOS (REFERÊNCIA VISUAL COMPLETA) */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="space-y-4">
          {/* BARRA DE RESUMO COM SERVIÇOS SELECIONADOS + "Editar serviços" */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-[#0f1d36] shrink-0">
                {selectedServices.length} {selectedServices.length === 1 ? "serviço neste pedido" : "serviços neste pedido"}
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                {selectedServices.map(s => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#1868db] border border-blue-100/80 animate-in fade-in duration-150"
                  >
                    <span>{s.shortName}</span>
                    <button
                      type="button"
                      onClick={() => removeService(s.id)}
                      aria-label={`Remover ${s.name}`}
                      className="hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1868db] hover:underline cursor-pointer self-start sm:self-auto shrink-0"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Editar serviços</span>
            </button>
          </div>

          {/* CARD 1: CLIENTE E EMBARCAÇÃO */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-2xs space-y-6">
            <h2 className="text-base sm:text-lg font-bold text-[#0f1d36]">
              Cliente e embarcação
            </h2>

            {/* Campo: Cliente do pedido */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Cliente do pedido
                </label>
                {/* Mobile "+ Novo cliente" link */}
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(true)}
                  className="sm:hidden text-xs font-bold text-[#1868db] hover:underline cursor-pointer"
                >
                  + Novo cliente
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20 focus:border-[#1868db] transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Selecione o cliente...</option>
                    {allCustomers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.document_number ? `· ${c.document_number}` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                {/* Desktop "+ Novo cliente" button */}
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(true)}
                  className="hidden sm:inline-flex items-center justify-center h-11 px-4 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shrink-0 cursor-pointer shadow-2xs transition-colors"
                >
                  + Novo cliente
                </button>
              </div>

              <p className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Dados do cadastro serão reaproveitados.</span>
              </p>
            </div>

            {/* Campo: Embarcação (quando serviços exigirem) */}
            {requiresVessel && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Embarcação
                  </label>
                  {/* Mobile "+ Nova embarcação" link */}
                  <button
                    type="button"
                    onClick={() => setIsNewVesselModalOpen(true)}
                    className="sm:hidden text-xs font-bold text-[#1868db] hover:underline cursor-pointer"
                  >
                    + Nova embarcação
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Ship className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <select
                      value={selectedVesselId}
                      onChange={(e) => setSelectedVesselId(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20 focus:border-[#1868db] transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Selecione a embarcação...</option>
                      {filteredVessels.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name} {v.vessel_type ? `· ${v.vessel_type}` : ""} {v.registration_number ? `(${v.registration_number})` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Desktop "+ Nova embarcação" button */}
                  <button
                    type="button"
                    onClick={() => setIsNewVesselModalOpen(true)}
                    className="hidden sm:inline-flex items-center justify-center h-11 px-4 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shrink-0 cursor-pointer shadow-2xs transition-colors"
                  >
                    + Nova embarcação
                  </button>
                </div>

                {/* Sub-barra: Proprietária cadastrada */}
                {selectedVesselId && (
                  <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-slate-50/70 border border-slate-100 text-xs">
                    <div className="flex items-center gap-2 text-slate-700 min-w-0">
                      <Ship className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="truncate">
                        Proprietária cadastrada: <strong className="text-[#0f1d36]">{currentVesselOwnerName}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toast.info(`Cadastro da embarcação: proprietária registrada como ${currentVesselOwnerName}.`)}
                      className="text-xs font-bold text-[#1868db] hover:underline shrink-0 ml-2 cursor-pointer"
                    >
                      Conferir cadastro →
                    </button>
                  </div>
                )}

                <p className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                  <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>O cliente do pedido pode ser diferente do proprietário.</span>
                </p>
              </div>
            )}
          </div>

          {/* CARD 2: DADOS ESPECÍFICOS DOS SERVIÇOS */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-2xs space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#0f1d36]">
                Dados específicos dos serviços
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                Complete apenas o que muda neste pedido.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {/* 1. SEÇÃO: Transferência de propriedade */}
              {selectedServiceIds.includes("transferencia") && (
                <div className="rounded-2xl border border-slate-200/80 overflow-hidden bg-white transition-all shadow-2xs">
                  <button
                    type="button"
                    onClick={() => toggleAccordion("transferencia")}
                    className="w-full p-4 sm:p-4.5 flex items-center justify-between hover:bg-slate-50/60 text-left transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <ArrowLeftRight className="h-4 w-4 text-slate-700" />
                      <h3 className="text-xs sm:text-sm font-bold text-[#0f1d36]">
                        Transferência de propriedade
                      </h3>
                    </div>
                    {expandedAccordions.transferencia ? (
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                  </button>

                  {expandedAccordions.transferencia && (
                    <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3.5">
                        {/* Proprietário atual / vendedor */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">
                            Proprietário atual / vendedor
                          </label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <select
                              value={transferData.vendedorId}
                              onChange={(e) => setTransferData(prev => ({ ...prev, vendedorId: e.target.value }))}
                              className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20 appearance-none cursor-pointer"
                            >
                              <option value="">Selecione vendedor...</option>
                              {allCustomers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                          </div>
                        </div>

                        {/* Novo proprietário / comprador */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700">
                              Novo proprietário / comprador
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsNewBuyerModalOpen(true)}
                              className="sm:hidden text-[11px] font-bold text-[#1868db] hover:underline cursor-pointer"
                            >
                              + Cadastrar pessoa
                            </button>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <div className="relative flex-1">
                              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <select
                                value={transferData.compradorId}
                                onChange={(e) => setTransferData(prev => ({ ...prev, compradorId: e.target.value }))}
                                className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20 appearance-none cursor-pointer"
                              >
                                <option value="">Selecionar pessoa ou empresa</option>
                                {allCustomers.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>

                            <button
                              type="button"
                              onClick={() => setIsNewBuyerModalOpen(true)}
                              className="hidden sm:inline-flex text-xs font-bold text-[#1868db] hover:underline shrink-0 whitespace-nowrap cursor-pointer"
                            >
                              + Cadastrar pessoa
                            </button>
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>O cadastro de propriedade só será atualizado no momento adequado do processo.</span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 2. SEÇÃO: Renovação de documento */}
              {selectedServiceIds.includes("renovacao") && (
                <div className="rounded-2xl border border-slate-200/80 overflow-hidden bg-white transition-all shadow-2xs">
                  <button
                    type="button"
                    onClick={() => toggleAccordion("renovacao")}
                    className="w-full p-4 sm:p-4.5 flex items-center justify-between hover:bg-slate-50/60 text-left transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-slate-700" />
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-[#0f1d36]">
                          Renovação de documento
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {renovacaoData.tipoDocumento || "Selecionar documento"}
                        </p>
                      </div>
                    </div>
                    {expandedAccordions.renovacao ? (
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                  </button>

                  {expandedAccordions.renovacao && (
                    <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3.5">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">Documento a renovar</label>
                          <select
                            value={renovacaoData.tipoDocumento}
                            onChange={(e) => setRenovacaoData(prev => ({ ...prev, tipoDocumento: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
                          >
                            <option value="TIE (Título de Inscrição de Embarcação)">TIE (Título de Inscrição)</option>
                            <option value="TIEM (Título de Inscrição de Embarcação Miúda)">TIEM (Miúda)</option>
                            <option value="CHA (Habilitação Náutica)">CHA (Habilitação Náutica)</option>
                            <option value="Procuração da Capitania">Procuração da Capitania</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">Número do documento</label>
                          <input
                            type="text"
                            value={renovacaoData.numeroDocumento}
                            onChange={(e) => setRenovacaoData(prev => ({ ...prev, numeroDocumento: e.target.value }))}
                            placeholder="Ex: 381-000123"
                            className="w-full px-3 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">Validade anterior</label>
                          <input
                            type="date"
                            value={renovacaoData.validadeAtual}
                            onChange={(e) => setRenovacaoData(prev => ({ ...prev, validadeAtual: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. SEÇÃO: Alteração de motor */}
              {selectedServiceIds.includes("alteracao_motor") && (
                <div className="rounded-2xl border border-slate-200/80 overflow-hidden bg-white transition-all shadow-2xs">
                  <button
                    type="button"
                    onClick={() => toggleAccordion("alteracao_motor")}
                    className="w-full p-4 sm:p-4.5 flex items-center justify-between hover:bg-slate-50/60 text-left transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <Wrench className="h-4 w-4 text-slate-700" />
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-[#0f1d36]">
                          Alteração de motor
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {motorData.novoMotorMarca ? `${motorData.novoMotorMarca} ${motorData.novoMotorPotencia}` : "Informar dados do motor"}
                        </p>
                      </div>
                    </div>
                    {expandedAccordions.alteracao_motor ? (
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                  </button>

                  {expandedAccordions.alteracao_motor && (
                    <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4">
                      <div className="pt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Motor atual */}
                        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Motor atual cadastrado
                          </span>
                          <div className="text-xs font-bold text-[#0f1d36]">
                            {motorData.motorAtualMarca} ({motorData.motorAtualPotencia})
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            Série: {motorData.motorAtualSerie || "MV-892182"}
                          </div>
                        </div>

                        {/* Novo motor */}
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-700">Nova Potência (HP)</label>
                              <input
                                type="text"
                                value={motorData.novoMotorPotencia}
                                onChange={(e) => setMotorData(prev => ({ ...prev, novoMotorPotencia: e.target.value }))}
                                placeholder="Ex: 300 HP"
                                className="w-full px-3 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-700">Nova Marca/Modelo</label>
                              <input
                                type="text"
                                value={motorData.novoMotorMarca}
                                onChange={(e) => setMotorData(prev => ({ ...prev, novoMotorMarca: e.target.value }))}
                                placeholder="Ex: Yamaha V8"
                                className="w-full px-3 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700">Nº de Série / Nota Fiscal</label>
                            <input
                              type="text"
                              value={motorData.novoMotorSerie}
                              onChange={(e) => setMotorData(prev => ({ ...prev, novoMotorSerie: e.target.value }))}
                              placeholder="Ex: NF-e 001.234 / Série 987654"
                              className="w-full px-3 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Informational Banner */}
            <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100/70 flex items-center gap-2.5 text-xs text-slate-700">
              <Info className="h-4 w-4 text-[#1868db] shrink-0" />
              <span>Você pode completar as informações e conferir tudo na revisão.</span>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO DA ETAPA 2 */}
          {/* Desktop Footer */}
          <div className="hidden sm:flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(1)}
              className="h-11 px-6 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 cursor-pointer"
            >
              Voltar
            </Button>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAndExit}
                className="h-11 px-6 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 cursor-pointer"
              >
                Salvar e sair
              </Button>

              <Button
                type="button"
                onClick={handleContinueToDocuments}
                className="h-11 px-7 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs sm:text-sm shadow-sm cursor-pointer"
              >
                Continuar para documentos →
              </Button>
            </div>
          </div>

          {/* Mobile Footer */}
          <div className="sm:hidden space-y-3 pt-2">
            <div className="text-center">
              <button
                type="button"
                onClick={handleSaveAndExit}
                className="text-xs font-bold text-[#1868db] hover:underline cursor-pointer"
              >
                Salvar e sair
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="h-11 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Voltar
              </Button>

              <Button
                type="button"
                onClick={handleContinueToDocuments}
                className="h-11 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs shadow-sm cursor-pointer"
              >
                Continuar →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. CONTEÚDO DA ETAPA 3: DOCUMENTOS (CENTRAL INTELIGENTE DE PREPARAÇÃO) */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="space-y-4">
          {/* SUB-CABEÇALHO DE CONTEXTO: CLIENTE · EMBARCAÇÃO | SERVIÇOS DO PEDIDO */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-xs font-semibold text-slate-700 py-0.5">
            <div className="flex items-center gap-2 text-[#0f1d36]">
              <User className="h-4 w-4 text-[#1868db] shrink-0" />
              <span>{currentCustomerName} · {currentVesselName}</span>
            </div>

            <span className="hidden sm:inline text-slate-300 font-light">|</span>

            <div className="flex items-center gap-2 text-slate-600">
              <Layers className="h-4 w-4 text-[#1868db] shrink-0" />
              <span>
                {selectedServices.length === 1
                  ? "1 serviço: "
                  : `${selectedServices.length} serviços: `}
                {selectedServices.map(s => s.shortName).join(", ").replace(/, ([^,]*)$/, " e $1")}
              </span>
            </div>
          </div>

          {/* CARD PRINCIPAL: DOCUMENTOS DO PEDIDO */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-2xs space-y-5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#0f1d36]">
                Documentos do pedido
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                A lista se adapta aos serviços selecionados.
              </p>
            </div>

            {/* ÁREA DE ENVIO: DROPZONE DESKTOP & BOTÕES MOBILE */}
            {/* Desktop Dropzone (área pontilhada) */}
            <div className="hidden sm:flex border-2 border-dashed border-slate-200/90 hover:border-[#1868db]/40 rounded-2xl p-6 flex-col items-center justify-center text-center bg-slate-50/30 hover:bg-blue-50/20 transition-all">
              <div className="h-11 w-11 rounded-xl bg-blue-50 text-[#1868db] flex items-center justify-center mb-2.5 shadow-2xs">
                <Upload className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm text-[#0f1d36]">
                Arraste os arquivos aqui
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 mb-4">
                ou selecione no seu computador
              </p>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    setTargetUploadReqId(null);
                    fileInputRef.current?.click();
                  }}
                  className="h-10 px-5 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs shadow-sm cursor-pointer"
                >
                  Selecionar arquivos
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRegisteredDocsModalOpen(true)}
                  className="h-10 px-5 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer inline-flex items-center gap-2"
                >
                  <FileText className="h-4 w-4 text-slate-500" />
                  <span>Usar documentos cadastrados</span>
                </Button>
              </div>
              <p className="text-[11px] text-slate-500 mt-3 inline-flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-[#1868db]" />
                <span>Confira os dados extraídos antes de continuar.</span>
              </p>
            </div>

            {/* Mobile Dropzone (botões empilhados de largura total) */}
            <div className="sm:hidden space-y-2.5">
              <Button
                type="button"
                onClick={() => {
                  setTargetUploadReqId(null);
                  fileInputRef.current?.click();
                }}
                className="w-full h-11 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                <span>Enviar arquivos</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRegisteredDocsModalOpen(true)}
                className="w-full h-11 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileText className="h-4 w-4 text-slate-500" />
                <span>Usar documentos cadastrados</span>
              </Button>

              <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5 pt-0.5">
                <Info className="h-3.5 w-3.5 text-[#1868db] shrink-0" />
                <span>Confira os dados extraídos antes de continuar.</span>
              </p>
            </div>

            {/* Input oculto de upload de arquivos */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
            />

            {/* SEÇÃO DINÂMICA: SELEÇÃO E CONTROLE DOCUMENTO POR DOCUMENTO */}
            <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs space-y-4 p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <FileSignature className="h-5 w-5 text-[#1868db]" />
                    <h3 className="font-bold text-sm sm:text-base text-[#0f1d36]">
                      Documentos de Saída do Pedido ({totalOutputFilesCount} selecionados para geração)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Defina o destino de cada documento individualmente. Apenas os marcados como <strong>Gerar pelo sistema</strong> serão gerados.
                  </p>
                </div>
                <Badge className="self-start sm:self-auto bg-blue-50 text-[#1868db] border-blue-200 text-xs font-semibold px-2.5 py-1">
                  {totalOutputFilesCount} de {applicableOutputDocs.length} a gerar
                </Badge>
              </div>

              {/* LISTA DE MODELOS COM OS 3 CONTROLES */}
              <div className="grid grid-cols-1 gap-3.5 pt-1">
                {applicableOutputDocs.map((doc) => {
                  const currentAction = outputDocActions[doc.id] || "gerar";
                  return (
                    <div
                      key={doc.id}
                      className={cn(
                        "rounded-xl border p-4 transition-all",
                        currentAction === "gerar"
                          ? "border-[#1868db]/30 bg-blue-50/20 shadow-2xs"
                          : currentAction === "anexar"
                          ? "border-amber-200 bg-amber-50/20"
                          : "border-slate-200/60 bg-slate-50/40 opacity-75"
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-[#0f1d36]">
                              {doc.name}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-semibold px-2 py-0.5",
                                doc.documentType === "official_form"
                                  ? "bg-slate-100 text-slate-700 border-slate-200"
                                  : "bg-indigo-50 text-indigo-700 border-indigo-200"
                              )}
                            >
                              {doc.documentType === "official_form" ? "Formulário Oficial da Marinha" : "Documento Próprio da Plataforma"}
                            </Badge>
                            <span className="text-[11px] text-slate-400">· {doc.serviceName}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            Fonte oficial: <span className="font-medium text-slate-600">{doc.officialSource}</span> · {doc.editionDate}
                          </p>
                        </div>

                        {/* GRUPO DE 3 BOTÕES DE AÇÃO */}
                        <div className="inline-flex rounded-xl border border-slate-200/90 p-0.5 bg-slate-100/80 shrink-0 self-start sm:self-center">
                          <button
                            type="button"
                            onClick={() => setDocAction(doc.id, "gerar")}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                              currentAction === "gerar"
                                ? "bg-white text-[#1868db] shadow-2xs font-bold"
                                : "text-slate-600 hover:text-slate-900"
                            )}
                          >
                            Gerar pelo sistema
                          </button>

                          <button
                            type="button"
                            onClick={() => setDocAction(doc.id, "anexar")}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                              currentAction === "anexar"
                                ? "bg-white text-amber-700 shadow-2xs font-bold"
                                : "text-slate-600 hover:text-slate-900"
                            )}
                          >
                            Anexar pronto
                          </button>

                          <button
                            type="button"
                            onClick={() => setDocAction(doc.id, "ignorar")}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                              currentAction === "ignorar"
                                ? "bg-white text-slate-700 shadow-2xs font-bold"
                                : "text-slate-500 hover:text-slate-900"
                            )}
                          >
                            Não usar agora
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SEÇÕES DETALHADAS: "PARA GERAR: [NOME DO DOCUMENTO]" */}
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm sm:text-base text-[#0f1d36] flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#1868db]" />
                  <span>Requisitos Organizados por Documento Ativo</span>
                </h3>
                <span className="text-xs text-slate-400">
                  {activeGeneratingDocs.length === 0
                    ? "Nenhum documento selecionado para geração"
                    : `${activeGeneratingDocs.length} seção(ões) de conferência`}
                </span>
              </div>

              {activeGeneratingDocs.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-center space-y-2">
                  <Info className="h-6 w-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">
                    Nenhum documento selecionado para geração pelo sistema.
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    Selecione "Gerar pelo sistema" nos controles acima caso deseje produzir os formulários oficiais deste pedido.
                  </p>
                </div>
              ) : (
                activeGeneratingDocs.map((doc) => {
                  const client = allCustomers.find(c => c.id === selectedCustomerId);
                  const vess = allVessels.find(v => v.id === selectedVesselId);

                  return (
                    <div
                      key={`card-${doc.id}`}
                      className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4 transition-all"
                    >
                      {/* TÍTULO E FONTE OFICIAL */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1868db]">
                            Para gerar:
                          </span>
                          <h4 className="text-sm sm:text-base font-bold text-[#0f1d36]">
                            {doc.name}
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Finalidade: {doc.purpose}
                          </p>
                        </div>
                        <div className="flex flex-col sm:items-end gap-1">
                          <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700">
                            Assinatura: {doc.signerRole}
                          </Badge>
                          <a
                            href={doc.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-[#1868db] hover:underline inline-flex items-center gap-1"
                          >
                            <span>Consultar fonte oficial</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>

                      {/* GRID DE REQUISITOS (PESSOAL / EMBARCAÇÃO / ANEXOS) */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* 1. DADOS PESSOAIS */}
                        <div className="p-3.5 rounded-xl border border-slate-200/70 bg-slate-50/50 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#0f1d36] flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-[#1868db]" />
                              <span>Dados Pessoais</span>
                            </span>
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                              {client ? "No Cadastro" : "Pendente"}
                            </Badge>
                          </div>
                          <ul className="text-[11px] text-slate-600 space-y-1.5">
                            {doc.personalDataFields.map((f, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{f.name}</span>
                              </li>
                            ))}
                          </ul>
                          {client ? (
                            <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                              Identificado: <strong className="text-slate-700">{client.name}</strong> ({client.document_number || "Doc"})
                            </p>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setCurrentStep(2)}
                              className="text-[10px] font-bold text-[#1868db] hover:underline cursor-pointer block pt-1"
                            >
                              + Preencher cliente na etapa anterior →
                            </button>
                          )}
                        </div>

                        {/* 2. DADOS DA EMBARCAÇÃO */}
                        <div className="p-3.5 rounded-xl border border-slate-200/70 bg-slate-50/50 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#0f1d36] flex items-center gap-1.5">
                              <Ship className="h-3.5 w-3.5 text-[#1868db]" />
                              <span>Dados da Embarcação</span>
                            </span>
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                              {vess ? "No Cadastro" : "Pendente"}
                            </Badge>
                          </div>
                          <ul className="text-[11px] text-slate-600 space-y-1.5">
                            {doc.vesselDataFields.map((f, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{f.name}</span>
                              </li>
                            ))}
                          </ul>
                          {vess ? (
                            <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                              Embarcação: <strong className="text-slate-700">{vess.name}</strong> {vess.registration_number ? `(${vess.registration_number})` : ""}
                            </p>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setCurrentStep(2)}
                              className="text-[10px] font-bold text-[#1868db] hover:underline cursor-pointer block pt-1"
                            >
                              + Preencher embarcação na etapa anterior →
                            </button>
                          )}
                        </div>

                        {/* 3. DOCUMENTOS E ANEXOS COMPARTILHADOS */}
                        <div className="p-3.5 rounded-xl border border-slate-200/70 bg-slate-50/50 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#0f1d36] flex items-center gap-1.5">
                              <Paperclip className="h-3.5 w-3.5 text-[#1868db]" />
                              <span>Anexos Necessários</span>
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {doc.attachments.length} aplicáveis
                            </span>
                          </div>
                          <div className="space-y-2">
                            {doc.attachments.map((att) => {
                              const existingReq = requirements.find(r => r.id === att.id);
                              const isAttached = existingReq && existingReq.status === "recebido";

                              return (
                                <div
                                  key={att.id}
                                  className="p-2 rounded-lg bg-white border border-slate-200/80 space-y-1"
                                >
                                  <div className="flex items-start justify-between gap-1.5">
                                    <span className="text-[11px] font-semibold text-slate-800 line-clamp-1">
                                      {att.name}
                                    </span>
                                    {isAttached ? (
                                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                                        Anexado
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200 shrink-0">
                                        {att.isProtocolOnly ? "Protocolo" : "Preenchimento"}
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-[10px] text-slate-500">
                                    {att.isProtocolOnly ? (
                                      <span className="text-amber-700 font-medium">
                                        Exigido apenas para protocolo na Capitania (não bloqueia gerar PDF).
                                      </span>
                                    ) : (
                                      <span>{att.why}</span>
                                    )}
                                  </p>

                                  {att.sharedWithDocIds && att.sharedWithDocIds.length > 0 && (
                                    <div className="pt-0.5">
                                      <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                        <RefreshCw className="h-2.5 w-2.5 text-slate-400" />
                                        <span>Reutilizado em outros formulários</span>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ABAS DE FILTRO (DESKTOP) E RESUMO TEXTUAL (MOBILE) */}
            {/* Desktop Filter Pills */}
            <div className="hidden sm:flex items-center gap-2 pt-1 select-none">
              <button
                type="button"
                onClick={() => setDocumentFilter("todos")}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer",
                  documentFilter === "todos"
                    ? "bg-[#1868db] text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200/70 text-slate-600"
                )}
              >
                <span>Todos</span>
                <span className={cn(
                  "h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                  documentFilter === "todos" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                )}>
                  {requirements.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDocumentFilter("recebidos")}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer",
                  documentFilter === "recebidos"
                    ? "bg-[#1868db] text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200/70 text-slate-600"
                )}
              >
                <span>Recebidos</span>
                <span className={cn(
                  "h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                  documentFilter === "recebidos" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                )}>
                  {receivedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDocumentFilter("falta_enviar")}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer",
                  documentFilter === "falta_enviar"
                    ? "bg-[#1868db] text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200/70 text-slate-600"
                )}
              >
                <span>Falta enviar</span>
                <span className={cn(
                  "h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                  documentFilter === "falta_enviar" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                )}>
                  {pendingCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDocumentFilter("conferir")}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer",
                  documentFilter === "conferir"
                    ? "bg-[#1868db] text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200/70 text-slate-600"
                )}
              >
                <span>Conferir</span>
                <span className={cn(
                  "h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                  documentFilter === "conferir" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                )}>
                  {needsReviewCount}
                </span>
              </button>
            </div>

            {/* Mobile Summary Line */}
            <div className="sm:hidden pt-1 text-xs font-semibold text-slate-700 select-none">
              <span>{receivedCount} recebidos · {needsReviewCount} para conferir · {pendingCount} pendente</span>
            </div>

            {/* TABELA DE REQUISITOS (DESKTOP) */}
            <div className="hidden sm:block overflow-x-auto -mx-5 sm:mx-0">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                    <th className="py-2.5 px-3 font-semibold">Documento</th>
                    <th className="py-2.5 px-3 font-semibold">Arquivo</th>
                    <th className="py-2.5 px-3 font-semibold">Usado em</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequirements.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <PdfBadgeIcon />
                          <div>
                            <span className="font-bold text-xs sm:text-sm text-[#0f1d36] block">{req.name}</span>
                            <span className="text-[11px] text-slate-400 block">{req.personOrVessel}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={cn("text-xs font-medium", req.fileName ? "text-slate-600" : "text-slate-400")}>
                          {req.fileName || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs text-slate-600 font-medium">{req.usedInLabel}</span>
                      </td>
                      <td className="py-3 px-3">
                        {req.status === "recebido" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Recebido</span>
                          </span>
                        )}
                        {req.status === "conferir" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                            <span>Conferir dados</span>
                          </span>
                        )}
                        {req.status === "falta_enviar" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200/80">
                            <Clock className="h-3.5 w-3.5 text-orange-600" />
                            <span>Falta enviar</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {req.status === "recebido" && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setSelectedViewReq(req);
                              setViewModalOpen(true);
                            }}
                            className="h-8 px-3 rounded-lg border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-500" />
                            <span>Visualizar</span>
                          </Button>
                        )}
                        {req.status === "conferir" && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setSelectedReviewReq(req);
                              setReviewModalOpen(true);
                            }}
                            className="h-8 px-4 rounded-lg border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer shadow-2xs"
                          >
                            Conferir
                          </Button>
                        )}
                        {req.status === "falta_enviar" && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setTargetUploadReqId(req.id);
                              fileInputRef.current?.click();
                            }}
                            className="h-8 px-4 rounded-lg border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer shadow-2xs"
                          >
                            Enviar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* LISTA DE CARTÕES (MOBILE) */}
            <div className="sm:hidden space-y-3">
              {filteredRequirements.map((req) => (
                <div key={req.id} className="p-3.5 rounded-xl border border-slate-200/90 bg-white flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-start gap-3 min-w-0">
                    <PdfBadgeIcon className="h-7 w-7 mt-0.5" />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-[#0f1d36] truncate">{req.name}</h4>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{req.fileName || "—"}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{req.usedInLabel}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {req.status === "recebido" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span>Recebido</span>
                      </span>
                    )}
                    {req.status === "conferir" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                        <span>Conferir dados</span>
                      </span>
                    )}
                    {req.status === "falta_enviar" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200/80">
                        <Clock className="h-3 w-3 text-orange-600" />
                        <span>Falta enviar</span>
                      </span>
                    )}

                    {req.status === "recebido" && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedViewReq(req);
                          setViewModalOpen(true);
                        }}
                        className="h-7 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold cursor-pointer"
                      >
                        Visualizar
                      </button>
                    )}
                    {req.status === "conferir" && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReviewReq(req);
                          setReviewModalOpen(true);
                        }}
                        className="h-7 px-3.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-800 text-[11px] font-semibold cursor-pointer shadow-2xs"
                      >
                        Conferir
                      </button>
                    )}
                    {req.status === "falta_enviar" && (
                      <button
                        type="button"
                        onClick={() => {
                          setTargetUploadReqId(req.id);
                          fileInputRef.current?.click();
                        }}
                        className="h-7 px-3.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-800 text-[11px] font-semibold cursor-pointer shadow-2xs"
                      >
                        Enviar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* NOTA DE RODAPÉ DA TABELA */}
            <p className="text-[11px] text-slate-400 font-normal select-none">
              Lista ilustrativa; requisitos variam conforme o serviço.
            </p>

            {/* BANNER DE ALERTA: ARQUIVO PRECISA DE CONFERÊNCIA */}
            {needsReviewCount > 0 ? (
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-100 text-[#1868db] flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  ⓘ
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-[#0f1d36]">
                    {needsReviewCount === 1 ? "1 arquivo precisa de conferência" : `${needsReviewCount} arquivos precisam de conferência`}
                  </h4>
                  <p className="text-slate-500 text-[11px] sm:text-xs mt-0.5">
                    Abra o documento e confirme as informações identificadas.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-emerald-900">
                    Todos os arquivos recebidos foram conferidos
                  </h4>
                  <p className="text-emerald-700/80 text-[11px] sm:text-xs mt-0.5">
                    Os dados foram validados e estão prontos para a geração dos documentos oficiais.
                  </p>
                </div>
              </div>
            )}

            {/* BOTÕES DE NAVEGAÇÃO DO RODAPÉ (DESKTOP) */}
            <div className="pt-2 hidden sm:flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="h-11 px-6 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 cursor-pointer"
              >
                Voltar
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveAndExit}
                  className="h-11 px-6 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 cursor-pointer"
                >
                  Salvar e sair
                </Button>

                <Button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="h-11 px-7 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs sm:text-sm cursor-pointer shadow-sm"
                >
                  Continuar para revisão →
                </Button>
              </div>
            </div>
            <p className="hidden sm:flex text-[11px] text-slate-400 items-center gap-1.5 pt-0.5">
              <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>Você pode continuar e revisar as pendências antes de gerar.</span>
            </p>

            {/* BOTÕES DE NAVEGAÇÃO DO RODAPÉ (MOBILE) */}
            <div className="sm:hidden space-y-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAndExit}
                className="w-full h-11 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Salvar e sair
              </Button>

              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="w-full h-11 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
                >
                  Voltar
                </Button>

                <Button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="w-full h-11 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs cursor-pointer shadow-sm"
                >
                  Revisar →
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. CONTEÚDO DA ETAPA 4: REVISÃO E GERAÇÃO */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-2xs space-y-6">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#0f1d36]">
              Revisão e confirmação do pedido
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Confira os serviços a serem criados. Cada processo terá controle, prazo e histórico independentes.
            </p>
          </div>

          {/* Resumo dos Serviços do Pedido */}
          <div className="space-y-3">
            {selectedServices.map((serv) => {
              const servReqs = requirements.filter(r => r.targetServiceIds.includes(serv.id));
              const missingReq = servReqs.find(r => r.status === "falta_enviar" || r.status === "conferir");
              const isReady = servReqs.length > 0 && !missingReq;

              return (
                <div key={serv.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 text-[#1868db] flex items-center justify-center shrink-0">
                      <serv.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-[#0f1d36]">{serv.name}</h4>
                      <span className="text-[11px] text-slate-500">
                        {serv.requiresVessel ? "Vinculado à embarcação" : "Serviço pessoal"}
                      </span>
                    </div>
                  </div>

                  {isReady ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                      Pronto para gerar
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                      {missingReq ? `Pendente: ${missingReq.name}` : "Pendente de documento"}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          {/* LISTA EXPLÍCITA DE DOCUMENTOS A SEREM GERADOS (AUDITORIA E CONTROLE) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs sm:text-sm text-[#0f1d36] flex items-center gap-1.5">
                <FileSignature className="h-4 w-4 text-[#1868db]" />
                <span>
                  Geração de {activeGeneratingDocs.length} documento(s) selecionado(s):
                </span>
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                {applicableOutputDocs.length - activeGeneratingDocs.length} desmarcado(s)
              </span>
            </div>

            {activeGeneratingDocs.length === 0 ? (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 text-amber-800 text-xs">
                Nenhum documento está marcado como "Gerar pelo sistema". Volte à etapa de documentos se desejar selecionar algum formulário.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {activeGeneratingDocs.map((doc) => (
                  <div
                    key={`rev-${doc.id}`}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <PdfBadgeIcon className="h-6 w-6" />
                        <span className="font-bold text-xs sm:text-sm text-[#0f1d36]">
                          {doc.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 pl-8">
                        Fonte: {doc.officialSource} · {doc.documentType === "official_form" ? "Formulário Oficial" : "Documento Próprio"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto pl-8 sm:pl-0">
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                        Gerar pelo sistema
                      </Badge>
                      <span className="text-[10px] text-slate-400">Assina: {doc.signerRole}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-[#0f1d36]">
              Cliente: {allCustomers.find(c => c.id === selectedCustomerId)?.name || "Não informado"}
            </p>
            {requiresVessel && (
              <p>
                Embarcação: {allVessels.find(v => v.id === selectedVesselId)?.name || "Não informada"}
              </p>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(3)}
              className="w-full sm:w-auto h-11 px-6 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm cursor-pointer"
            >
              ← Voltar aos documentos
            </Button>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  navigate({
                    to: "/processes/visualizar-e-editar",
                    search: {
                      preview: "true",
                      customerId: selectedCustomerId || undefined,
                      vesselId: selectedVesselId || undefined,
                      services: selectedServiceIds.join(",") || undefined,
                      docs: activeGeneratingDocIds.join(",") || undefined,
                    },
                  })
                }
                className="w-full sm:w-auto h-11 px-4 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <Eye className="h-4 w-4 text-[#1868db]" />
                <span>Visualizar e editar</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  navigate({
                    to: "/processes/arquivos-gerados",
                    search: {
                      preview: "true",
                      customerId: selectedCustomerId || undefined,
                      vesselId: selectedVesselId || undefined,
                      services: selectedServiceIds.join(",") || undefined,
                      docs: activeGeneratingDocIds.join(",") || undefined,
                    },
                  })
                }
                className="w-full sm:w-auto h-11 px-4 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <FileText className="h-4 w-4 text-[#1868db]" />
                <span>Ver arquivos gerados</span>
              </Button>

              <Button
                type="button"
                disabled={isSubmitting || activeGeneratingDocs.length === 0}
                onClick={handleCreateOrderProcesses}
                className="w-full sm:w-auto h-11 px-7 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Criando processos...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirmar e gerar arquivos</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAIS DE CADASTRO NO CONTEXTO DA TELA */}
      {/* ========================================================================= */}
      {/* Modal: Novo Cliente */}
      <ModalNovoCliente
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        companyId={profile?.company_id}
        onSuccess={(newCustomer) => {
          setCustomers(prev => [newCustomer, ...prev]);
          setSelectedCustomerId(newCustomer.id);
          setIsNewCustomerModalOpen(false);
          toast.success(`Cliente ${newCustomer.name} adicionado e selecionado!`);
        }}
      />

      {/* Modal: Nova Embarcação */}
      <ModalNovaEmbarcacao
        isOpen={isNewVesselModalOpen}
        onClose={() => setIsNewVesselModalOpen(false)}
        companyId={profile?.company_id}
        currentCustomerId={selectedCustomerId}
        onSuccess={(newVessel) => {
          setVessels(prev => [newVessel, ...prev]);
          setSelectedVesselId(newVessel.id);
          setIsNewVesselModalOpen(false);
          toast.success(`Embarcação ${newVessel.name} cadastrada e associada!`);
        }}
      />

      {/* Modal: Cadastrar Comprador / Pessoa */}
      <ModalNovoCliente
        isOpen={isNewBuyerModalOpen}
        onClose={() => setIsNewBuyerModalOpen(false)}
        companyId={profile?.company_id}
        title="Cadastrar Novo Comprador"
        onSuccess={(newPerson) => {
          setCustomers(prev => [newPerson, ...prev]);
          setTransferData(prev => ({ ...prev, compradorId: newPerson.id, compradorNome: newPerson.name }));
          setIsNewBuyerModalOpen(false);
          toast.success(`Comprador ${newPerson.name} registrado para o pedido!`);
        }}
      />

      {/* Modal da Etapa 3: Conferência de Dados Extraídos (OCR / Validação) */}
      <ModalConferenciaDocumento
        isOpen={reviewModalOpen}
        onClose={() => {
          setReviewModalOpen(false);
          setSelectedReviewReq(null);
        }}
        requirement={selectedReviewReq}
        onConfirm={handleConfirmExtractedData}
      />

      {/* Modal da Etapa 3: Visualizar Documento */}
      <ModalVisualizarDocumento
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedViewReq(null);
        }}
        requirement={selectedViewReq}
      />

      {/* Modal da Etapa 3: Usar Documentos Cadastrados */}
      <ModalDocumentosCadastrados
        isOpen={isRegisteredDocsModalOpen}
        onClose={() => setIsRegisteredDocsModalOpen(false)}
        onSelectDoc={handleLinkRegisteredDoc}
      />
    </div>
  );
}

// ----------------------------------------------------------------------
// SUB-MODAIS DA ETAPA 3: CONFERÊNCIA, VISUALIZAÇÃO E DOCUMENTOS CADASTRADOS
// ----------------------------------------------------------------------
function ModalConferenciaDocumento({
  isOpen,
  onClose,
  requirement,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  requirement: OrderDocumentRequirement | null;
  onConfirm: (reqId: string, updatedFields: ExtractedFieldItem[]) => void;
}) {
  const [fields, setFields] = useState<ExtractedFieldItem[]>([]);
  const [activeTabMobile, setActiveTabMobile] = useState<"documento" | "dados">("dados");

  useEffect(() => {
    if (requirement?.extractedFields) {
      setFields(requirement.extractedFields);
    } else if (requirement) {
      setFields([
        { id: "nome", label: "Nome Identificado", value: "Carlos Eduardo Ramos", confidence: 98, page: 1, isCritical: true },
        { id: "doc", label: "Documento (CPF)", value: "192.834.721-09", confidence: 99, page: 1, isCritical: true },
        { id: "rg", label: "RG", value: "24.512.980-X SSP/SP", confidence: 95, page: 1 },
        { id: "papel", label: "Papel no Pedido", value: "Comprador / Novo Adquirente", confidence: 99, page: 1, isCritical: true },
      ]);
    }
  }, [requirement]);

  if (!requirement) return null;

  const handleFieldChange = (id: string, newVal: string) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, value: newVal } : f));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base sm:text-lg font-bold text-[#0f1d36]">
                Conferência de dados extraídos
              </DialogTitle>
              <Badge className="bg-blue-50 text-[#1868db] border-blue-100 text-[10px]">
                OCR 98% de precisão
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              {requirement.name} · {requirement.fileName || "documento.pdf"}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Mobile Switch Tabs */}
        <div className="sm:hidden flex border-b border-slate-200 bg-slate-50 px-4 pt-2">
          <button
            type="button"
            onClick={() => setActiveTabMobile("dados")}
            className={cn(
              "flex-1 py-2 text-xs font-bold border-b-2 text-center transition-colors cursor-pointer",
              activeTabMobile === "dados" ? "border-[#1868db] text-[#1868db]" : "border-transparent text-slate-500"
            )}
          >
            Dados extraídos ({fields.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTabMobile("documento")}
            className={cn(
              "flex-1 py-2 text-xs font-bold border-b-2 text-center transition-colors cursor-pointer",
              activeTabMobile === "documento" ? "border-[#1868db] text-[#1868db]" : "border-transparent text-slate-500"
            )}
          >
            Visualizar documento
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Coluna 1: Prévia do Documento com marcação de evidência */}
            <div className={cn("space-y-3", activeTabMobile === "dados" ? "hidden md:block" : "block")}>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Evidência no documento</span>
                <span>Página 1 de 1</span>
              </div>
              <div className="relative rounded-xl border border-slate-200 bg-slate-100/70 p-4 min-h-[320px] flex flex-col items-center justify-center text-center shadow-inner">
                {/* Mock da CNH / Documento Escaneado */}
                <div className="w-full max-w-[280px] bg-white rounded-lg border border-slate-300 p-4 shadow-sm text-left space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-[9px] font-black text-slate-700 tracking-wider uppercase">REPÚBLICA FEDERATIVA DO BRASIL</span>
                    <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">VÁLIDO</span>
                  </div>
                  
                  {/* Destaque Bounding Box */}
                  <div className="p-2 rounded border-2 border-[#1868db] bg-blue-50/40 relative">
                    <div className="absolute -top-2 right-2 px-1 rounded bg-[#1868db] text-[8px] font-bold text-white">
                      OCR DETECTADO
                    </div>
                    <div className="space-y-1">
                      <div>
                        <span className="text-[8px] text-slate-400 block uppercase">Nome</span>
                        <span className="text-[10px] font-bold text-slate-800">CARLOS EDUARDO RAMOS</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 pt-0.5">
                        <div>
                          <span className="text-[8px] text-slate-400 block uppercase">CPF</span>
                          <span className="text-[9px] font-bold text-slate-800">192.834.721-09</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 block uppercase">RG</span>
                          <span className="text-[9px] font-bold text-slate-800">24.512.980-X SSP/SP</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-[8px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
                    <span>Emissão: 12/04/2022</span>
                    <span>Documento verificado</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mt-3">
                  Documento digitalizado com nitidez adequada (300 DPI).
                </p>
              </div>
            </div>

            {/* Coluna 2: Formulário de Conferência dos Campos */}
            <div className={cn("space-y-4", activeTabMobile === "documento" ? "hidden md:block" : "block")}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Campos identificados</span>
                <span className="text-emerald-600 font-semibold text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Alta confiança
                </span>
              </div>

              <div className="space-y-3">
                {fields.map((field) => (
                  <div key={field.id} className="space-y-1 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">
                        {field.label}
                      </label>
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        {field.confidence}% precisão
                      </span>
                    </div>
                    <Input
                      value={field.value}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      className="bg-white text-xs h-9 font-medium"
                    />
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-2.5 text-xs text-slate-600">
                <Info className="h-4 w-4 text-[#1868db] shrink-0 mt-0.5" />
                <span>
                  Confira se os dados coincidem com a via original. Ao confirmar, estes valores serão inseridos nos formulários oficiais da Capitania.
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/40 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto h-10 px-5 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={() => onConfirm(requirement.id, fields)}
            className="w-full sm:w-auto h-10 px-6 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Confirmar dados conferidos</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModalVisualizarDocumento({
  isOpen,
  onClose,
  requirement,
}: {
  isOpen: boolean;
  onClose: () => void;
  requirement: OrderDocumentRequirement | null;
}) {
  if (!requirement) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl w-[95vw] rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <PdfBadgeIcon className="h-9 w-9" />
            <div>
              <DialogTitle className="text-base font-bold text-[#0f1d36]">
                {requirement.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {requirement.fileName || "documento.pdf"} · {requirement.fileSize || "1.8 MB"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div>
              <span className="text-slate-400 block text-[11px]">Vínculo</span>
              <span className="font-bold text-slate-800">{requirement.personOrVessel}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Utilização</span>
              <span className="font-bold text-slate-800">{requirement.usedInLabel}</span>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-200">
              <span className="text-slate-400 block text-[11px]">Por que é necessário?</span>
              <span className="text-slate-600 mt-0.5 block">{requirement.whyNeeded}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="font-bold text-slate-700">Documentos de saída atendidos por este arquivo:</span>
            <ul className="space-y-1 pl-1 text-slate-600">
              {requirement.outputDocuments.map((doc, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-[#1868db]" />
                  <span>{doc}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Arquivo íntegro e validado pelo sistema de armazenamento privado.</span>
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/50">
          <Button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto h-10 px-6 rounded-xl bg-[#1868db] text-white font-semibold text-xs cursor-pointer"
          >
            Fechar visualização
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModalDocumentosCadastrados({
  isOpen,
  onClose,
  onSelectDoc,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectDoc: (doc: any) => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl w-[95vw] rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="p-5 border-b border-slate-100">
          <DialogTitle className="text-base sm:text-lg font-bold text-[#0f1d36] flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-[#1868db]" />
            <span>Documentos cadastrados no espaço</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-0.5">
            Selecione um arquivo já existente nos cadastros de clientes ou embarcações para reaproveitar.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {WORKSPACE_PREVIEW_DOCS.map((doc) => (
            <div
              key={doc.id}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-[#1868db]/40 bg-white hover:bg-blue-50/20 transition-all flex items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <PdfBadgeIcon className="h-8 w-8" />
                <div className="min-w-0">
                  <h4 className="font-bold text-xs sm:text-sm text-[#0f1d36] truncate">{doc.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{doc.origin} · {doc.size}</p>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => onSelectDoc(doc)}
                className="h-8 px-3 rounded-lg bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs shrink-0 cursor-pointer shadow-2xs"
              >
                Vincular
              </Button>
            </div>
          ))}
        </div>

        <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/50">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto h-10 px-6 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------------
// SUB-MODAIS INTERNOS PARA CADASTRO IN-CONTEXT
// ----------------------------------------------------------------------
function ModalNovoCliente({
  isOpen,
  onClose,
  companyId,
  title = "Cadastrar Novo Cliente",
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  companyId?: string;
  title?: string;
  onSuccess: (customer: any) => void;
}) {
  const [name, setName] = useState("");
  const [doc, setDoc] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<"PF" | "PJ">("PF");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }

    setIsLoading(true);
    try {
      const newCustomerObj = {
        id: `c_${Date.now()}`,
        name: name.trim(),
        document_number: doc.trim(),
        email: email.trim(),
        phone: phone.trim(),
        type,
      };

      if (companyId) {
        const { data, error } = await supabase.from("customers").insert({
          company_id: companyId,
          name: name.trim(),
          document_number: doc.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
        }).select().single();

        if (error) {
          console.error("Erro ao inserir cliente:", error);
          toast.error("Erro ao salvar cliente no banco.");
          setIsLoading(false);
          return;
        }
        if (data) {
          onSuccess(data);
          return;
        }
      }

      onSuccess(newCustomerObj);
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado ao salvar cliente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-6 bg-white rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#0f1d36]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Cadastre a pessoa ou empresa para utilização neste pedido.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Tipo PF / PJ */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("PF")}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer",
                type === "PF"
                  ? "border-[#1868db] bg-blue-50/50 text-[#1868db]"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              Pessoa Física (CPF)
            </button>
            <button
              type="button"
              onClick={() => setType("PJ")}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer",
                type === "PJ"
                  ? "border-[#1868db] bg-blue-50/50 text-[#1868db]"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              Pessoa Jurídica (CNPJ)
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              {type === "PF" ? "Nome Completo *" : "Razão Social *"}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === "PF" ? "Ex: Marina Costa" : "Ex: Náutica Sul LTDA"}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                {type === "PF" ? "CPF" : "CNPJ"}
              </label>
              <input
                type="text"
                value={doc}
                onChange={(e) => setDoc(e.target.value)}
                placeholder={type === "PF" ? "000.000.000-00" : "00.000.000/0000-00"}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Telefone / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@email.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
            />
          </div>

          <DialogFooter className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl border-slate-200 text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-[#1868db] hover:bg-[#1456b8] text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              {isLoading ? "Salvando..." : "Salvar e Vincular"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ModalNovaEmbarcacao({
  isOpen,
  onClose,
  companyId,
  currentCustomerId,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  companyId?: string;
  currentCustomerId?: string;
  onSuccess: (vessel: any) => void;
}) {
  const [name, setName] = useState("");
  const [vesselType, setVesselType] = useState("Lancha");
  const [regNumber, setRegNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe o nome da embarcação.");
      return;
    }

    setIsLoading(true);
    try {
      const newVesselObj = {
        id: `v_${Date.now()}`,
        name: name.trim(),
        vessel_type: vesselType,
        registration_number: regNumber.trim() || "381-P99999",
        customer_id: currentCustomerId || null,
      };

      if (companyId) {
        const { data, error } = await supabase.from("vessels").insert({
          company_id: companyId,
          name: name.trim(),
          vessel_type: vesselType,
          registration_number: regNumber.trim() || null,
          customer_id: currentCustomerId || null,
        }).select().single();

        if (error) {
          console.error("Erro ao inserir embarcação:", error);
          toast.error("Erro ao salvar embarcação no banco.");
          setIsLoading(false);
          return;
        }
        if (data) {
          onSuccess(data);
          return;
        }
      }

      onSuccess(newVesselObj);
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado ao salvar embarcação.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-6 bg-white rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#0f1d36]">
            Cadastrar Embarcação
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Adicione uma nova embarcação associada ao cliente do pedido.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Nome da Embarcação *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mar Azul"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Tipo de Embarcação</label>
              <select
                value={vesselType}
                onChange={(e) => setVesselType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
              >
                <option value="Lancha">Lancha</option>
                <option value="Veleiro">Veleiro</option>
                <option value="Moto Aquática">Moto Aquática (Jet Ski)</option>
                <option value="Iate">Iate</option>
                <option value="Bote / Inflável">Bote / Inflável</option>
                <option value="Barco de Pesca">Barco de Pesca</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Nº de Inscrição / TIE</label>
              <input
                type="text"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                placeholder="Ex: 381-000123"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl border-slate-200 text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-[#1868db] hover:bg-[#1456b8] text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              {isLoading ? "Salvando..." : "Salvar Embarcação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
