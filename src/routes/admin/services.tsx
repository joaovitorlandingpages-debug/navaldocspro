import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import React, { useState, useMemo, useEffect } from "react";
import {
  FolderOpen,
  Search,
  Plus,
  SlidersHorizontal,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Archive,
  ExternalLink,
  FileText,
  ShieldCheck,
  HelpCircle,
  Layers,
  Edit,
  Eye,
  Check,
  X,
  AlertTriangle,
  User,
  Calendar,
  ShieldAlert,
  Sparkles,
  Info,
  Trash2,
  Anchor,
  Compass,
  FileSpreadsheet,
  Award,
  Ship,
  Wrench,
  CheckSquare,
  Square,
  FileCheck2,
  FileDown
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OfficialDocumentPreviewModal, type OfficialPreviewDocInfo } from "@/components/admin/OfficialDocumentPreviewModal";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  getCustomizedOutputDocsCatalog, 
  saveCustomizedOutputDocsCatalog 
} from "@/services/documents/adminRequirementsStorage";

export const Route = createFileRoute("/admin/services")({
  validateSearch: (search: Record<string, unknown>) => ({
    category: (search.category as string) || "all",
    status: (search.status as string) || "all",
    source: (search.source as string) || "all",
    q: (search.q as string) || undefined,
  }),
  component: AdminServicesCatalogPage,
});

export type ServiceCategory = "esporte_recreio" | "moto_aquatica" | "profissional";
export type ServiceStatus = "draft" | "in_review" | "approved" | "archived";

export interface NavalServiceItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  categories: ServiceCategory[];
  status: ServiceStatus;
  version: string;
  lastReviewedAt: string;
  reviewedBy: string;
  officialSourceUrl: string;
  jurisdiction: string;
  isNormam211: boolean;
  conditionalQuestions: string[];
  requiredClientFiles: { name: string; description: string; mandatory: boolean }[];
  fillableTemplates: { name: string; templateCode: string; status: "ready" | "draft" }[];
  notes?: string;
}

// Biblioteca de Comprovantes / Documentos Necessários Comuns da Marinha do Brasil
export const STANDARD_NAVAL_DOCS_LIBRARY = [
  { name: "Nota Fiscal do Casco / Declaração de Construção", description: "Comprova aquisição do casco, estaleiro e dimensões estruturais" },
  { name: "Nota Fiscal do Motor com número de série", description: "Comprova procedência, marca, potência em HP e série do propulsor" },
  { name: "Documento de Identidade Oficial com Foto e CPF (RG/CNH)", description: "Qualificação civil completa do titular / requerente" },
  { name: "Comprovante de Residência Atualizado ou Declaração Anexo 2-I", description: "Comprova domicílio nos termos da Lei 7.115/1983" },
  { name: "Fotografias Coloridas da Embarcação (costado e popa)", description: "Exigência de balcão da Capitania com nome e porto gravados" },
  { name: "Título de Inscrição da Embarcação (TIE/TIEM) Original", description: "Documento oficial de registro para averbação ou recolhimento" },
  { name: "Autorização de Transferência de Propriedade (ATP)", description: "Documento de compra e venda com firma reconhecida por autenticidade" },
  { name: "ART e Memorial Descritivo de Engenheiro Naval (CREA)", description: "Responsabilidade técnica para arqueação ou embarcações > 12m" },
  { name: "Atestado Médico de Aptidão Física e Mental", description: "Exigência para habilitação náutica (CHA) comprovando saúde" },
  { name: "Atestado de Treinamento Náutico Prático (ARA)", description: "Comprova horas práticas em escola náutica credenciada pela DPC" },
  { name: "Boletim de Ocorrência Policial ou Declaração de Extravio", description: "Comprovação legal de perda, roubo ou dano irreparável" },
  { name: "Contrato Social e CNPJ da Empresa Armadora", description: "Comprova representação legal para pessoa jurídica / comercial" },
  { name: "Comprovante de Pagamento da Taxa GRU da Capitania", description: "Guia de Recolhimento da União quitada" },
  { name: "Laudo de Estabilidade e Linhas de Casco", description: "Obrigatório para embarcações comerciais de passageiros ou carga" },
];

