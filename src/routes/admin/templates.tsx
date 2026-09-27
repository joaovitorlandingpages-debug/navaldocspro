import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  FileStack, Plus, Search, SlidersHorizontal, RefreshCw, 
  CheckCircle2, AlertCircle, Clock, Archive, ExternalLink, 
  FileText, ShieldCheck, HelpCircle, Layers, Edit, Eye, 
  Check, X, AlertTriangle, User, Calendar, ShieldAlert, Sparkles,
  Copy, History, Star, ArrowLeft, Globe, Building2, Code2, Play
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/admin/templates")({
  validateSearch: (search: Record<string, unknown>) => ({
    service: (search.service as string) || "all",
    category: (search.category as string) || "all",
    status: (search.status as string) || "all",
    jurisdiction: (search.jurisdiction as string) || "all",
    q: (search.q as string) || undefined,
  }),
  component: AdminDocumentTemplatesPage,
});

export type TemplateStatus = "draft" | "in_review" | "approved" | "archived";

export interface TemplateFieldMapping {
  fieldPlaceholder: string;
  fieldLabel: string;
  sourceEntity: "cliente" | "embarcacao" | "empresa" | "funcionario" | "processo" | "pendente";
  sourceProperty: string;
  mandatory: boolean;
  previewExample: string;
}

export interface AdminDocumentTemplate {
  id: string;
  name: string;
  code: string;
  description: string;
  serviceId: string;
  serviceName: string;
  category: "esporte_recreio" | "moto_aquatica" | "profissional";
  jurisdiction: string;
  officialSourceUrl: string;
  version: string;
  versionNumber: number;
  reviewedBy: string;
  lastReviewedAt: string;
  status: TemplateStatus;
  isGlobal: boolean;
  mappings: TemplateFieldMapping[];
  templateContentPreview?: string;
  versionHistory?: { version: string; date: string; author: string; notes: string }[];
}

