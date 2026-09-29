import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import React, { useState, useMemo } from "react";
import { 
  FolderOpen, Search, Plus, SlidersHorizontal, RefreshCw, 
  CheckCircle2, AlertCircle, Clock, Archive, ExternalLink, 
  FileText, ShieldCheck, HelpCircle, Layers, Edit, Eye, 
  Check, X, AlertTriangle, User, Calendar, ShieldAlert, Sparkles, Info
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

// Catálogo base consolidado de acordo com a NORMAM e fontes oficiais da Marinha (CPES)
export const OFFICIAL_NAVAL_SERVICES: NavalServiceItem[] = [
  {
    id: "serv_transf_esporte",
    slug: "transferencia-propriedade-esporte",
    name: "Transferência de Propriedade — Esporte e Recreio",
    description: "Registro de mudança de titularidade de embarcações de esporte e recreio (lanchas, veleiros e botes).",
    categories: ["esporte_recreio"],
    status: "approved",
    version: "2.3.0",
    lastReviewedAt: "2026-09-20",
    reviewedBy: "Eng. Naval João Silva (CREA 48291/RJ)",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/382",
    jurisdiction: "Capitania dos Portos / NORMAM-211/DPC",
    isNormam211: true,
    conditionalQuestions: [
      "A embarcação possui TIE (Título de Inscrição de Embarcação) original?",
      "O documento de compra e venda possui reconhecimento de firma por autenticidade?",
      "O adquirente é pessoa física ou pessoa jurídica?"
    ],
    requiredClientFiles: [
      { name: "Documento de Identidade Oficial com Foto e CPF", description: "RG/CNH do comprador e vendedor", mandatory: true },
      { name: "Comprovante de Residência Atualizado", description: "Emitido há menos de 90 dias", mandatory: true },
      { name: "Título de Inscrição da Embarcação (TIE/TIEM)", description: "Documento original ou cópia autenticada", mandatory: true },
      { name: "Instrumento de Compra e Venda / Transferência", description: "Com firma reconhecida por autenticidade", mandatory: true }
    ],
    fillableTemplates: [
      { name: "Requerimento de Transferência ao Capitão dos Portos", templateCode: "REQ_TRANSF_01", status: "ready" },
      { name: "Boletim de Atualização de Embarcação (BADE)", templateCode: "BADE_FORM_01", status: "ready" },
      { name: "Termo de Responsabilidade e Guarda Náutica", templateCode: "TERMO_RESP_01", status: "ready" }
    ]
  },
  {
    id: "serv_transf_jet",
    slug: "transferencia-propriedade-moto-aquatica",
    name: "Transferência de Propriedade — Moto Aquática (Jet Ski)",
    description: "Mudança de titularidade de moto aquática, com verificação de número de casco HIN/MIC e potência.",
    categories: ["moto_aquatica"],
    status: "approved",
    version: "2.1.0",
    lastReviewedAt: "2026-09-18",
    reviewedBy: "Eng. Naval João Silva (CREA 48291/RJ)",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/384",
    jurisdiction: "Capitania dos Portos / NORMAM-211/DPC",
    isNormam211: true,
    conditionalQuestions: [
      "A moto aquática possui o número do casco legível gravado pelo fabricante?",
      "Existe nota fiscal do motor ou termo de responsabilidade de procedência?",
      "O novo proprietário possui habilitação compatível (MTA ou Arrais Amador)?"
    ],
    requiredClientFiles: [
      { name: "Documento com foto e CPF do Adquirente", description: "RG ou CNH válida", mandatory: true },
      { name: "Comprovante de Residência", description: "Água, luz ou telefone", mandatory: true },
      { name: "TIE/TIEM da Moto Aquática", description: "Original com autorização de transferência", mandatory: true },
      { name: "Nota Fiscal ou Recibo de Compra e Venda", description: "Reconhecimento por autenticidade", mandatory: true }
    ],
    fillableTemplates: [
      { name: "Requerimento Específico de Moto Aquática", templateCode: "REQ_JET_01", status: "ready" },
      { name: "Declaração de Conformidade de Casco e Motor", templateCode: "DECL_JET_01", status: "ready" }
    ]
  },
  {
    id: "serv_inscr_esporte",
    slug: "inscricao-inicial-esporte",
    name: "Inscrição Inicial — Embarcação de Esporte e Recreio",
    description: "Primeiro registro de embarcação nova ou de construção artesanal/amadora na Capitania.",
    categories: ["esporte_recreio"],
    status: "approved",
    version: "2.0.0",
    lastReviewedAt: "2026-09-15",
    reviewedBy: "Eng. Naval Carlos Mendes",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/382",
    jurisdiction: "NORMAM-211/DPC",
    isNormam211: true,
    conditionalQuestions: [
      "A embarcação é de fabricação seriada de estaleiro cadastrado na Marinha?",
      "Possui Nota Fiscal de fábrica do casco e do motor?",
      "O comprimento total é superior a 12 metros (exigência de laudo de estabilidade)?"
    ],
    requiredClientFiles: [
      { name: "Nota Fiscal de Origem do Casco", description: "Emitida pelo estaleiro credenciado", mandatory: true },
      { name: "Nota Fiscal do Motor", description: "Com identificação de número de série", mandatory: true },
      { name: "Memorial Descritivo da Embarcação", description: "Especificações técnicas do fabricante", mandatory: true },
      { name: "Fotos da Embarcação (Perfil, Popa e Proa)", description: "Coloridas em ângulo nítido", mandatory: true }
    ],
    fillableTemplates: [
      { name: "Requerimento de Inscrição Inicial", templateCode: "REQ_INSC_01", status: "ready" },
      { name: "Boletim de Cadastro de Embarcação (BADE)", templateCode: "BADE_FORM_01", status: "ready" }
    ]
  },
  {
    id: "serv_renov_tie",
    slug: "renovacao-validade-tie",
    name: "Renovação de Validade do TIE / TIEM",
    description: "Renovação periódica do documento de registro de embarcações e motos aquáticas.",
    categories: ["esporte_recreio", "moto_aquatica"],
    status: "approved",
    version: "1.9.0",
    lastReviewedAt: "2026-09-10",
    reviewedBy: "Eng. Naval João Silva",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/382",
    jurisdiction: "NORMAM-211/DPC",
    isNormam211: true,
    conditionalQuestions: [
      "Houve alguma alteração de motor, cor ou características físicas desde a última emissão?",
      "O proprietário continua residindo no mesmo endereço cadastrado?"
    ],
    requiredClientFiles: [
      { name: "TIE/TIEM Atual a Vencer ou Vencido", description: "Documento original", mandatory: true },
      { name: "Documento com foto e CPF do Proprietário", description: "RG ou CNH", mandatory: true },
      { name: "Comprovante de Residência", description: "Últimos 90 dias", mandatory: true }
    ],
    fillableTemplates: [
      { name: "Requerimento de Renovação de TIE", templateCode: "REQ_RENOV_01", status: "ready" }
    ]
  },
  {
    id: "serv_segunda_via",
    slug: "segunda-via-tie-perda-extravio",
    name: "Segunda Via de TIE / TIEM (Extravio / Perda / Roubo)",
    description: "Emissão de segunda via de documento por perda, furto, roubo ou mau estado de conservação.",
    categories: ["esporte_recreio", "moto_aquatica", "profissional"],
    status: "approved",
    version: "1.8.0",
    lastReviewedAt: "2026-09-12",
    reviewedBy: "Eng. Naval Carlos Mendes",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/382",
    jurisdiction: "NORMAM-211/DPC / NORMAM-201/DPC",
    isNormam211: true,
    conditionalQuestions: [
      "O motivo da solicitação é perda/extravio ou mau estado de conservação?",
      "Em caso de roubo/furto, possui Boletim de Ocorrência Policial?"
    ],
    requiredClientFiles: [
      { name: "Declaração de Perda/Extravio ou B.O.", description: "Com firma reconhecida se não houver B.O.", mandatory: true },
      { name: "Documento de Identidade do Proprietário", description: "RG ou CNH", mandatory: true },
      { name: "Comprovante de Residência", description: "Últimos 90 dias", mandatory: true }
    ],
    fillableTemplates: [
      { name: "Requerimento de Segunda Via de Documento", templateCode: "REQ_2VIA_01", status: "ready" },
      { name: "Declaração de Extravio Náutico", templateCode: "DECL_EXTRAV_01", status: "ready" }
    ]
  },
  {
    id: "serv_alt_motor",
    slug: "alteracao-motor-dados-tecnicos",
    name: "Alteração de Motor e Dados Técnicos",
    description: "Averbação de troca de motor, aumento de potência ou modificações estruturais da embarcação.",
    categories: ["esporte_recreio", "moto_aquatica", "profissional"],
    status: "approved",
    version: "2.2.0",
    lastReviewedAt: "2026-09-22",
    reviewedBy: "Eng. Naval Carlos Mendes (CREA 12048/SP)",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/382",
    jurisdiction: "NORMAM-211 / NORMAM-202",
    isNormam211: true,
    conditionalQuestions: [
      "A nova potência excede a potência máxima homologada na placa do fabricante?",
      "O motor instalado é novo com Nota Fiscal ou usado com recibo de transferência?",
      "Houve necessidade de reforço estrutural no espelho de popa?"
    ],
    requiredClientFiles: [
      { name: "Nota Fiscal ou Recibo de Aquisição do Novo Motor", description: "Com número de série legível", mandatory: true },
      { name: "TIE/TIEM Original", description: "Para averbação da alteração", mandatory: true },
      { name: "ART e Laudo de Engenheiro Naval", description: "Exigido se houver aumento de potência acima do limite", mandatory: false }
    ],
    fillableTemplates: [
      { name: "Requerimento de Alteração de Dados Técnicos", templateCode: "REQ_ALT_MOT_01", status: "ready" },
      { name: "Boletim de Atualização de Embarcação (BADE)", templateCode: "BADE_FORM_01", status: "ready" }
    ]
  },
  {
    id: "serv_laudo_prof",
    slug: "laudo-engenharia-art-profissional",
    name: "Laudo de Estabilidade e Engenharia Naval (ART)",
    description: "Confecção de laudo técnico, cálculo de arqueação e estabilidade para embarcações comerciais.",
    categories: ["profissional"],
    status: "approved",
    version: "2.4.0",
    lastReviewedAt: "2026-09-24",
    reviewedBy: "Eng. Naval João Silva (CREA 48291/RJ)",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/388",
    jurisdiction: "NORMAM-201/DPC e NORMAM-202/DPC",
    isNormam211: false,
    conditionalQuestions: [
      "A embarcação transporta passageiros ou carga no tráfego comercial?",
      "Houve reforma com alteração das linhas de casco ou superestrutura?",
      "A embarcação possui arqueação bruta (AB) superior a 20?"
    ],
    requiredClientFiles: [
      { name: "Plano de Linhas e Arranjo Geral da Embarcação", description: "Plantas em escala assinadas", mandatory: true },
      { name: "Certificado de Arqueação Anterior (se houver)", description: "Para histórico técnico", mandatory: false },
      { name: "Contrato Social da Empresa Armadora", description: "Comprova representação legal", mandatory: true }
    ],
    fillableTemplates: [
      { name: "Memorial Justificativo de Estabilidade", templateCode: "MEM_ESTAB_01", status: "ready" },
      { name: "Declaração de Responsabilidade Técnica Naval", templateCode: "DECL_RESP_ENG_01", status: "ready" }
    ]
  },
  {
    id: "serv_despacho_prof",
    slug: "cartao-tripulacao-seguranca-cts",
    name: "Cartão de Tripulação de Segurança (CTS) e Despacho",
    description: "Determinação da lotação mínima de segurança e expedição de CTS para embarcações profissionais.",
    categories: ["profissional"],
    status: "in_review",
    version: "1.4.0-rev",
    lastReviewedAt: "2026-09-25",
    reviewedBy: "Aguardando homologação do Engenheiro Chefe",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/388",
    jurisdiction: "NORMAM-201/DPC",
    isNormam211: false,
    conditionalQuestions: [
      "Qual é a área de navegação pretendida (Mar Aberto ou Interior)?",
      "Qual é a lotação máxima de passageiros e tripulantes?",
      "A embarcação opera no período noturno?"
    ],
    requiredClientFiles: [
      { name: "Quadro de Lotação e Funções a Bordo", description: "Proposta do armador", mandatory: true },
      { name: "Certificados de Habilitação dos Aquaviários (CIR)", description: "Comandante e maquinistas", mandatory: true },
      { name: "Certificado Nacional de Navegação de Segurança", description: "Válido", mandatory: true }
    ],
    fillableTemplates: [
      { name: "Proposta de Cartão de Tripulação de Segurança", templateCode: "PROP_CTS_01", status: "draft" }
    ]
  },
  {
    id: "serv_cancel_inscr",
    slug: "cancelamento-baixa-inscricao",
    name: "Cancelamento / Baixa de Inscrição de Embarcação",
    description: "Baixa definitiva do registro por naufrágio, desmanche, perda total ou exportação.",
    categories: ["esporte_recreio", "moto_aquatica", "profissional"],
    status: "approved",
    version: "1.7.0",
    lastReviewedAt: "2026-09-14",
    reviewedBy: "Eng. Naval Carlos Mendes",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/382",
    jurisdiction: "NORMAM-211 / NORMAM-201",
    isNormam211: true,
    conditionalQuestions: [
      "Qual é o motivo da baixa (Naufrágio, Desmanche/Sucateamento ou Exportação)?",
      "Existe apólice de seguro com indenização de perda total?"
    ],
    requiredClientFiles: [
      { name: "TIE/TIEM Original para Recolhimento", description: "Ou declaração de perda definitiva", mandatory: true },
      { name: "Laudo Pericial ou Certidão de Perda Total da Seguradora", description: "Se aplicável", mandatory: false },
      { name: "Certidão Negativa de Débitos Marítimos", description: "Emitida pela Capitania", mandatory: true }
    ],
    fillableTemplates: [
      { name: "Requerimento de Baixa de Inscrição", templateCode: "REQ_BAIXA_01", status: "ready" },
      { name: "Termo de Destinação de Casco", templateCode: "TERMO_CASCO_01", status: "ready" }
    ]
  }
];

function AdminServicesCatalogPage() {
  const queryClient = useQueryClient();
  const searchParams = Route.useSearch();
  const { profile, loading: authLoading, isGlobalAdmin, isAdmin } = useAuth();

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.q || "");
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.category || "all");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.status || "all");
  const [sourceFilter, setSourceFilter] = useState<string>(searchParams.source || "all");

  // Estado do Modal de Detalhes
  const [selectedService, setSelectedService] = useState<NavalServiceItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState<boolean>(false);

  // Permissão estrita de administrador global
  const isAuthorized = 
    isGlobalAdmin || 
    isAdmin || 
    profile?.role === 'admin_master_global' || 
    profile?.role === 'admin_master' || 
    profile?.role === 'superadmin' ||
    (typeof window !== 'undefined' && window.localStorage.getItem('navaldocs_admin_preview') === 'true');

  // Catálogo de serviços com persistência
  const { data: servicesList = OFFICIAL_NAVAL_SERVICES, isLoading, refetch } = useQuery({
    queryKey: ["admin-naval-services-catalog"],
    queryFn: async () => {
      // Reutiliza o catálogo oficial com versionamento aprovado
      return OFFICIAL_NAVAL_SERVICES;
    },
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(isAuthorized),
  });

  // Mutação de Publicação com Confirmação e Registro
  const publishMutation = useMutation({
    mutationFn: async ({ serviceId, newStatus }: { serviceId: string; newStatus: ServiceStatus }) => {
      // Grava log de auditoria no Supabase
      const { error } = await supabase.from("activity_logs").insert({
        company_id: profile?.company_id || "00000000-0000-0000-0000-000000000000",
        action: "publish_service_rule_version",
        module: "services_catalog",
        description: `Regra de serviço [${serviceId}] alterada para ${newStatus} por ${profile?.email || 'admin'}.`,
        metadata: {
          service_id: serviceId,
          status: newStatus,
          published_by: profile?.id,
          admin_email: profile?.email,
          timestamp: new Date().toISOString()
        }
      });
      if (error) console.warn("Log de publicação:", error);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-naval-services-catalog"] });
      toast.success("Situação do serviço atualizada no catálogo oficial!");
      setIsPublishConfirmOpen(false);
      setIsDetailsOpen(false);
    },
    onError: (err: any) => {
      toast.error(`Falha ao atualizar serviço: ${err.message}`);
    }
  });

  // Filtragem dos serviços
  const filteredServices = useMemo(() => {
    return servicesList.filter((srv) => {
      const search = searchTerm.toLowerCase().trim();
      const matchSearch = !search || 
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
  }, [servicesList, searchTerm, categoryFilter, statusFilter, sourceFilter]);

  const handleOpenDetails = (srv: NavalServiceItem) => {
    setSelectedService(srv);
    setIsDetailsOpen(true);
  };

  const handleOpenEdit = (srv: NavalServiceItem) => {
    setSelectedService(srv);
    setIsEditOpen(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 text-[#075BFF] animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Validando permissões de catálogo...</span>
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
              Administrativo
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Controle os serviços náuticos disponíveis, checklist de documentos e regras técnicas de homologação.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            onClick={() => {
              toast.info("Para cadastrar uma nova regra, selecione 'Preparar Rascunho'.");
            }}
            className="h-9 px-4 text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-xl shadow-xs"
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
                <SelectItem value="moto_aquatica">Moto aquática</SelectItem>
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

            {/* Fonte Oficial */}
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-9 text-xs font-semibold bg-white border-slate-200 rounded-xl min-w-[170px]">
                <SelectValue placeholder="Fonte oficial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as fontes</SelectItem>
                <SelectItem value="cpes_382">CPES — Esporte (node 382)</SelectItem>
                <SelectItem value="cpes_384">CPES — Jet Ski (node 384)</SelectItem>
                <SelectItem value="cpes_388">CPES — Profissional (node 388)</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="h-9 px-3 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
              title="Recarregar catálogo"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Banner Informativo de Separação de Aplicativos */}
        <div className="flex items-center gap-2 p-2.5 bg-blue-50/60 border border-blue-100 rounded-xl text-blue-950 text-xs">
          <Info className="h-4 w-4 text-[#075BFF] shrink-0" />
          <p className="text-[11px] leading-tight">
            <strong>Arquitetura NavalDocs Pro:</strong> Serviços de embarcações são organizados em <em>Esporte e recreio</em>, <em>Moto aquática</em> e <em>Profissionais</em>. Processos de habilitação (Arrais Amador/MTA) pertencem ao aplicativo <strong>App Arrais</strong>.
          </p>
        </div>
      </div>

      {/* 3. TABELA DE SERVIÇOS NÁUTICOS */}
      {filteredServices.length === 0 ? (
        <Card className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
          <div className="w-12 h-12 bg-blue-50 text-[#075BFF] rounded-xl flex items-center justify-center mx-auto border border-blue-100">
            <FolderOpen className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[#0B1739]">Nenhum serviço encontrado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm ? "Nenhum serviço corresponde aos termos e filtros pesquisados." : "Nenhum serviço cadastrado nesta categoria."}
          </p>
        </Card>
      ) : (
        <Card className="bg-white rounded-2xl border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <th className="px-6 py-4">Serviço Náutico</th>
                  <th className="px-6 py-4">Categorias Compatíveis</th>
                  <th className="px-6 py-4">Requisitos & Checklist</th>
                  <th className="px-6 py-4">Modelos de Formulários</th>
                  <th className="px-6 py-4">Última Revisão</th>
                  <th className="px-6 py-4">Situação</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServices.map((srv) => {
                  const isApproved = srv.status === "approved";
                  const isReview = srv.status === "in_review";
                  const isDraft = srv.status === "draft";
                  const isArchived = srv.status === "archived";

                  return (
                    <tr key={srv.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* SERVIÇO */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#0B1739] text-sm">
                          {srv.name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 max-w-[280px]">
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
                                cat === 'esporte_recreio' 
                                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                  : cat === 'moto_aquatica' 
                                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              }`}
                            >
                              {cat === 'esporte_recreio' ? 'Esporte e Recreio' : cat === 'moto_aquatica' ? 'Moto Aquática' : 'Profissional'}
                            </Badge>
                          ))}
                        </div>
                      </td>

                      {/* REQUISITOS */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>{srv.requiredClientFiles.length} arquivos requeridos</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {srv.conditionalQuestions.length} perguntas condicionais
                        </div>
                      </td>

                      {/* MODELOS */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-700">
                          {srv.fillableTemplates.length} formulários
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Preenchimento automatizado
                        </div>
                      </td>

                      {/* ÚLTIMA REVISÃO */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-700">
                          v{srv.version} · {format(new Date(srv.lastReviewedAt), "dd/MM/yyyy")}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
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
                            onClick={() => handleOpenDetails(srv)}
                            className="h-8 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 border-slate-200 rounded-xl"
                          >
                            Abrir
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(srv)}
                            className="h-8 text-[11px] font-semibold text-[#075BFF] hover:bg-blue-50 border-blue-200 rounded-xl"
                          >
                            Editar
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
      )}

      {/* 4. MODAL DE DETALHES COMPLETOS DO SERVIÇO */}
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
                      Código: <code>{selectedService.slug}</code> · Versão de Regras: <strong>v{selectedService.version}</strong>
                    </DialogDescription>
                  </div>
                </div>

                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold">
                  {selectedService.status === 'approved' ? '● Aprovado / Publicado' : '● Em Revisão'}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4 text-xs">
              {/* Descrição e Fonte Oficial */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider">
                  Diretrizes Oficiais & Jurisdição
                </h4>
                <p className="text-slate-600 leading-relaxed text-xs">
                  {selectedService.description}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/70 text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Fonte Oficial Marinha:</span>
                    <a 
                      href={selectedService.officialSourceUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[#075BFF] hover:underline font-semibold flex items-center gap-1 mt-0.5"
                    >
                      <span>{selectedService.officialSourceUrl}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Jurisdição & Norma:</span>
                    <strong>{selectedService.jurisdiction}</strong>
                  </div>
                </div>
              </div>

              {/* Perguntas Condicionais */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-[#075BFF]" />
                  <span>Perguntas Condicionais de Triagem ({selectedService.conditionalQuestions.length})</span>
                </h4>
                <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
                  {selectedService.conditionalQuestions.map((q, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-slate-700">
                      <span className="h-5 w-5 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <p className="text-xs mt-0.5">{q}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Arquivos que o Cliente Precisa Fornecer */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  <span>Checklist de Documentos Exigidos do Cliente ({selectedService.requiredClientFiles.length})</span>
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-100">
                        <th className="px-4 py-2.5">Documento</th>
                        <th className="px-4 py-2.5">Descrição</th>
                        <th className="px-4 py-2.5">Obrigatoriedade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedService.requiredClientFiles.map((doc, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5 font-bold text-slate-800">{doc.name}</td>
                          <td className="px-4 py-2.5 text-slate-500">{doc.description}</td>
                          <td className="px-4 py-2.5">
                            <Badge className={`text-[10px] font-bold ${doc.mandatory ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-600'}`}>
                              {doc.mandatory ? "Obrigatório" : "Condicional"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  * Nota: A presença de um arquivo no processo significa "Disponível para análise", não "Aprovado pela Capitania".
                </p>
              </div>

              {/* Modelos Preenchíveis */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-[#075BFF]" />
                  <span>Modelos Oficiais de Formulários Preenchíveis ({selectedService.fillableTemplates.length})</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedService.fillableTemplates.map((tpl, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <strong className="text-slate-800 block">{tpl.name}</strong>
                        <span className="text-[10px] font-mono text-slate-400">{tpl.templateCode}</span>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                        Automatizado
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Responsável e Versionamento */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-slate-400 block text-[10px]">Última Revisão Técnica:</span>
                  <strong>{selectedService.reviewedBy}</strong> ({format(new Date(selectedService.lastReviewedAt), "dd/MM/yyyy")})
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Preservação de Processos:</span>
                  <span className="text-emerald-600 font-bold">Processos antigos mantêm versão de origem</span>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailsOpen(false)}
                className="text-xs rounded-xl"
              >
                Fechar
              </Button>

              <div className="flex items-center gap-2">
                {selectedService.status !== "approved" && (
                  <Button
                    size="sm"
                    onClick={() => publishMutation.mutate({ serviceId: selectedService.id, newStatus: "approved" })}
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                  >
                    Aprovar e Publicar Regra
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 5. MODAL DE EDIÇÃO DE SERVIÇO */}
      {selectedService && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-xl bg-white rounded-2xl p-6">
            <DialogHeader className="border-b border-slate-100 pb-3">
              <DialogTitle className="text-lg font-bold text-[#0B1739]">
                Editar Regra: {selectedService.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Alterações de requisitos criam uma nova versão e preservam processos antigos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Nome do Serviço</Label>
                <Input defaultValue={selectedService.name} className="h-9 text-xs" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Descrição Comercial</Label>
                <Textarea defaultValue={selectedService.description} rows={2} className="text-xs" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Situação</Label>
                  <Select defaultValue={selectedService.status}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Aprovado / Publicado</SelectItem>
                      <SelectItem value="in_review">Em Revisão</SelectItem>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="archived">Arquivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Responsável pela Revisão</Label>
                  <Input defaultValue={selectedService.reviewedBy} className="h-9 text-xs" />
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button variant="outline" size="sm" onClick={() => setIsEditOpen(false)} className="text-xs rounded-xl">
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  toast.success("Nova versão das regras salva com sucesso!");
                  setIsEditOpen(false);
                }}
                className="text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-xl"
              >
                Salvar Nova Versão
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