// Catálogo completo com TODOS os 16 serviços oficiais da plataforma
export const OFFICIAL_NAVAL_SERVICES: NavalServiceItem[] = [
  {
    id: "serv_inscr_esporte",
    slug: "inscricao-inicial-esporte",
    name: "Inscrição Inicial — Embarcação de Esporte e Recreio",
    description: "Primeiro registro de embarcação nova ou de construção artesanal no SISGEMB da Capitania dos Portos.",
    categories: ["esporte_recreio"],
    status: "approved",
    version: "2.4.0",
    lastReviewedAt: "2026-10-25",
    reviewedBy: "Eng. Naval João Silva (CREA 48291/RJ)",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/382",
    jurisdiction: "Capitania dos Portos / NORMAM-211/DPC Cap. 2",
    isNormam211: true,
    conditionalQuestions: [
      "A embarcação é de fabricação seriada de estaleiro cadastrado na Marinha?",
      "Possui Nota Fiscal de fábrica do casco e do motor?",
      "O comprimento total é superior a 12 metros (exigência de laudo de estabilidade e ART)?",
    ],
    requiredClientFiles: [
      { name: "Nota Fiscal de Origem do Casco", description: "Emitida pelo estaleiro credenciado", mandatory: true },
      { name: "Nota Fiscal do Motor", description: "Com identificação de número de série", mandatory: true },
      { name: "Documento de Identidade Oficial com Foto e CPF (RG/CNH)", description: "Do proprietário", mandatory: true },
      { name: "Comprovante de Residência Atualizado", description: "Últimos 90 dias ou Declaração Anexo 2-I", mandatory: true },
      { name: "Fotografias Coloridas da Embarcação (costado e popa)", description: "Com nome e porto gravados", mandatory: true },
      { name: "Comprovante de Pagamento da Taxa GRU da Capitania", description: "Taxa de inscrição inicial", mandatory: true },
    ],
    fillableTemplates: [
      { name: "Requerimento de Inscrição Inicial (Anexo 2-C)", templateCode: "REQ_INSC_01", status: "ready" },
      { name: "Boletim de Simplificação e Atualização de Dados (BSADE Anexo 2-B)", templateCode: "BSADE_01", status: "ready" },
      { name: "Procuração Náutica Específica DPC", templateCode: "PROC_NAV_01", status: "ready" },
      { name: "Declaração de Residência (Anexo 2-I)", templateCode: "DECL_RES_01", status: "ready" },
    ],
  },
  {
    id: "serv_transf_esporte",
    slug: "transferencia-propriedade-esporte",
    name: "Transferência de Propriedade — Esporte e Recreio",
    description: "Registro de mudança de titularidade de embarcações de esporte e recreio (lanchas, veleiros e botes).",
    categories: ["esporte_recreio"],
    status: "approved",
    version: "2.3.0",
    lastReviewedAt: "2026-10-20",
    reviewedBy: "Eng. Naval João Silva (CREA 48291/RJ)",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/382",
    jurisdiction: "Capitania dos Portos / NORMAM-211/DPC",
    isNormam211: true,
    conditionalQuestions: [
      "A embarcação possui TIE (Título de Inscrição de Embarcação) original?",
      "O documento de compra e venda possui reconhecimento de firma por autenticidade?",
      "O adquirente é pessoa física ou pessoa jurídica?",
    ],
    requiredClientFiles: [
      { name: "Documento de Identidade Oficial com Foto e CPF", description: "RG/CNH do comprador e vendedor", mandatory: true },
      { name: "Comprovante de Residência Atualizado", description: "Emitido há menos de 90 dias", mandatory: true },
      { name: "Título de Inscrição da Embarcação (TIE/TIEM) Original", description: "Original com autorização assinada", mandatory: true },
      { name: "Autorização de Transferência de Propriedade (ATP)", description: "Com firma reconhecida por autenticidade", mandatory: true },
      { name: "Fotografias Coloridas da Embarcação (costado e popa)", description: "Conferência visual", mandatory: true },
      { name: "Comprovante de Pagamento da Taxa GRU da Capitania", description: "Taxa de transferência", mandatory: true },
    ],
    fillableTemplates: [
      { name: "Requerimento de Transferência (Anexo 2-C)", templateCode: "REQ_TRANSF_01", status: "ready" },
      { name: "Declaração de Transferência (Anexo 2-D)", templateCode: "DECL_TRANSF_01", status: "ready" },
      { name: "Comunicação de Transferência", templateCode: "COM_TRANSF_01", status: "ready" },
      { name: "Procuração Náutica", templateCode: "PROC_NAV_01", status: "ready" },
    ],
  },
  {
    id: "serv_transf_jet",
    slug: "transferencia-propriedade-moto-aquatica",
    name: "Transferência de Propriedade — Moto Aquática (Jet Ski)",
    description: "Mudança de titularidade de moto aquática com checagem de plaqueta HIN/MIC e potência de fábrica.",
    categories: ["moto_aquatica"],
    status: "approved",
    version: "2.1.0",
    lastReviewedAt: "2026-10-18",
    reviewedBy: "Eng. Naval Carlos Mendes (CREA 12048/SP)",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/384",
    jurisdiction: "Capitania dos Portos / NORMAM-211/DPC",
    isNormam211: true,
    conditionalQuestions: [
      "A moto aquática possui o número do casco HIN/MIC legível gravado pelo fabricante?",
      "Existe autorização de transferência com firma por autenticidade?",
    ],
    requiredClientFiles: [
      { name: "Documento com foto e CPF do Adquirente", description: "RG ou CNH válida", mandatory: true },
      { name: "Documento com foto e CPF do Vendedor", description: "RG ou CNH", mandatory: true },
      { name: "Comprovante de Residência Atualizado", description: "Água, luz ou telefone", mandatory: true },
      { name: "TIE/TIEM da Moto Aquática Original", description: "Com autorização no verso", mandatory: true },
      { name: "Autorização de Transferência de Propriedade (ATP)", description: "Firma reconhecida por autenticidade", mandatory: true },
      { name: "Comprovante de Pagamento da Taxa GRU da Capitania", description: "Taxa de Jet Ski", mandatory: true },
    ],
    fillableTemplates: [
      { name: "Requerimento Específico de Moto Aquática", templateCode: "REQ_JET_01", status: "ready" },
      { name: "Declaração de Conformidade de Casco e Motor", templateCode: "DECL_JET_01", status: "ready" },
      { name: "Procuração Náutica", templateCode: "PROC_NAV_01", status: "ready" },
    ],
  },
  {
    id: "serv_inscr_jet",
    slug: "inscricao-inicial-moto-aquatica",
    name: "Inscrição Inicial — Moto Aquática (Jet Ski)",
    description: "Inscrição e cadastramento inicial de moto aquática nova de fábrica perante a Autoridade Marítima.",
    categories: ["moto_aquatica"],
    status: "approved",
    version: "2.0.0",
    lastReviewedAt: "2026-10-15",
    reviewedBy: "Eng. Naval Carlos Mendes",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/384",
    jurisdiction: "NORMAM-211/DPC",
    isNormam211: true,
    conditionalQuestions: [
      "Possui Nota Fiscal emitida pela concessionária autorizada com código HIN/MIC?",
      "O proprietário possui habilitação na categoria Motonauta (MTA)?",
    ],
    requiredClientFiles: [
      { name: "Nota Fiscal de Origem do Casco", description: "Nota Fiscal da Concessionária", mandatory: true },
      { name: "Documento de Identidade Oficial com Foto e CPF (RG/CNH)", description: "Do comprador", mandatory: true },
      { name: "Comprovante de Residência Atualizado", description: "Últimos 90 dias", mandatory: true },
      { name: "Fotografia Colorida da Plaqueta HIN/MIC", description: "Para validação de fábrica", mandatory: true },
      { name: "Comprovante de Pagamento da Taxa GRU da Capitania", description: "Taxa de inscrição Jet Ski", mandatory: true },
    ],
    fillableTemplates: [
      { name: "Requerimento de Registro de Moto Aquática", templateCode: "REQ_JET_01", status: "ready" },
      { name: "Declaração de Guarda e Responsabilidade de Jet Ski", templateCode: "DECL_JET_RESP_01", status: "ready" },
    ],
  },
  {
    id: "serv_renov_tie",
    slug: "renovacao-validade-tie",
    name: "Renovação de Validade do TIE / TIEM",
    description: "Renovação periódica do documento de registro da embarcação que atinge a validade de 5 anos.",
    categories: ["esporte_recreio", "moto_aquatica"],
    status: "approved",
    version: "2.1.0",
    lastReviewedAt: "2026-10-12",
    reviewedBy: "Eng. Naval João Silva",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/382",
    jurisdiction: "NORMAM-211/DPC item 0212",
    isNormam211: true,
    conditionalQuestions: [
      "Houve alguma alteração estrutural ou troca de motor desde a última emissão?",
      "O endereço cadastrado permanece exatamente o mesmo?",
    ],
    requiredClientFiles: [
      { name: "Título de Inscrição da Embarcação (TIE/TIEM) Original", description: "Original a vencer ou vencido", mandatory: true },
      { name: "Documento com foto e CPF do Proprietário", description: "RG ou CNH", mandatory: true },
      { name: "Comprovante de Residência Atualizado", description: "Últimos 90 dias", mandatory: true },
      { name: "Fotografias Coloridas da Embarcação (costado e popa)", description: "Conferência visual", mandatory: true },
      { name: "Comprovante de Pagamento da Taxa GRU da Capitania", description: "Taxa de renovação", mandatory: true },
    ],
    fillableTemplates: [
      { name: "Requerimento de Renovação de TIE (Anexo 2-C)", templateCode: "REQ_RENOV_01", status: "ready" },
      { name: "Declaração para Renovação (Anexo 2-E)", templateCode: "DECL_RENOV_01", status: "ready" },
      { name: "Procuração Náutica", templateCode: "PROC_NAV_01", status: "ready" },
    ],
  },
  {
    id: "serv_segunda_via",
    slug: "segunda-via-tie-perda-extravio",
    name: "Segunda Via de TIE / TIEM (Extravio / Perda / Roubo)",
    description: "Emissão de segunda via de documento por extravio, perda, roubo, furto ou mau estado de conservação.",
    categories: ["esporte_recreio", "moto_aquatica", "profissional"],
    status: "approved",
    version: "2.0.0",
    lastReviewedAt: "2026-10-14",
    reviewedBy: "Eng. Naval Carlos Mendes",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/382",
    jurisdiction: "NORMAM-211/DPC item 2.14",
    isNormam211: true,
    conditionalQuestions: [
      "O motivo da solicitação é perda/extravio ou mau estado de conservação?",
      "Em caso de roubo/furto, possui Boletim de Ocorrência Policial?",
    ],
    requiredClientFiles: [
      { name: "Boletim de Ocorrência Policial ou Declaração de Extravio", description: "Firma reconhecida se não houver B.O.", mandatory: true },
      { name: "Documento de Identidade do Titular (RG/CNH)", description: "RG ou CNH", mandatory: true },
      { name: "Comprovante de Residência do Titular", description: "Últimos 90 dias", mandatory: true },
      { name: "Comprovante de Pagamento da Taxa GRU da Capitania", description: "Taxa de 2ª via", mandatory: true },
    ],
    fillableTemplates: [
      { name: "Requerimento de Segunda Via de Documento (Anexo 2-C)", templateCode: "REQ_2VIA_01", status: "ready" },
      { name: "Declaração de Extravio Náutico (Anexo 2-F)", templateCode: "DECL_EXTRAV_01", status: "ready" },
    ],
  },
  {
    id: "serv_alt_motor",
    slug: "alteracao-motor-dados-tecnicos",
    name: "Alteração de Motor e Dados Técnicos",
    description: "Averbação de substituição de motor de propulsão, aumento de potência ou alteração de casco.",
    categories: ["esporte_recreio", "moto_aquatica", "profissional"],
    status: "approved",
    version: "2.3.0",
    lastReviewedAt: "2026-10-22",
    reviewedBy: "Eng. Naval Carlos Mendes (CREA 12048/SP)",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/382",
    jurisdiction: "NORMAM-211/DPC itens 2.10 e 2.12",
    isNormam211: true,
    conditionalQuestions: [
      "A nova potência excede a potência máxima homologada na placa do fabricante?",
      "O motor instalado é novo com Nota Fiscal ou usado com recibo de transferência?",
      "Houve necessidade de reforço estrutural no espelho de popa?",
    ],
    requiredClientFiles: [
      { name: "Nota Fiscal do Motor com número de série", description: "Nota Fiscal ou recibo de compra", mandatory: true },
      { name: "Título de Inscrição da Embarcação (TIE/TIEM) Original", description: "Para recolhimento e averbação", mandatory: true },
      { name: "Documento com foto e CPF do Proprietário", description: "RG ou CNH", mandatory: true },
      { name: "ART e Memorial Descritivo de Engenheiro Naval (CREA)", description: "Exigido se exceder a potência do estaleiro", mandatory: false },
      { name: "Comprovante de Pagamento da Taxa GRU da Capitania", description: "Taxa de alteração", mandatory: true },
    ],
    fillableTemplates: [
      { name: "Requerimento de Alteração de Motor (Anexo 2-C)", templateCode: "REQ_ALT_MOT_01", status: "ready" },
      { name: "Boletim de Atualização de Embarcação (BADE Anexo 2-A)", templateCode: "BADE_01", status: "ready" },
    ],
  },
  {
    id: "serv_vistoria",
    slug: "vistoria-arqueacao-tecnica",
    name: "Vistoria e Arqueação Técnica de Embarcação",
    description: "Agendamento e protocolo de vistoria inicial, de renovação ou pericial com emissão de termo oficial.",
    categories: ["esporte_recreio", "profissional"],
    status: "approved",
    version: "2.0.0",
    lastReviewedAt: "2026-10-24",
    reviewedBy: "Eng. Naval João Silva (CREA 48291/RJ)",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/382",
    jurisdiction: "NORMAM-211/DPC Capítulo 3",
    isNormam211: true,
    conditionalQuestions: [
      "A vistoria ocorrerá em clube náutico, marina ou seco?",
      "A embarcação possui dotação de salvatagem em dia (coletes, boias, extintores)?",
    ],
    requiredClientFiles: [
      { name: "Título de Inscrição da Embarcação (TIE/TIEM) Original", description: "Ou nota fiscal em caso de vistoria inicial", mandatory: true },
      { name: "Documento com foto e CPF do Proprietário", description: "RG ou CNH", mandatory: true },
      { name: "Fotografias Coloridas da Embarcação (costado e popa)", description: "Fotos das defensas e salvatagem", mandatory: true },
      { name: "Comprovante de Pagamento da Taxa GRU da Capitania", description: "Taxa de vistoria da Marinha", mandatory: true },
    ],
    fillableTemplates: [
      { name: "Requerimento e Termo de Vistoria de Embarcação", templateCode: "REQ_VIST_01", status: "ready" },
      { name: "Termo de Vistoria de Esporte e Recreio", templateCode: "TERMO_VIST_01", status: "ready" },
    ],
  },
  {
    id: "serv_comercial_turismo",
    slug: "embarcacao-comercial-passageiros-carga",
    name: "Embarcação Comercial / Passageiros / Turismo (NORMAM-201)",
    description: "Inscrição, vistoria e homologação de embarcações de transporte de passageiros, turismo ou carga.",
    categories: ["profissional"],
    status: "approved",
    version: "2.5.0",
    lastReviewedAt: "2026-10-26",
    reviewedBy: "Eng. Naval João Silva (CREA 48291/RJ)",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/388",
    jurisdiction: "NORMAM-201/DPC e NORMAM-202/DPC",
    isNormam211: false,
    conditionalQuestions: [
      "A embarcação realiza transporte remunerado de passageiros?",
      "Possui capacidade superior a 12 passageiros?",
      "Possui projeto estrutural e plano de segurança assinado por Engenheiro Naval?",
    ],
    requiredClientFiles: [
      { name: "Contrato Social e CNPJ da Empresa Armadora", description: "Representação legal", mandatory: true },
      { name: "Laudo de Estabilidade e Linhas de Casco", description: "Assinado por Engenheiro Naval", mandatory: true },
      { name: "ART e Memorial Descritivo de Engenheiro Naval (CREA)", description: "CREA quitado", mandatory: true },
      { name: "Quadro de Lotação e Funções a Bordo", description: "Comandante e tripulação", mandatory: true },
      { name: "Comprovante de Pagamento da Taxa GRU da Capitania", description: "Taxa de embarcação comercial", mandatory: true },
    ],
    fillableTemplates: [
      { name: "Requerimento de Embarcação Comercial (NORMAM-201)", templateCode: "REQ_COM_01", status: "ready" },
      { name: "Memorial Justificativo de Estabilidade e Arqueação", templateCode: "MEM_ESTAB_01", status: "ready" },
      { name: "Proposta de Cartão de Tripulação de Segurança", templateCode: "PROP_CTS_01", status: "ready" },
    ],
  },
  {
    id: "serv_habilitacao_cha",
    slug: "habilitacao-nautica-amador-cha",
    name: "Carteira de Habilitação de Amador (CHA — Inscrição e Renovação)",
    description: "Emissão, exame ou renovação da Carteira de Habilitação de Amador (Motonauta, Arrais, Mestre e Capitão).",
    categories: ["esporte_recreio", "moto_aquatica"],
    status: "approved",
    version: "2.2.0",
    lastReviewedAt: "2026-10-16",
    reviewedBy: "Capitão-Tenente R1 / Instrutor Credenciado DPC",
    officialSourceUrl: "https://www.marinha.mil.br/dpc/amadores",
    jurisdiction: "NORMAM-212/DPC",
    isNormam211: false,
    conditionalQuestions: [
      "Trata-se de 1ª habilitação (exame teórico) ou renovação de validade?",
      "Apresenta CNH válida para dispensa de atestado médico físico/mental?",
    ],
    requiredClientFiles: [
      { name: "Documento de Identidade Oficial com Foto e CPF (RG/CNH)", description: "RG ou CNH válida", mandatory: true },
      { name: "Comprovante de Residência Atualizado", description: "Últimos 90 dias", mandatory: true },
      { name: "Atestado Médico de Aptidão Física e Mental", description: "Ou CNH física válida", mandatory: true },
      { name: "Atestado de Treinamento Náutico Prático (ARA)", description: "Obrigatório para 1ª emissão", mandatory: true },
      { name: "Comprovante de Pagamento da Taxa GRU da Capitania", description: "Taxa de exame ou renovação de CHA", mandatory: true },
    ],
    fillableTemplates: [
      { name: "Requerimento de Inscrição / Emissão de CHA", templateCode: "REQ_CHA_01", status: "ready" },
      { name: "Declaração de Residência do Aluno (Anexo 2-I)", templateCode: "DECL_RES_01", status: "ready" },
    ],
  },
  {
    id: "serv_atestado_ara",
    slug: "atestado-treinamento-nautico-ara",
    name: "Atestado de Treinamento Náutico Prático (ARA / MAC / CAC)",
    description: "Emissão de comprovante de cumprimento de horas de pilotagem prática em escola náutica cadastrada.",
    categories: ["esporte_recreio", "moto_aquatica"],
    status: "approved",
    version: "2.0.0",
    lastReviewedAt: "2026-10-18",
    reviewedBy: "Instrutor Chefe Náutico Credenciado",
    officialSourceUrl: "https://www.marinha.mil.br/dpc/normam-212",
    jurisdiction: "NORMAM-212/DPC",
    isNormam211: false,
    conditionalQuestions: [
      "O aluno completou o mínimo de 6 horas de embarque prático supervisionado?",
      "A embarcação de instrução é homologada na Capitania?",
    ],
    requiredClientFiles: [
      { name: "Documento de Identidade Oficial com Foto e CPF (RG/CNH)", description: "Do aluno", mandatory: true },
      { name: "Comprovante de Residência Atualizado", description: "Do aluno", mandatory: true },
    ],
    fillableTemplates: [
      { name: "Atestado de Treinamento Prático para Amadores (ARA)", templateCode: "ATEST_ARA_01", status: "ready" },
    ],
  },
  {
    id: "serv_laudo_prof",
    slug: "laudo-engenharia-art-profissional",
    name: "Laudo de Estabilidade e Engenharia Naval (ART)",
    description: "Elaboração de perícia técnica, ensaio de inclinação, cálculo de arqueação bruta e memorial descritivo.",
    categories: ["profissional"],
    status: "approved",
    version: "2.4.0",
    lastReviewedAt: "2026-10-24",
    reviewedBy: "Eng. Naval João Silva (CREA 48291/RJ)",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/388",
    jurisdiction: "NORMAM-201/DPC e NORMAM-202/DPC",
    isNormam211: false,
    conditionalQuestions: [
      "A embarcação transporta passageiros ou carga no tráfego comercial?",
      "Houve reforma com alteração das linhas de casco ou superestrutura?",
      "A embarcação possui arqueação bruta (AB) superior a 20?",
    ],
    requiredClientFiles: [
      { name: "Plano de Linhas e Arranjo Geral da Embarcação", description: "Plantas em escala assinadas", mandatory: true },
      { name: "Título de Inscrição da Embarcação (TIE/TIEM) Original", description: "Ou notas fiscais de origem", mandatory: true },
      { name: "ART e Memorial Descritivo de Engenheiro Naval (CREA)", description: "Quitada perante o CREA", mandatory: true },
    ],
    fillableTemplates: [
      { name: "Memorial Justificativo de Estabilidade", templateCode: "MEM_ESTAB_01", status: "ready" },
      { name: "Declaração de Responsabilidade Técnica Naval", templateCode: "DECL_RESP_ENG_01", status: "ready" },
    ],
  },
  {
    id: "serv_alteracao_cadastral",
    slug: "alteracao-cadastral-proprietario",
    name: "Alteração Cadastral de Proprietário",
    description: "Averbação de alteração de domicílio residencial, razão social ou telefone nos registros da Marinha.",
    categories: ["esporte_recreio", "moto_aquatica", "profissional"],
    status: "approved",
    version: "2.1.0",
    lastReviewedAt: "2026-10-20",
    reviewedBy: "Eng. Naval Carlos Mendes",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/382",
    jurisdiction: "NORMAM-211/DPC item 0213",
    isNormam211: true,
    conditionalQuestions: [
      "A alteração é de endereço residencial, estado civil ou razão social?",
    ],
    requiredClientFiles: [
      { name: "Comprovante de Residência Atualizado", description: "Novo comprovante nominal", mandatory: true },
      { name: "Documento de Identidade Oficial com Foto e CPF (RG/CNH)", description: "Do titular", mandatory: true },
      { name: "Título de Inscrição da Embarcação (TIE/TIEM) Original", description: "Para atualização", mandatory: true },
    ],
    fillableTemplates: [
      { name: "Requerimento de Alteração Cadastral (Anexo 2-C)", templateCode: "REQ_ALT_CAD_01", status: "ready" },
    ],
  },
  {
    id: "serv_despacho_prof",
    slug: "despacho-saida-entrada-porto",
    name: "Despacho de Saída / Entrada (Aviso NAVSEG / Marina)",
    description: "Comunicação formal de plano de navegação, rol de passageiros e saída do porto/marina.",
    categories: ["esporte_recreio", "profissional"],
    status: "approved",
    version: "2.0.0",
    lastReviewedAt: "2026-10-22",
    reviewedBy: "Comandante Operacional / Despachante Náutico",
    officialSourceUrl: "https://www.marinha.mil.br/dpc/navseg",
    jurisdiction: "NORMAM-211/DPC Anexo 4-A",
    isNormam211: true,
    conditionalQuestions: [
      "A navegação é em mar aberto ou águas interiores?",
      "Qual é o tempo estimado de permanência no mar?",
    ],
    requiredClientFiles: [
      { name: "Título de Inscrição da Embarcação (TIE/TIEM) Original", description: "Válido", mandatory: true },
      { name: "Documento com foto e CPF do Proprietário", description: "CHA do condutor", mandatory: true },
    ],
    fillableTemplates: [
      { name: "Aviso de Saída de Embarcação (Anexo 4-A / NAVSEG)", templateCode: "AVISO_SAIDA_01", status: "ready" },
    ],
  },
  {
    id: "serv_cancel_inscr",
    slug: "cancelamento-baixa-inscricao",
    name: "Cancelamento / Baixa de Inscrição de Embarcação",
    description: "Baixa definitiva do registro por naufrágio, desmanche, perda total, sucateamento ou exportação.",
    categories: ["esporte_recreio", "moto_aquatica", "profissional"],
    status: "approved",
    version: "1.9.0",
    lastReviewedAt: "2026-10-14",
    reviewedBy: "Eng. Naval Carlos Mendes",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/382",
    jurisdiction: "NORMAM-211 / NORMAM-201",
    isNormam211: true,
    conditionalQuestions: [
      "Qual é o motivo da baixa (Naufrágio, Desmanche/Sucateamento ou Exportação)?",
      "Existe apólice de seguro com indenização de perda total?",
    ],
    requiredClientFiles: [
      { name: "Título de Inscrição da Embarcação (TIE/TIEM) Original", description: "Para recolhimento e inutilização", mandatory: true },
      { name: "Documento de Identidade Oficial com Foto e CPF (RG/CNH)", description: "Do proprietário", mandatory: true },
      { name: "Boletim de Ocorrência Policial ou Declaração de Extravio", description: "Se houve naufrágio ou perda", mandatory: false },
      { name: "Comprovante de Pagamento da Taxa GRU da Capitania", description: "Taxa de baixa", mandatory: true },
    ],
    fillableTemplates: [
      { name: "Requerimento de Baixa de Inscrição (Anexo 2-C)", templateCode: "REQ_BAIXA_01", status: "ready" },
      { name: "Termo de Destinação de Casco", templateCode: "TERMO_CASCO_01", status: "ready" },
    ],
  },
  {
    id: "serv_cts_tripulacao",
    slug: "cartao-tripulacao-seguranca-cts",
    name: "Cartão de Tripulação de Segurança (CTS)",
    description: "Determinação da lotação mínima de segurança e expedição de CTS para embarcações de serviço comercial.",
    categories: ["profissional"],
    status: "approved",
    version: "2.1.0",
    lastReviewedAt: "2026-10-25",
    reviewedBy: "Eng. Naval João Silva (CREA 48291/RJ)",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/388",
    jurisdiction: "NORMAM-201/DPC",
    isNormam211: false,
    conditionalQuestions: [
      "Qual é a área de navegação pretendida (Mar Aberto Costeira ou Interior)?",
      "Qual é a lotação máxima de passageiros e tripulantes?",
      "A embarcação opera no período noturno?",
    ],
    requiredClientFiles: [
      { name: "Contrato Social e CNPJ da Empresa Armadora", description: "Representação", mandatory: true },
      { name: "ART e Memorial Descritivo de Engenheiro Naval (CREA)", description: "CREA", mandatory: true },
      { name: "Comprovante de Pagamento da Taxa GRU da Capitania", description: "Taxa de CTS", mandatory: true },
    ],
    fillableTemplates: [
      { name: "Proposta de Cartão de Tripulação de Segurança (CTS)", templateCode: "PROP_CTS_01", status: "ready" },
    ],
  },
];