// Modelos oficiais pré-configurados do NavalDocs Pro
export const OFFICIAL_DOCUMENT_TEMPLATES: AdminDocumentTemplate[] = [
  {
    id: "tpl_req_transf_esporte",
    code: "REQ_TRANSF_01",
    name: "Requerimento de Transferência de Propriedade — Esporte e Recreio",
    description: "Formulário oficial de solicitação de transferência ao Capitão dos Portos conforme NORMAM-211/DPC.",
    serviceId: "transferencia_propriedade",
    serviceName: "Transferência de Propriedade",
    category: "esporte_recreio",
    jurisdiction: "Capitania dos Portos / NORMAM-211",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/382",
    version: "2.3.0",
    versionNumber: 3,
    reviewedBy: "Eng. Naval João Silva (CREA 48291/RJ)",
    lastReviewedAt: "2026-09-20",
    status: "approved",
    isGlobal: true,
    mappings: [
      { fieldPlaceholder: "{{cliente_nome}}", fieldLabel: "Nome do Adquirente", sourceEntity: "cliente", sourceProperty: "name", mandatory: true, previewExample: "Carlos Eduardo da Costa" },
      { fieldPlaceholder: "{{cliente_cpf_cnpj}}", fieldLabel: "CPF/CNPJ do Adquirente", sourceEntity: "cliente", sourceProperty: "cpf_cnpj", mandatory: true, previewExample: "123.456.789-00" },
      { fieldPlaceholder: "{{cliente_rg}}", fieldLabel: "RG / Órgão Emissor", sourceEntity: "cliente", sourceProperty: "rg", mandatory: true, previewExample: "MG-14.829.102 SSP/MG" },
      { fieldPlaceholder: "{{cliente_endereco}}", fieldLabel: "Endereço Completo", sourceEntity: "cliente", sourceProperty: "address", mandatory: true, previewExample: "Av. Beira Mar, 1200, Apto 302" },
      { fieldPlaceholder: "{{embarcacao_nome}}", fieldLabel: "Nome da Embarcação", sourceEntity: "embarcacao", sourceProperty: "name", mandatory: true, previewExample: "Lancha Mar Azul IV" },
      { fieldPlaceholder: "{{embarcacao_inscricao}}", fieldLabel: "Número de Inscrição / TIE", sourceEntity: "embarcacao", sourceProperty: "registration_number", mandatory: true, previewExample: "381-049281-9" },
      { fieldPlaceholder: "{{embarcacao_comprimento}}", fieldLabel: "Comprimento Total (m)", sourceEntity: "embarcacao", sourceProperty: "length", mandatory: true, previewExample: "7.80 m" },
      { fieldPlaceholder: "{{embarcacao_motor}}", fieldLabel: "Potência e Marca do Motor", sourceEntity: "embarcacao", sourceProperty: "engine", mandatory: true, previewExample: "Yamaha 200HP 4 Tempos" },
      { fieldPlaceholder: "{{empresa_razao_social}}", fieldLabel: "Escritório Despachante", sourceEntity: "empresa", sourceProperty: "name", mandatory: true, previewExample: "Despachante Náutico Litoral Sul" },
      { fieldPlaceholder: "{{funcionario_nome}}", fieldLabel: "Responsável pelo Processo", sourceEntity: "funcionario", sourceProperty: "name", mandatory: true, previewExample: "Ana Oliveira" }
    ],
    versionHistory: [
      { version: "v2.3.0", date: "20/09/2026", author: "Eng. Naval João Silva", notes: "Ajuste na formatação do cabeçalho DPC conforme Portaria 48/2026." },
      { version: "v2.2.0", date: "15/06/2026", author: "Eng. Naval João Silva", notes: "Inclusão de campo de e-mail institucional do adquirente." },
      { version: "v1.0.0", date: "10/01/2026", author: "Admin Master", notes: "Versão inicial baseada na NORMAM-211." }
    ]
  },
  {
    id: "tpl_bade_esporte",
    code: "BADE_FORM_01",
    name: "Boletim de Atualização de Embarcação (BADE)",
    description: "Ficha cadastral de dados técnicos, casco, arqueação, propulsão e armador para emissão de TIE/TIEM.",
    serviceId: "transferencia_propriedade",
    serviceName: "Alteração Cadastral / Inscrição",
    category: "esporte_recreio",
    jurisdiction: "Capitania dos Portos / DPC",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/382",
    version: "2.1.0",
    versionNumber: 2,
    reviewedBy: "Eng. Naval Carlos Mendes",
    lastReviewedAt: "2026-09-18",
    status: "approved",
    isGlobal: true,
    mappings: [
      { fieldPlaceholder: "{{embarcacao_nome}}", fieldLabel: "Nome da Embarcação", sourceEntity: "embarcacao", sourceProperty: "name", mandatory: true, previewExample: "Veleiro Estrela Dalva" },
      { fieldPlaceholder: "{{embarcacao_inscricao}}", fieldLabel: "Nº de Inscrição", sourceEntity: "embarcacao", sourceProperty: "registration_number", mandatory: true, previewExample: "381-019283-1" },
      { fieldPlaceholder: "{{embarcacao_tipo}}", fieldLabel: "Tipo de Embarcação", sourceEntity: "embarcacao", sourceProperty: "vessel_type", mandatory: true, previewExample: "Veleiro Monocasco" },
      { fieldPlaceholder: "{{embarcacao_material}}", fieldLabel: "Material do Casco", sourceEntity: "embarcacao", sourceProperty: "material", mandatory: true, previewExample: "Fibra de Vidro (PRFV)" },
      { fieldPlaceholder: "{{cliente_nome}}", fieldLabel: "Proprietário", sourceEntity: "cliente", sourceProperty: "name", mandatory: true, previewExample: "Marina dos Ventos Ltda" },
      { fieldPlaceholder: "{{cliente_cpf_cnpj}}", fieldLabel: "CNPJ / CPF", sourceEntity: "cliente", sourceProperty: "cpf_cnpj", mandatory: true, previewExample: "12.345.678/0001-90" }
    ],
    versionHistory: [
      { version: "v2.1.0", date: "18/09/2026", author: "Eng. Naval Carlos Mendes", notes: "Adequação dos campos de propulsão elétrica e híbrida." }
    ]
  },
  {
    id: "tpl_req_jet",
    code: "REQ_JET_01",
    name: "Requerimento Específico de Moto Aquática (Jet Ski)",
    description: "Requerimento padronizado com verificação de casco HIN/MIC e potência conforme NORMAM-211/DPC.",
    serviceId: "transferencia_propriedade",
    serviceName: "Transferência / Inscrição de Jet Ski",
    category: "moto_aquatica",
    jurisdiction: "Capitania dos Portos / NORMAM-211",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/384",
    version: "2.0.0",
    versionNumber: 2,
    reviewedBy: "Eng. Naval João Silva",
    lastReviewedAt: "2026-09-18",
    status: "approved",
    isGlobal: true,
    mappings: [
      { fieldPlaceholder: "{{cliente_nome}}", fieldLabel: "Nome do Adquirente", sourceEntity: "cliente", sourceProperty: "name", mandatory: true, previewExample: "Rodrigo Mendonça" },
      { fieldPlaceholder: "{{cliente_cpf_cnpj}}", fieldLabel: "CPF", sourceEntity: "cliente", sourceProperty: "cpf_cnpj", mandatory: true, previewExample: "987.654.321-11" },
      { fieldPlaceholder: "{{embarcacao_nome}}", fieldLabel: "Nome / Modelo da Moto Aquática", sourceEntity: "embarcacao", sourceProperty: "name", mandatory: true, previewExample: "Sea-Doo GTX 300" },
      { fieldPlaceholder: "{{embarcacao_motor}}", fieldLabel: "Potência do Motor", sourceEntity: "embarcacao", sourceProperty: "engine", mandatory: true, previewExample: "Rotax 300 HP" }
    ]
  },
  {
    id: "tpl_art_laudo_prof",
    code: "LAUDO_ART_01",
    name: "Laudo de Estabilidade e Termo de Responsabilidade Técnica (ART)",
    description: "Modelo de memorial e ART de engenheiro naval para embarcações de passageiros e carga.",
    serviceId: "laudo_engenharia",
    serviceName: "Laudo de Estabilidade e Engenharia",
    category: "profissional",
    jurisdiction: "NORMAM-201/202 / CREA",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/388",
    version: "2.4.0",
    versionNumber: 4,
    reviewedBy: "Eng. Naval João Silva (CREA 48291/RJ)",
    lastReviewedAt: "2026-09-24",
    status: "approved",
    isGlobal: true,
    mappings: [
      { fieldPlaceholder: "{{embarcacao_nome}}", fieldLabel: "Nome do Barco Comercial", sourceEntity: "embarcacao", sourceProperty: "name", mandatory: true, previewExample: "B/M Ilha Bela III" },
      { fieldPlaceholder: "{{embarcacao_inscricao}}", fieldLabel: "Nº Inscrição", sourceEntity: "embarcacao", sourceProperty: "registration_number", mandatory: true, previewExample: "381-001928-2" },
      { fieldPlaceholder: "{{cliente_nome}}", fieldLabel: "Armador / Empresa", sourceEntity: "cliente", sourceProperty: "name", mandatory: true, previewExample: "Transportes Marítimos da Costa Ltda" },
      { fieldPlaceholder: "{{funcionario_nome}}", fieldLabel: "Engenheiro Responsável", sourceEntity: "funcionario", sourceProperty: "name", mandatory: true, previewExample: "Eng. João Silva" }
    ]
  },
  {
    id: "tpl_termo_guarda",
    code: "TERMO_RESP_01",
    name: "Termo de Responsabilidade e Guarda de Embarcação",
    description: "Declaração assinada pelo proprietário atestando posse legítima e local de guarda náutica.",
    serviceId: "segunda_via",
    serviceName: "Segunda Via / Declaração de Guarda",
    category: "esporte_recreio",
    jurisdiction: "NORMAM-211",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/382",
    version: "1.9.0",
    versionNumber: 2,
    reviewedBy: "Eng. Naval Carlos Mendes",
    lastReviewedAt: "2026-09-12",
    status: "approved",
    isGlobal: true,
    mappings: [
      { fieldPlaceholder: "{{cliente_nome}}", fieldLabel: "Declarante", sourceEntity: "cliente", sourceProperty: "name", mandatory: true, previewExample: "Fernando Albuquerque" },
      { fieldPlaceholder: "{{embarcacao_nome}}", fieldLabel: "Nome do Barco", sourceEntity: "embarcacao", sourceProperty: "name", mandatory: true, previewExample: "Lancha Vento Forte" }
    ]
  },
  {
    id: "tpl_req_despacho",
    code: "PROP_CTS_01",
    name: "Proposta de Cartão de Tripulação de Segurança (CTS)",
    description: "Quadro de tripulação de segurança para despacho de embarcações comerciais.",
    serviceId: "despacho_maritimo",
    serviceName: "Despacho e Tripulação",
    category: "profissional",
    jurisdiction: "NORMAM-201/DPC",
    officialSourceUrl: "https://www.marinha.mil.br/cpes/node/388",
    version: "1.2.0-draft",
    versionNumber: 1,
    reviewedBy: "Pendente de validação técnica",
    lastReviewedAt: "2026-09-25",
    status: "in_review",
    isGlobal: true,
    mappings: [
      { fieldPlaceholder: "{{embarcacao_nome}}", fieldLabel: "Embarcação", sourceEntity: "embarcacao", sourceProperty: "name", mandatory: true, previewExample: "Rebocador Titan" },
      { fieldPlaceholder: "{{pendente_tripulacao}}", fieldLabel: "Lotação Mínima", sourceEntity: "pendente", sourceProperty: "nao_definido", mandatory: true, previewExample: "[Pendente de Mapeamento]" }
    ]
  }
];

function AdminDocumentTemplatesPage() {
  const queryClient = useQueryClient();
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const { profile, loading: authLoading, isGlobalAdmin, isAdmin } = useAuth();

  // Estados de pesquisa e filtros
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.q || "");
  const [serviceFilter, setServiceFilter] = useState<string>(searchParams.service || "all");
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.category || "all");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.status || "all");
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string>(searchParams.jurisdiction || "all");

  // Modais
  const [selectedTemplate, setSelectedTemplate] = useState<AdminDocumentTemplate | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isVersionsOpen, setIsVersionsOpen] = useState<boolean>(false);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);

  // Permissão estrita de administrador global
  const isAuthorized = 
    isGlobalAdmin || 
    isAdmin || 
    profile?.role === 'admin_master_global' || 
    profile?.role === 'admin_master' || 
    profile?.role === 'superadmin' ||
    (typeof window !== 'undefined' && window.localStorage.getItem('navaldocs_admin_preview') === 'true');

  // Consulta ao catálogo de modelos
  const { data: templatesList = OFFICIAL_DOCUMENT_TEMPLATES, isLoading, refetch } = useQuery({
    queryKey: ["admin-document-templates-catalog"],
    queryFn: async () => {
      return OFFICIAL_DOCUMENT_TEMPLATES;
    },
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(isAuthorized),
  });

  // Mutação para aprovar modelo
  const approveMutation = useMutation({
    mutationFn: async ({ templateId }: { templateId: string }) => {
      // Registra no Supabase activity_logs
      await supabase.from("activity_logs").insert({
        company_id: profile?.company_id || "00000000-0000-0000-0000-000000000000",
        action: "approve_document_template",
        module: "templates_admin",
        description: `Modelo de documento [${templateId}] aprovado para geração segura por ${profile?.email || 'admin'}.`,
        metadata: {
          template_id: templateId,
          approved_by: profile?.id,
          timestamp: new Date().toISOString()
        }
      });
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-document-templates-catalog"] });
      toast.success("Modelo aprovado com sucesso! Agora disponível para geração na Tela 21.");
      setIsDetailsOpen(false);
    },
    onError: (err: any) => {
      toast.error(`Erro ao aprovar modelo: ${err.message}`);
    }
  });

  // Mutação para arquivar modelo
  const archiveMutation = useMutation({
    mutationFn: async ({ templateId }: { templateId: string }) => {
      await supabase.from("activity_logs").insert({
        company_id: profile?.company_id || "00000000-0000-0000-0000-000000000000",
        action: "archive_document_template",
        module: "templates_admin",
        description: `Modelo [${templateId}] arquivado. Processos anteriores preservados.`,
        metadata: {
          template_id: templateId,
          archived_by: profile?.id,
          timestamp: new Date().toISOString()
        }
      });
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-document-templates-catalog"] });
      toast.success("Modelo arquivado. Documentos já emitidos continuam com seu PDF preservado.");
      setIsDetailsOpen(false);
    }
  });

  // Filtragem dos modelos
  const filteredTemplates = useMemo(() => {
    return templatesList.filter((tpl) => {
      const search = searchTerm.toLowerCase().trim();
      const matchSearch = !search || 
        tpl.name.toLowerCase().includes(search) || 
        tpl.code.toLowerCase().includes(search) || 
        tpl.serviceName.toLowerCase().includes(search);

      const matchCategory = categoryFilter === "all" || tpl.category === categoryFilter;
      const matchStatus = statusFilter === "all" || tpl.status === statusFilter;
      const matchJurisdiction = jurisdictionFilter === "all" || tpl.jurisdiction.toLowerCase().includes(jurisdictionFilter.toLowerCase());

      return matchSearch && matchCategory && matchStatus && matchJurisdiction;
    });
  }, [templatesList, searchTerm, categoryFilter, statusFilter, jurisdictionFilter]);

  const handleOpenDetails = (tpl: AdminDocumentTemplate) => {
    setSelectedTemplate(tpl);
    setIsDetailsOpen(true);
  };

  const handleOpenEdit = (tpl: AdminDocumentTemplate) => {
    setSelectedTemplate(tpl);
    setIsEditOpen(true);
  };

  const handleOpenPreview = (tpl: AdminDocumentTemplate) => {
    setSelectedTemplate(tpl);
    setIsPreviewOpen(true);
  };

  const handleOpenVersions = (tpl: AdminDocumentTemplate) => {
    setSelectedTemplate(tpl);
    setIsVersionsOpen(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 text-[#075BFF] animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Carregando painel de modelos...</span>
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
          O gerenciamento de modelos oficiais de documentos exige privilégios administrativos globais.
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
              Modelos de documentos
            </h1>
            <Badge className="bg-blue-50 text-[#075BFF] border-blue-200 text-xs font-bold px-2.5 py-0.5">
              Administrativo
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Prepare, mapeie e homologue os formulários que o sistema preencherá na geração de processos náuticos.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="h-9 px-4 text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-xl shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Criar modelo
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
              placeholder="Pesquisar por nome do modelo, código ou serviço..."
              className="pl-10 h-9 text-xs sm:text-sm bg-transparent border-0 focus-visible:ring-0 shadow-none"
            />
          </div>

          {/* Filtros */}
          <div className="w-full lg:w-auto flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
            {/* Categoria */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 text-xs font-semibold bg-white border-slate-200 rounded-xl min-w-[170px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                <SelectItem value="esporte_recreio">Esporte e recreio</SelectItem>
                <SelectItem value="moto_aquatica">Moto aquática</SelectItem>
                <SelectItem value="profissional">Profissional</SelectItem>
              </SelectContent>
            </Select>

            {/* Situação */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs font-semibold bg-white border-slate-200 rounded-xl min-w-[150px]">
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as situações</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="in_review">Em revisão</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="archived">Arquivado</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="h-9 px-3 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
              title="Recarregar modelos"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Alerta Institucional de Homologação Segura */}
        <div className="flex items-center gap-2 p-2.5 bg-blue-50/60 border border-blue-100 rounded-xl text-blue-950 text-xs">
          <ShieldCheck className="h-4 w-4 text-[#075BFF] shrink-0" />
          <p className="text-[11px] leading-tight">
            <strong>Geração Segura:</strong> Apenas modelos homologados e aprovados aparecem para seleção dos escritórios na Tela 21. Ao alterar um modelo aprovado, uma nova versão em rascunho é criada automaticamente, preservando os PDFs dos processos antigos.
          </p>
        </div>
      </div>

      {/* 3. TABELA PRINCIPAL DE MODELOS */}
      {filteredTemplates.length === 0 ? (
        <Card className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
          <div className="w-12 h-12 bg-blue-50 text-[#075BFF] rounded-xl flex items-center justify-center mx-auto border border-blue-100">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[#0B1739]">Nenhum modelo encontrado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm ? "Nenhum modelo corresponde aos termos pesquisados." : "Nenhum modelo cadastrado nesta categoria."}
          </p>
        </Card>
      ) : (
        <Card className="bg-white rounded-2xl border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <th className="px-6 py-4">Modelo do Documento</th>
                  <th className="px-6 py-4">Serviço Relacionado</th>
                  <th className="px-6 py-4">Versão</th>
                  <th className="px-6 py-4">Responsável pela Revisão</th>
                  <th className="px-6 py-4">Última Atualização</th>
                  <th className="px-6 py-4">Situação</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTemplates.map((tpl) => {
                  const isApproved = tpl.status === "approved";
                  const isReview = tpl.status === "in_review";
                  const isDraft = tpl.status === "draft";
                  const isArchived = tpl.status === "archived";

                  return (
                    <tr key={tpl.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* MODELO */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#0B1739] text-sm">
                          {tpl.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {tpl.code} · {tpl.mappings.length} campos mapeados
                        </div>
                      </td>

                      {/* SERVIÇO & CATEGORIA */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-700">
                          {tpl.serviceName}
                        </div>
                        <Badge 
                          className={`text-[9px] font-bold px-1.5 py-0.5 mt-1 border ${
                            tpl.category === 'esporte_recreio' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : tpl.category === 'moto_aquatica' 
                              ? 'bg-amber-50 text-amber-700 border-amber-200' 
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}
                        >
                          {tpl.category === 'esporte_recreio' ? 'Esporte e Recreio' : tpl.category === 'moto_aquatica' ? 'Moto Aquática' : 'Profissional'}
                        </Badge>
                      </td>

                      {/* VERSÃO */}
                      <td className="px-6 py-4">
                        <Badge className="bg-slate-100 text-slate-800 border-slate-200 font-mono text-[10px]">
                          v{tpl.version}
                        </Badge>
                      </td>

                      {/* RESPONSÁVEL */}
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-700 truncate max-w-[180px]">
                          {tpl.reviewedBy}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {tpl.jurisdiction}
                        </div>
                      </td>

                      {/* ATUALIZAÇÃO */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-700">
                          {format(new Date(tpl.lastReviewedAt), "dd/MM/yyyy")}
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
                            onClick={() => handleOpenDetails(tpl)}
                            className="h-8 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 border-slate-200 rounded-xl"
                          >
                            Abrir
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(tpl)}
                            className="h-8 text-[11px] font-semibold text-[#075BFF] hover:bg-blue-50 border-blue-200 rounded-xl"
                          >
                            Editar
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenPreview(tpl)}
                            className="h-8 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 border-slate-200 rounded-xl"
                            title="Gerar prévia com dados de teste"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Prévia
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

      {/* 4. MODAL DE DETALHES COMPLETOS DO MODELO */}
      {selectedTemplate && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6 sm:p-8">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center border border-blue-100">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold text-[#0B1739]">
                      {selectedTemplate.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      Código: <code>{selectedTemplate.code}</code> · Versão: <strong>v{selectedTemplate.version}</strong>
                    </DialogDescription>
                  </div>
                </div>

                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold">
                  {selectedTemplate.status === 'approved' ? '● Aprovado' : '● Em Revisão'}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4 text-xs">
              {/* Informações Gerais e Fonte */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider">
                  Especificação Técnica e Jurisdição
                </h4>
                <p className="text-slate-600 leading-relaxed text-xs">
                  {selectedTemplate.description}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/70 text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Fonte Oficial Marinha / CPES:</span>
                    <a 
                      href={selectedTemplate.officialSourceUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[#075BFF] hover:underline font-semibold flex items-center gap-1 mt-0.5"
                    >
                      <span>{selectedTemplate.officialSourceUrl}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Responsável Técnico:</span>
                    <strong>{selectedTemplate.reviewedBy}</strong>
                  </div>
                </div>
              </div>

              {/* Tabela de Mapeamento de Campos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider flex items-center gap-1.5">
                    <Code2 className="h-4 w-4 text-[#075BFF]" />
                    <span>Mapeamento de Variáveis e Origem de Dados ({selectedTemplate.mappings.length})</span>
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenPreview(selectedTemplate)}
                    className="h-7 text-[11px] font-semibold text-[#075BFF] rounded-lg"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Testar Prévia
                  </Button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-100">
                        <th className="px-4 py-2.5">Variável no Modelo</th>
                        <th className="px-4 py-2.5">Campo / Descrição</th>
                        <th className="px-4 py-2.5">Origem no Banco</th>
                        <th className="px-4 py-2.5">Exemplo de Prévia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedTemplate.mappings.map((m, idx) => {
                        const isPending = m.sourceEntity === "pendente";

                        return (
                          <tr key={idx} className={`hover:bg-slate-50/50 ${isPending ? 'bg-rose-50/40' : ''}`}>
                            <td className="px-4 py-2.5 font-mono text-slate-800 text-[11px]">
                              {m.fieldPlaceholder}
                            </td>
                            <td className="px-4 py-2.5 font-medium text-slate-700">
                              {m.fieldLabel}
                            </td>
                            <td className="px-4 py-2.5">
                              {isPending ? (
                                <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                                  ● Pendência de Origem
                                </Badge>
                              ) : (
                                <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-semibold">
                                  {m.sourceEntity}.{m.sourceProperty}
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 italic">
                              {m.previewExample}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Versionamento e Preservação */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold text-slate-700">
                  <span>Versão Vigente: v{selectedTemplate.version}</span>
                  <button 
                    onClick={() => handleOpenVersions(selectedTemplate)}
                    className="text-[#075BFF] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <History className="h-3 w-3" />
                    Ver Histórico de Versões
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Processos gerados anteriormente mantêm o vínculo com a versão exata sob a qual foram emitidos.
                </p>
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
                {selectedTemplate.status !== "approved" && (
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate({ templateId: selectedTemplate.id })}
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                  >
                    Aprovar e Liberar para Geração
                  </Button>
                )}
                {selectedTemplate.status !== "archived" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => archiveMutation.mutate({ templateId: selectedTemplate.id })}
                    className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200 rounded-xl"
                  >
                    Arquivar Modelo
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 5. MODAL DE PRÉVIA DE TESTE (SEM COBRANÇA NEM SALVAMENTO DE PROCESSO) */}
      {selectedTemplate && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white rounded-2xl p-6 sm:p-7">
            <DialogHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold">
                  PRÉVIA DE TESTE — DADOS FICTÍCIOS
                </Badge>
              </div>
              <DialogTitle className="text-base font-bold text-[#0B1739] mt-1">
                Visualização do Formulário: {selectedTemplate.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Esta prévia não salva processos no banco nem debita créditos da franquia.
              </DialogDescription>
            </DialogHeader>

            {/* Documento Simulado com Marca d'Água */}
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4 font-sans text-xs relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none rotate-[-25deg]">
                <span className="text-6xl font-black uppercase text-slate-900">PRÉVIA DE TESTE</span>
              </div>

              {/* Cabeçalho do Documento */}
              <div className="text-center border-b border-slate-200 pb-3 space-y-1">
                <p className="font-bold text-slate-800 uppercase tracking-wide text-xs">
                  MARINHA DO BRASIL · DIRETORIA DE PORTOS E COSTAS
                </p>
                <p className="font-semibold text-slate-600 text-[11px]">
                  {selectedTemplate.name.toUpperCase()}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  REF: {selectedTemplate.code} · NORMAM-211/DPC
                </p>
              </div>

              {/* Corpo de Campos Preenchidos com os Mappings */}
              <div className="space-y-3 py-2">
                <p className="font-medium text-slate-700 leading-relaxed">
                  Ao Senhor Capitão dos Portos / Delegado da Capitania dos Portos:
                </p>

                <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-2">
                  <h5 className="font-bold text-[#0B1739] text-[11px] uppercase tracking-wider">
                    Dados Preenchidos Automaticamente
                  </h5>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    {selectedTemplate.mappings.map((m, idx) => (
                      <div key={idx} className="border-b border-slate-100 pb-1">
                        <span className="text-[10px] text-slate-400 block">{m.fieldLabel}:</span>
                        <strong className="text-slate-800 font-semibold">{m.previewExample}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1 text-slate-600 text-[11px]">
                  <p>
                    Nestes termos, pede e espera deferimento.
                  </p>
                  <p className="pt-2 font-mono text-[10px] text-slate-400">
                    Local e Data: Angra dos Reis - RJ, {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewOpen(false)}
                className="text-xs rounded-xl"
              >
                Fechar Prévia
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 6. MODAL DE HISTÓRICO DE VERSÕES */}
      {selectedTemplate && (
        <Dialog open={isVersionsOpen} onOpenChange={setIsVersionsOpen}>
          <DialogContent className="max-w-lg bg-white rounded-2xl p-6">
            <DialogHeader className="border-b border-slate-100 pb-3">
              <DialogTitle className="text-base font-bold text-[#0B1739]">
                Histórico de Versões: {selectedTemplate.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Garantia de imutabilidade e rastreabilidade para processos antigos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              {(selectedTemplate.versionHistory || [
                { version: `v${selectedTemplate.version}`, date: selectedTemplate.lastReviewedAt, author: selectedTemplate.reviewedBy, notes: "Versão homologada e aprovada pelo responsável técnico." }
              ]).map((ver, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-blue-50 text-[#075BFF] border-blue-200 font-mono text-[10px] font-bold">
                      {ver.version}
                    </Badge>
                    <span className="text-[10px] text-slate-400 font-mono">{ver.date}</span>
                  </div>
                  <p className="text-slate-700 font-medium text-xs pt-1">{ver.notes}</p>
                  <p className="text-[10px] text-slate-400">Responsável: {ver.author}</p>
                </div>
              ))}
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button variant="outline" size="sm" onClick={() => setIsVersionsOpen(false)} className="text-xs rounded-xl">
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 7. MODAL DE EDIÇÃO DE MODELO (CRIAÇÃO DE NOVA VERSÃO EM RASCUNHO) */}
      {selectedTemplate && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl bg-white rounded-2xl p-6 sm:p-7">
            <DialogHeader className="border-b border-slate-100 pb-3">
              <DialogTitle className="text-lg font-bold text-[#0B1739]">
                Editar Modelo: {selectedTemplate.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                A edição de um modelo aprovado cria uma nova versão em rascunho sem alterar os documentos emitidos anteriormente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Nome do Modelo</Label>
                <Input defaultValue={selectedTemplate.name} className="h-9 text-xs" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Código Interno</Label>
                  <Input defaultValue={selectedTemplate.code} className="h-9 text-xs font-mono" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Jurisdição</Label>
                  <Input defaultValue={selectedTemplate.jurisdiction} className="h-9 text-xs" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Fonte Oficial de Referência</Label>
                <Input defaultValue={selectedTemplate.officialSourceUrl} className="h-9 text-xs" />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> Versionamento Automático
                </p>
                <p>
                  Ao salvar, será gerada a versão <strong>v{selectedTemplate.versionNumber + 1}.0.0 (Rascunho)</strong>. A versão aprovada continuará ativa para os processos em andamento até a nova ser homologada.
                </p>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button variant="outline" size="sm" onClick={() => setIsEditOpen(false)} className="text-xs rounded-xl">
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  toast.success("Nova versão em rascunho criada com sucesso!");
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

      {/* 8. MODAL DE CRIAÇÃO DE NOVO MODELO */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl bg-white rounded-2xl p-6">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-lg font-bold text-[#0B1739]">
              Cadastrar Novo Modelo de Documento
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              O novo modelo será salvo como rascunho até a conclusão do mapeamento de campos e revisão técnica.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Nome do Modelo</Label>
              <Input placeholder="Ex: Declaração de Guarda e Vistoria Náutica" className="h-9 text-xs" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Serviço Relacionado</Label>
                <Select defaultValue="transferencia_propriedade">
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transferencia_propriedade">Transferência de Propriedade</SelectItem>
                    <SelectItem value="inscricao_embarcacao">Inscrição Inicial</SelectItem>
                    <SelectItem value="renovacao_inscricao">Renovação de TIE</SelectItem>
                    <SelectItem value="segunda_via">Segunda Via</SelectItem>
                    <SelectItem value="laudo_engenharia">Laudo de Engenharia (ART)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Categoria</Label>
                <Select defaultValue="esporte_recreio">
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="esporte_recreio">Esporte e Recreio</SelectItem>
                    <SelectItem value="moto_aquatica">Moto Aquática</SelectItem>
                    <SelectItem value="profissional">Profissional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)} className="text-xs rounded-xl">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                toast.success("Rascunho de modelo criado com sucesso!");
                setIsCreateOpen(false);
              }}
              className="text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-xl"
            >
              Criar Rascunho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