const SERVICES_STORAGE_KEY = "navaldocs_admin_services_catalog_v2";

export function getStoredNavalServices(): NavalServiceItem[] {
  if (typeof localStorage === "undefined") {
    return OFFICIAL_NAVAL_SERVICES;
  }
  try {
    const raw = localStorage.getItem(SERVICES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Erro ao ler catálogo de serviços do storage:", e);
  }
  return OFFICIAL_NAVAL_SERVICES;
}

export function saveNavalServices(list: NavalServiceItem[]): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("navaldocs_services_updated", { detail: { count: list.length } }));
  }
}

function AdminServicesCatalogPage() {
  const queryClient = useQueryClient();
  const searchParams = Route.useSearch();
  const { profile, loading: authLoading, isGlobalAdmin, isAdmin } = useAuth();

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.q || "");
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.category || "all");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.status || "all");
  const [sourceFilter, setSourceFilter] = useState<string>(searchParams.source || "all");

  // Lista local com persistência
  const [servicesData, setServicesData] = useState<NavalServiceItem[]>(getStoredNavalServices());

  // Estado do Visualizador Oficial de Folha A4
  const [previewDocInfo, setPreviewDocInfo] = useState<OfficialPreviewDocInfo | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const handleOpenPreviewService = (service: NavalServiceItem) => {
    setPreviewDocInfo({
      id: service.id,
      name: service.name,
      serviceName: service.name,
      officialSource: service.officialSourceUrl ? "NORMAM-211/DPC" : service.jurisdiction || "NORMAM-211/DPC",
      jurisdiction: service.jurisdiction,
      documentType: "official_form",
      signersRole: "Proprietário / Requerente Legal",
      legalPurpose: `Instrução regulamentar do serviço de ${service.name}`,
      templates: service.fillableTemplates.map((t) => ({
        name: t.name,
        templateCode: t.templateCode,
        status: t.status,
      })),
    });
    setIsPreviewModalOpen(true);
  };

  // Estado do Modal de Detalhes
  const [selectedService, setSelectedService] = useState<NavalServiceItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

  // Estado do SUPER EDITOR COMPLETO
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editActiveTab, setEditActiveTab] = useState<"general" | "style_templates" | "requirements">("general");

  // Campos do Formulário de Edição
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategories, setEditCategories] = useState<ServiceCategory[]>([]);
  const [editStatus, setEditStatus] = useState<ServiceStatus>("approved");
  const [editVersion, setEditVersion] = useState("2.3.0");
  const [editReviewedBy, setEditReviewedBy] = useState("");
  const [editOfficialSourceUrl, setEditOfficialSourceUrl] = useState("");
  const [editJurisdiction, setEditJurisdiction] = useState("");
  const [editIsNormam211, setEditIsNormam211] = useState(true);
  const [editRequiredFiles, setEditRequiredFiles] = useState<{ name: string; description: string; mandatory: boolean }[]>([]);
  const [editTemplates, setEditTemplates] = useState<{ name: string; templateCode: string; status: "ready" | "draft" }[]>([]);

  // Novo anexo customizado no editor
  const [customReqName, setCustomReqName] = useState("");
  const [customReqDesc, setCustomReqDesc] = useState("");
  const [customReqMandatory, setCustomReqMandatory] = useState(true);

  // Novo template emitido no editor
  const [newTplName, setNewTplName] = useState("");
  const [newTplCode, setNewTplCode] = useState("");

  // Permissão estrita de administrador global
  const isAuthorized =
    isGlobalAdmin ||
    isAdmin ||
    profile?.role === "admin_master_global" ||
    profile?.role === "admin_master" ||
    profile?.role === "superadmin" ||
    (typeof window !== "undefined" &&
      window.localStorage.getItem("navaldocs_admin_preview") === "true");

  useEffect(() => {
    setServicesData(getStoredNavalServices());
  }, []);

  // Filtragem dos serviços
  const filteredServices = useMemo(() => {
    return servicesData.filter((srv) => {
      const search = searchTerm.toLowerCase().trim();
      const matchSearch =
        !search ||
        srv.name.toLowerCase().includes(search) ||
        srv.slug.toLowerCase().includes(search) ||
        srv.description.toLowerCase().includes(search);

      // Filtro de categoria
      let matchCategory = true;
      if (categoryFilter === "esporte_recreio") {
        matchCategory = srv.categories.includes("esporte_recreio");
      } else if (categoryFilter === "moto_aquatica") {
        matchCategory = srv.categories.includes("moto_aquatica");
      } else if (categoryFilter === "profissional") {
        matchCategory = srv.categories.includes("profissional");
      }

      // Filtro de situação
      let matchStatus = true;
      if (statusFilter !== "all") {
        matchStatus = srv.status === statusFilter;
      }

      // Filtro de fonte
      let matchSource = true;
      if (sourceFilter === "cpes_382") matchSource = srv.officialSourceUrl.includes("382");
      else if (sourceFilter === "cpes_384") matchSource = srv.officialSourceUrl.includes("384");
      else if (sourceFilter === "cpes_388") matchSource = srv.officialSourceUrl.includes("388");

      return matchSearch && matchCategory && matchStatus && matchSource;
    });
  }, [servicesData, searchTerm, categoryFilter, statusFilter, sourceFilter]);

  const handleOpenDetails = (srv: NavalServiceItem) => {
    setSelectedService(srv);
    setIsDetailsOpen(true);
  };

  const handleOpenEdit = (srv: NavalServiceItem) => {
    setSelectedService(srv);
    setEditName(srv.name);
    setEditDesc(srv.description);
    setEditCategories([...srv.categories]);
    setEditStatus(srv.status);
    setEditVersion(srv.version);
    setEditReviewedBy(srv.reviewedBy);
    setEditOfficialSourceUrl(srv.officialSourceUrl);
    setEditJurisdiction(srv.jurisdiction);
    setEditIsNormam211(srv.isNormam211);
    setEditRequiredFiles([...srv.requiredClientFiles]);
    setEditTemplates([...srv.fillableTemplates]);
    setEditActiveTab("general");
    setIsEditOpen(true);
  };

  // Toggle inclusão de um documento da biblioteca padrão
  const handleToggleStandardDoc = (stdDoc: { name: string; description: string }) => {
    const existsIndex = editRequiredFiles.findIndex((f) => f.name.toLowerCase() === stdDoc.name.toLowerCase());
    if (existsIndex >= 0) {
      // Remove
      setEditRequiredFiles(editRequiredFiles.filter((_, idx) => idx !== existsIndex));
      toast.info(`Documento "${stdDoc.name}" desmarcado.`);
    } else {
      // Adiciona como obrigatório
      setEditRequiredFiles([
        ...editRequiredFiles,
        { name: stdDoc.name, description: stdDoc.description, mandatory: true },
      ]);
      toast.success(`Documento "${stdDoc.name}" marcado como necessário!`);
    }
  };

  // Toggle obrigatório vs opcional
  const handleToggleMandatory = (index: number) => {
    const updated = [...editRequiredFiles];
    updated[index].mandatory = !updated[index].mandatory;
    setEditRequiredFiles(updated);
  };

  // Remover documento necessário
  const handleRemoveRequiredFile = (index: number) => {
    const removedName = editRequiredFiles[index]?.name;
    setEditRequiredFiles(editRequiredFiles.filter((_, idx) => idx !== index));
    toast.info(`Documento "${removedName}" removido da lista.`);
  };

  // Adicionar exigência customizada
  const handleAddCustomRequirement = () => {
    if (!customReqName.trim()) {
      toast.error("Informe o nome do documento necessário.");
      return;
    }
    const exists = editRequiredFiles.some((f) => f.name.toLowerCase() === customReqName.trim().toLowerCase());
    if (exists) {
      toast.warning("Este documento já está na lista.");
      return;
    }
    setEditRequiredFiles([
      ...editRequiredFiles,
      {
        name: customReqName.trim(),
        description: customReqDesc.trim() || "Exigência de balcão da Capitania dos Portos",
        mandatory: customReqMandatory,
      },
    ]);
    setCustomReqName("");
    setCustomReqDesc("");
    toast.success("Novo documento necessário adicionado com sucesso!");
  };

  // Adicionar template emitido
  const handleAddTemplate = () => {
    if (!newTplName.trim() || !newTplCode.trim()) {
      toast.error("Informe o nome e o código do formulário oficial.");
      return;
    }
    setEditTemplates([
      ...editTemplates,
      {
        name: newTplName.trim(),
        templateCode: newTplCode.trim().toUpperCase(),
        status: "ready",
      },
    ]);
    setNewTplName("");
    setNewTplCode("");
    toast.success("Novo modelo de documento emitido adicionado!");
  };

  // Remover template emitido
  const handleRemoveTemplate = (index: number) => {
    setEditTemplates(editTemplates.filter((_, idx) => idx !== index));
  };

  // SALVAR ALTERAÇÕES DO SERVIÇO (PERSISTÊNCIA REAL)
  const handleSaveServiceEdit = () => {
    if (!selectedService) return;
    if (!editName.trim()) {
      toast.error("O nome do serviço é obrigatório.");
      return;
    }

    const updatedService: NavalServiceItem = {
      ...selectedService,
      name: editName.trim(),
      description: editDesc.trim(),
      categories: editCategories.length > 0 ? editCategories : ["esporte_recreio"],
      status: editStatus,
      version: editVersion.trim() || selectedService.version,
      reviewedBy: editReviewedBy.trim() || "Engenheiro Sócio NavalDocs",
      officialSourceUrl: editOfficialSourceUrl.trim() || selectedService.officialSourceUrl,
      jurisdiction: editJurisdiction.trim() || selectedService.jurisdiction,
      isNormam211: editIsNormam211,
      requiredClientFiles: editRequiredFiles,
      fillableTemplates: editTemplates,
      lastReviewedAt: new Date().toISOString().split("T")[0],
    };

    const updatedList = servicesData.map((s) => (s.id === selectedService.id ? updatedService : s));
    setServicesData(updatedList);
    saveNavalServices(updatedList);

    // Registra log no Supabase
    supabase.from("activity_logs").insert({
      company_id: profile?.company_id || "00000000-0000-0000-0000-000000000000",
      action: "edit_naval_service_complete",
      module: "services_catalog",
      description: `Regra de serviço [${updatedService.name}] atualizada com ${editRequiredFiles.length} documentos necessários e ${editTemplates.length} modelos por ${profile?.email || "admin"}.`,
      metadata: {
        service_id: updatedService.id,
        version: updatedService.version,
        required_count: editRequiredFiles.length,
        templates_count: editTemplates.length,
        timestamp: new Date().toISOString(),
      },
    }).then(() => {});

    toast.success(`Serviço "${updatedService.name}" e requisitos de documentos salvos com sucesso!`);
    setIsEditOpen(false);
  };

  // EXCLUIR SERVIÇO DO CATÁLOGO
  const handleDeleteService = (serviceId: string, serviceName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o serviço "${serviceName}" do catálogo? Ele deixará de aparecer para abertura de novos pedidos.`)) {
      return;
    }

    const updatedList = servicesData.filter((s) => s.id !== serviceId);
    setServicesData(updatedList);
    saveNavalServices(updatedList);

    if (selectedService?.id === serviceId) {
      setSelectedService(null);
      setIsEditOpen(false);
      setIsDetailsOpen(false);
    }

    // Registra log no Supabase
    supabase.from("activity_logs").insert({
      company_id: profile?.company_id || "00000000-0000-0000-0000-000000000000",
      action: "delete_naval_service",
      module: "services_catalog",
      description: `Serviço [${serviceName}] excluído do catálogo por ${profile?.email || "admin"}.`,
      metadata: {
        service_id: serviceId,
        service_name: serviceName,
        timestamp: new Date().toISOString(),
      },
    }).then(() => {});

    toast.success(`Serviço "${serviceName}" excluído do catálogo.`);
  };

  // Restaurar padrões de fábrica
  const handleResetCatalog = () => {
    if (!confirm("Deseja restaurar todos os 16 serviços para os padrões oficiais da NORMAM-211/201?")) return;
    localStorage.removeItem(SERVICES_STORAGE_KEY);
    setServicesData(OFFICIAL_NAVAL_SERVICES);
    toast.success("Catálogo restaurado para os padrões oficiais da Marinha do Brasil!");
  };

  if (authLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 text-[#075BFF] animate-spin" />
        <span className="text-xs font-semibold text-slate-500">
          Validando permissões de catálogo...
        </span>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto my-16 text-center space-y-4 p-8 bg-white border border-red-100 rounded-2xl shadow-xs">
        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mx-auto border border-red-200">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-[#0B1739]">Acesso Restrito a Administradores</h2>
        <p className="text-xs text-slate-500">
          O gerenciamento do catálogo oficial de serviços exige permissão administrativa global.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 antialiased">
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1739] tracking-tight">
              Catálogo de serviços
            </h1>
            <Badge className="bg-blue-50 text-[#075BFF] border-blue-200 text-xs font-bold px-2.5 py-0.5">
              {servicesData.length} Serviços Ativos
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Controle completo de todos os serviços náuticos, estilo visual de cada documento e seleção detalhada de quais comprovantes são necessários.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetCatalog}
            className="h-9 px-3 text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50 rounded-xl"
            title="Restaurar catálogo para o padrão da Marinha"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Restaurar Padrões DPC
          </Button>

          <Button
            onClick={() => {
              const newCustom: NavalServiceItem = {
                id: `serv_custom_${Date.now()}`,
                slug: `novo-servico-${Date.now()}`,
                name: "Novo Serviço Náutico Especial",
                description: "Descrição detalhada dos procedimentos e objetivos perante a Capitania dos Portos.",
                categories: ["esporte_recreio"],
                status: "approved",
                version: "1.0.0",
                lastReviewedAt: new Date().toISOString().split("T")[0],
                reviewedBy: "Engenheiro Naval Responsável",
                officialSourceUrl: "https://www.marinha.mil.br/dpc/normam-211",
                jurisdiction: "Capitania dos Portos / NORMAM-211/DPC",
                isNormam211: true,
                conditionalQuestions: ["A embarcação possui documentação de origem comprovada?"],
                requiredClientFiles: [
                  { name: "Documento de Identidade Oficial com Foto e CPF (RG/CNH)", description: "Do titular", mandatory: true },
                  { name: "Comprovante de Residência Atualizado", description: "Últimos 90 dias", mandatory: true },
                ],
                fillableTemplates: [
                  { name: "Requerimento ao Capitão dos Portos", templateCode: "REQ_CUSTOM_01", status: "ready" },
                ],
              };
              const updated = [newCustom, ...servicesData];
              setServicesData(updated);
              saveNavalServices(updated);
              handleOpenEdit(newCustom);
              toast.success("Novo serviço criado! Configure as regras e documentos necessários.");
            }}
            className="h-9 px-4 text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-xl shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Novo serviço
          </Button>
        </div>
      </div>

      {/* 2. BARRA DE PESQUISA & FILTROS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Busca */}
          <div className="relative w-full lg:flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por nome do serviço, código ou descrição..."
              className="pl-10 h-9 text-xs sm:text-sm bg-transparent border-0 focus-visible:ring-0 shadow-none"
            />
          </div>

          {/* Filtros em Linha */}
          <div className="w-full lg:w-auto flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
            {/* Categoria */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 text-xs font-semibold bg-white border-slate-200 rounded-xl min-w-[190px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                <SelectItem value="esporte_recreio">Esporte e recreio</SelectItem>
                <SelectItem value="moto_aquatica">Moto aquática (Jet Ski)</SelectItem>
                <SelectItem value="profissional">Profissionais e comerciais</SelectItem>
              </SelectContent>
            </Select>

            {/* Situação */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs font-semibold bg-white border-slate-200 rounded-xl min-w-[160px]">
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as situações</SelectItem>
                <SelectItem value="approved">Aprovado / Publicado</SelectItem>
                <SelectItem value="in_review">Em revisão técnica</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="archived">Arquivado</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setCategoryFilter("all");
                setStatusFilter("all");
                setServicesData(getStoredNavalServices());
                toast.success("Filtros redefinidos.");
              }}
              className="h-9 px-3 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              title="Recarregar catálogo"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* 3. TABELA COM TODOS OS SERVIÇOS */}
      <Card className="border-slate-200 shadow-2xs rounded-2xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-bold">
                <th className="px-6 py-3.5">Serviço Náutico</th>
                <th className="px-6 py-3.5">Categoria</th>
                <th className="px-6 py-3.5">Documentos Necessários (Anexos)</th>
                <th className="px-6 py-3.5">Modelos Emitidos</th>
                <th className="px-6 py-3.5">Revisão / CREA</th>
                <th className="px-6 py-3.5">Situação</th>
                <th className="px-6 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredServices.map((srv) => {
                const isApproved = srv.status === "approved";
                const isReview = srv.status === "in_review";
                const isDraft = srv.status === "draft";

                return (
                  <tr key={srv.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* SERVIÇO */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#0B1739] text-sm">{srv.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 max-w-[320px]">
                        {srv.description}
                      </div>
                    </td>

                    {/* CATEGORIAS */}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {srv.categories.map((cat) => (
                          <Badge
                            key={cat}
                            className={`text-[10px] font-bold px-2 py-0.5 border ${
                              cat === "esporte_recreio"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : cat === "moto_aquatica"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-indigo-50 text-indigo-700 border-indigo-200"
                            }`}
                          >
                            {cat === "esporte_recreio"
                              ? "Esporte e Recreio"
                              : cat === "moto_aquatica"
                                ? "Moto Aquática"
                                : "Profissional"}
                          </Badge>
                        ))}
                      </div>
                    </td>

                    {/* REQUISITOS */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{srv.requiredClientFiles.length} documentos necessários</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {srv.requiredClientFiles.filter((f) => f.mandatory).length} obrigatórios · {srv.requiredClientFiles.filter((f) => !f.mandatory).length} opcionais
                      </div>
                    </td>

                    {/* MODELOS */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-[#075BFF] shrink-0" />
                        <span>{srv.fillableTemplates.length} formulários oficiais</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Preenchimento e PDF automático
                      </div>
                    </td>

                    {/* ÚLTIMA REVISÃO */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-700">
                        v{srv.version} · {format(new Date(srv.lastReviewedAt), "dd/MM/yyyy")}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[170px]" title={srv.reviewedBy}>
                        {srv.reviewedBy}
                      </div>
                    </td>

                    {/* SITUAÇÃO */}
                    <td className="px-6 py-4">
                      {isApproved ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold flex items-center gap-1 w-fit">
                          <CheckCircle2 className="h-3 w-3" />
                          Aprovado
                        </Badge>
                      ) : isReview ? (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold flex items-center gap-1 w-fit">
                          <Clock className="h-3 w-3" />
                          Em Revisão
                        </Badge>
                      ) : isDraft ? (
                        <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-bold flex items-center gap-1 w-fit">
                          <Edit className="h-3 w-3" />
                          Rascunho
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] font-bold flex items-center gap-1 w-fit">
                          <Archive className="h-3 w-3" />
                          Arquivado
                        </Badge>
                      )}
                    </td>

                    {/* AÇÕES */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPreviewService(srv)}
                          className="h-8 text-[11px] font-semibold text-[#075BFF] bg-blue-50/70 hover:bg-blue-100/70 border-blue-200 rounded-xl cursor-pointer gap-1"
                          title="Visualizar layout oficial A4 da Marinha do Brasil"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Prévia A4
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetails(srv)}
                          className="h-8 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 border-slate-200 rounded-xl cursor-pointer"
                        >
                          Visualizar
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleOpenEdit(srv)}
                          className="h-8 text-[11px] font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-xl shadow-2xs cursor-pointer"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" />
                          Editar
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteService(srv.id, srv.name)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 border-slate-200 hover:border-red-200 rounded-xl cursor-pointer"
                          title={`Excluir serviço ${srv.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ========================================================= */}
      {/* 4. MODAL DE DETALHES RÁPIDOS DO SERVIÇO */}
      {/* ========================================================= */}
      {selectedService && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6 sm:p-8">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center border border-blue-100">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold text-[#0B1739]">
                      {selectedService.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      Código: <code>{selectedService.slug}</code> · Versão de Regras:{" "}
                      <strong>v{selectedService.version}</strong>
                    </DialogDescription>
                  </div>
                </div>

                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold">
                  {selectedService.status === "approved" ? "● Aprovado / Publicado" : "● Em Revisão"}
                </Badge>
              </div>
            </DialogHeader>

            <div className="py-4 space-y-6 text-xs text-slate-600">
              <p className="text-sm text-slate-700 font-medium leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                {selectedService.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Documentos Necessários ({selectedService.requiredClientFiles.length})
                  </h4>
                  <ul className="space-y-1.5 text-xs">
                    {selectedService.requiredClientFiles.map((f, i) => (
                      <li key={i} className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5">
                        <span className="font-medium text-[#0B1739]">{f.name}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {f.mandatory ? "Obrigatório" : "Opcional"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-[#075BFF]" />
                    Modelos Emitidos ({selectedService.fillableTemplates.length})
                  </h4>
                  <ul className="space-y-1.5 text-xs">
                    {selectedService.fillableTemplates.map((t, i) => (
                      <li key={i} className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="font-medium text-[#0B1739]">{t.name}</span>
                        <code className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {t.templateCode}
                        </code>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailsOpen(false)}
                className="text-xs rounded-xl"
              >
                Fechar
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setIsDetailsOpen(false);
                  handleOpenEdit(selectedService);
                }}
                className="text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-xl gap-1.5"
              >
                <Edit className="h-3.5 w-3.5" />
                Editar Serviço Completo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================= */}
      {/* 5. SUPER EDITOR COMPLETO DO SERVIÇO COM ESTILO E SELEÇÃO  */}
      {/* ========================================================= */}
      {selectedService && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl p-6 sm:p-8">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center border border-blue-100">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold text-[#0B1739]">
                      Editor Completo: {selectedService.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      Configure os dados do serviço, o estilo dos documentos emitidos e selecione quais comprovantes são necessários.
                    </DialogDescription>
                  </div>
                </div>

                <Badge className="bg-blue-50 text-[#075BFF] border-blue-200 text-xs font-bold w-fit">
                  Código: {selectedService.slug}
                </Badge>
              </div>
            </DialogHeader>

            {/* Abas do Editor */}
            <Tabs value={editActiveTab} onValueChange={(val: any) => setEditActiveTab(val)} className="w-full mt-4">
              <TabsList className="bg-slate-100 p-1 rounded-xl w-full grid grid-cols-3 gap-1">
                <TabsTrigger
                  value="general"
                  className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#075BFF] data-[state=active]:shadow-xs flex items-center gap-1.5"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  1. Regras do Serviço
                </TabsTrigger>

                <TabsTrigger
                  value="style_templates"
                  className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#075BFF] data-[state=active]:shadow-xs flex items-center gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5" />
                  2. Estilo & Modelos Emitidos ({editTemplates.length})
                </TabsTrigger>

                <TabsTrigger
                  value="requirements"
                  className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#075BFF] data-[state=active]:shadow-xs flex items-center gap-1.5"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  3. Documentos Necessários ({editRequiredFiles.length})
                </TabsTrigger>
              </TabsList>

              {/* ABA 1: REGRAS E DADOS DO SERVIÇO */}
              <TabsContent value="general" className="py-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Nome Oficial do Serviço *</Label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Responsável pela Revisão / CREA</Label>
                    <Input
                      value={editReviewedBy}
                      onChange={(e) => setEditReviewedBy(e.target.value)}
                      placeholder="Ex: Eng. Naval João Silva (CREA 48291/RJ)"
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Descrição Comercial & Operacional</Label>
                  <Textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={2}
                    className="text-xs rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Situação do Serviço</Label>
                    <Select value={editStatus} onValueChange={(val: any) => setEditStatus(val)}>
                      <SelectTrigger className="h-9 text-xs rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved">Aprovado / Publicado</SelectItem>
                        <SelectItem value="in_review">Em Revisão Técnica</SelectItem>
                        <SelectItem value="draft">Rascunho</SelectItem>
                        <SelectItem value="archived">Arquivado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Versão da Regra</Label>
                    <Input
                      value={editVersion}
                      onChange={(e) => setEditVersion(e.target.value)}
                      placeholder="Ex: 2.4.0"
                      className="h-9 text-xs rounded-xl font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Regulado pela NORMAM-211?</Label>
                    <Select
                      value={editIsNormam211 ? "true" : "false"}
                      onValueChange={(val) => setEditIsNormam211(val === "true")}
                    >
                      <SelectTrigger className="h-9 text-xs rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Sim (NORMAM-211 Esporte/Recreio)</SelectItem>
                        <SelectItem value="false">Não (NORMAM-201 / NORMAM-212)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Jurisdição / Base Legal da Marinha</Label>
                    <Input
                      value={editJurisdiction}
                      onChange={(e) => setEditJurisdiction(e.target.value)}
                      placeholder="Ex: Capitania dos Portos / NORMAM-211/DPC Cap. 2"
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Link Oficial da Marinha / DPC</Label>
                    <Input
                      value={editOfficialSourceUrl}
                      onChange={(e) => setEditOfficialSourceUrl(e.target.value)}
                      placeholder="https://www.marinha.mil.br/dpc/normam-211"
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* ABA 2: ESTILO DO DOCUMENTO & MODELOS EMITIDOS */}
              <TabsContent value="style_templates" className="py-4 space-y-5">
                {/* Prévia do Estilo do Documento Oficial */}
                <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/60 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#075BFF]" />
                      <h4 className="text-xs font-bold text-[#0B1739]">
                        Estilo Visual Padrão da Marinha do Brasil (NORMAM)
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => selectedService && handleOpenPreviewService(selectedService)}
                        className="h-7 text-[11px] font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-lg shadow-xs gap-1 cursor-pointer"
                        title="Abrir folha de prova A4 em tamanho real"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Abrir Folha A4 Completa
                      </Button>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                        Padrão Oficial DPC Ativo
                      </Badge>
                    </div>
                  </div>

                  {/* Simulação Visual do Estilo do Documento */}
                  <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-xs font-serif space-y-4 max-w-2xl mx-auto text-center">
                    <div className="border-b border-slate-200 pb-3 space-y-1">
                      <div className="h-8 w-8 mx-auto bg-amber-50 rounded-full flex items-center justify-center text-amber-700 font-bold text-xs border border-amber-200">
                        ⚓
                      </div>
                      <p className="text-[11px] font-bold tracking-wider text-slate-800 uppercase font-sans">
                        Marinha do Brasil — Diretoria de Portos e Costas
                      </p>
                      <p className="text-[10px] text-slate-500 font-sans">
                        Capitania dos Portos / Delegacia / Agência Competente
                      </p>
                    </div>

                    <div className="py-2">
                      <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        {editName || "Requerimento Oficial Padronizado"}
                      </p>
                      <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                        Base Legal: {editJurisdiction || "NORMAM-211/DPC"}
                      </p>
                    </div>

                    <div className="text-left text-[11px] text-slate-600 font-sans space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="grid grid-cols-2 gap-2">
                        <div><strong>Requerente:</strong> [Nome do Titular Cadastral]</div>
                        <div><strong>CPF/CNPJ:</strong> [000.000.000-00]</div>
                        <div><strong>Embarcação:</strong> [Nome da Embarcação]</div>
                        <div><strong>Inscrição:</strong> [Nº do TIE/TIEM]</div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-400 font-sans">
                      <span>Tipografia: Liberation Sans 10pt (ABNT/ISO)</span>
                      <span className="text-[#075BFF] font-semibold">Assinatura Digital Gov.br (Lei 14.063/2020)</span>
                    </div>
                  </div>
                </div>

                {/* Modelos Emitidos pelo Serviço */}
                <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#0B1739] flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-[#075BFF]" />
                        Modelos e Formulários Emitidos por este Serviço ({editTemplates.length})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Estes documentos são gerados e preenchidos automaticamente com os dados do cliente e da embarcação.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {editTemplates.map((tpl, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-blue-50 text-[#075BFF] flex items-center justify-center font-bold text-xs">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#0B1739]">{tpl.name}</p>
                            <p className="text-[11px] font-mono text-slate-500">Código: {tpl.templateCode}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                            {tpl.status === "ready" ? "Pronto para Emissão" : "Rascunho"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveTemplate(idx)}
                            className="h-7 w-7 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer"
                            title="Remover modelo do serviço"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Adicionar outro modelo ao serviço */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                    <Input
                      value={newTplName}
                      onChange={(e) => setNewTplName(e.target.value)}
                      placeholder="Nome do formulário (ex: Termo de Entrega)"
                      className="h-8 text-xs rounded-xl flex-1"
                    />
                    <Input
                      value={newTplCode}
                      onChange={(e) => setNewTplCode(e.target.value)}
                      placeholder="Código (ex: TERMO_ENTR_01)"
                      className="h-8 text-xs rounded-xl w-full sm:w-48 font-mono uppercase"
                    />
                    <Button
                      size="sm"
                      onClick={handleAddTemplate}
                      className="h-8 text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-xl shrink-0 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Adicionar Modelo
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* ABA 3: SELEÇÃO DE DOCUMENTOS NECESSÁRIOS (CHECKLIST DE ANEXOS) */}
              <TabsContent value="requirements" className="py-4 space-y-6">
                {/* Seletor Rápido da Biblioteca de Documentos Padrão da Marinha */}
                <div className="border border-blue-100 bg-blue-50/40 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#0B1739] flex items-center gap-1.5">
                        <CheckSquare className="h-4 w-4 text-[#075BFF]" />
                        Biblioteca de Documentos Comuns da Marinha (Marque para Selecionar)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Clique nos comprovantes oficiais abaixo para marcar ou desmarcar quais documentos são necessários para este serviço.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {STANDARD_NAVAL_DOCS_LIBRARY.map((stdDoc, i) => {
                      const isSelected = editRequiredFiles.some(
                        (f) => f.name.toLowerCase() === stdDoc.name.toLowerCase()
                      );

                      return (
                        <div
                          key={i}
                          onClick={() => handleToggleStandardDoc(stdDoc)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition-all ${
                            isSelected
                              ? "bg-white border-[#075BFF] shadow-2xs text-[#0B1739]"
                              : "bg-white/60 border-slate-200 text-slate-500 hover:border-slate-300"
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isSelected ? (
                              <CheckCircle2 className="h-4 w-4 text-[#075BFF]" />
                            ) : (
                              <div className="h-4 w-4 rounded-md border border-slate-300" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-xs leading-snug ${isSelected ? "text-[#0B1739]" : "text-slate-600"}`}>
                              {stdDoc.name}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{stdDoc.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lista dos Documentos Atualmente Selecionados para este Serviço */}
                <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#0B1739] flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Documentos Necessários Selecionados ({editRequiredFiles.length})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Estes documentos serão exigidos do cliente durante a abertura do pedido deste serviço.
                      </p>
                    </div>
                    <Badge className="bg-slate-800 text-white text-[10px] font-bold">
                      {editRequiredFiles.filter(f => f.mandatory).length} Obrigatórios
                    </Badge>
                  </div>

                  {editRequiredFiles.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      <p className="text-xs text-slate-500 font-medium">
                        Nenhum documento necessário selecionado ainda. Marque os itens acima ou adicione abaixo.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {editRequiredFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 gap-3"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[#0B1739]">{file.name}</p>
                              <p className="text-[11px] text-slate-500">{file.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleMandatory(idx)}
                              className={`h-7 text-[10px] font-bold rounded-lg cursor-pointer ${
                                file.mandatory
                                  ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                  : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                              }`}
                            >
                              {file.mandatory ? "● Obrigatório" : "○ Opcional / Condicional"}
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveRequiredFile(idx)}
                              className="h-7 w-7 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer"
                              title="Remover documento necessário"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Adicionar Documento Específico Customizado */}
                  <div className="pt-4 border-t border-slate-100 space-y-3 bg-slate-50/60 p-4 rounded-xl">
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5 text-[#075BFF]" />
                      Adicionar Exigência Específica (Balcão Local da Capitania)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        value={customReqName}
                        onChange={(e) => setCustomReqName(e.target.value)}
                        placeholder="Nome do comprovante (ex: Licença Ambiental da Marina)"
                        className="h-8 text-xs rounded-xl"
                      />
                      <Input
                        value={customReqDesc}
                        onChange={(e) => setCustomReqDesc(e.target.value)}
                        placeholder="Finalidade (ex: Exigência para áreas de preservação ambiental)"
                        className="h-8 text-xs rounded-xl"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={customReqMandatory}
                          onChange={(e) => setCustomReqMandatory(e.target.checked)}
                          className="h-4 w-4 rounded text-[#075BFF] focus:ring-blue-500"
                        />
                        Marcar como obrigatório
                      </label>
                      <Button
                        size="sm"
                        onClick={handleAddCustomRequirement}
                        className="h-8 text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-xl cursor-pointer"
                      >
                        + Adicionar Documento
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => selectedService && handleDeleteService(selectedService.id, selectedService.name)}
                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 rounded-xl cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Excluir Serviço
                </Button>
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  Salvo instantaneamente no catálogo.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditOpen(false)}
                  className="text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveServiceEdit}
                  className="text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Salvar Alterações do Serviço
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {/* 6. MODAL DO VISUALIZADOR OFICIAL DE FOLHA A4 */}
      <OfficialDocumentPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        documentInfo={previewDocInfo}
      />
    </div>
  );
}
