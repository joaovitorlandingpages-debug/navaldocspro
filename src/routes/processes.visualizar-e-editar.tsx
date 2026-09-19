import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  FileText,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Save,
  Palette,
  Droplet,
  Info,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Building2,
  Download,
  AlertCircle,
  Bell,
  Search,
  Menu,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { WatermarkCustomOptions } from "@/services/brandedPdfBuilder";
import { type CompanyBranding } from "@/services/companyBranding";

export const Route = createFileRoute("/processes/visualizar-e-editar")({
  validateSearch: (search: Record<string, unknown>) => ({
    orderId: (search.orderId as string) || undefined,
    customerId: (search.customerId as string) || undefined,
    vesselId: (search.vesselId as string) || undefined,
    preview: (search.preview as string) || undefined,
    docIndex: search.docIndex ? Number(search.docIndex) : undefined,
  }),
  component: VisualizarEditarPage,
});

// ---------------------------------------------------------------------------
// LOGO OFICIAL VETORIAL: MARINA SUL SERVIÇOS NÁUTICOS
// ---------------------------------------------------------------------------
function MarinaSulLogo({ className = "h-14 w-auto", hideText = false }: { className?: string; hideText?: boolean }) {
  return (
    <div className={cn("inline-flex flex-col items-center justify-center select-none text-center", className)}>
      {/* Símbolo Náutico: Veleiro estilizado com ondas azuis e verdes água */}
      <svg
        viewBox="0 0 160 80"
        className="w-24 h-12 shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Vela maior */}
        <path
          d="M 65 10 C 72 25, 95 38, 92 48 C 85 50, 70 48, 64 48 Z"
          fill="#0d9488"
          opacity="0.95"
        />
        {/* Vela menor */}
        <path
          d="M 60 18 C 55 28, 40 38, 42 48 C 48 49, 58 48, 62 48 Z"
          fill="#06b6d4"
          opacity="0.9"
        />
        {/* Casco / Onda dinâmica inferior */}
        <path
          d="M 32 54 C 60 52, 90 48, 120 56 C 95 65, 55 64, 32 54 Z"
          fill="#0284c7"
        />
        {/* Onda secundária */}
        <path
          d="M 45 61 C 70 58, 95 56, 128 64 C 105 72, 70 70, 45 61 Z"
          fill="#0369a1"
          opacity="0.7"
        />
      </svg>
      {!hideText && (
        <div className="mt-1 flex flex-col items-center leading-tight">
          <span className="font-extrabold tracking-[0.18em] text-[#0f2d4a] text-[13px] uppercase font-sans">
            MARINA SUL
          </span>
          <span className="text-[9px] font-semibold tracking-wider text-[#0284c7] lowercase -mt-0.5">
            serviços náuticos
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DOCUMENTOS DO PEDIDO (5 MODELOS REALISTAS)
// ---------------------------------------------------------------------------
type OrderDocument = {
  id: string;
  title: string;
  fileName: string;
  service: string;
  customerName: string;
  vesselName: string;
  requestText: string;
  observations: string[];
  totalPages: number;
  compatibleWithWatermark: boolean;
};

const ORDER_DOCUMENTS: OrderDocument[] = [
  {
    id: "doc_1",
    title: "Requerimento",
    fileName: "Requerimento-transferencia.pdf",
    service: "Transferência de propriedade",
    customerName: "Marina Costa",
    vesselName: "Mar Azul",
    requestText:
      "Solicito a análise do serviço identificado neste documento, conforme os dados e anexos do pedido.",
    observations: [
      "Documentos anexados para conferência.",
      "Qualquer informação adicional poderá ser solicitada durante a análise.",
    ],
    totalPages: 2,
    compatibleWithWatermark: true,
  },
  {
    id: "doc_2",
    title: "Declaração de transferência",
    fileName: "Declaracao-transferencia.pdf",
    service: "Transferência de propriedade",
    customerName: "Marina Costa",
    vesselName: "Mar Azul",
    requestText:
      "Declaro para os devidos fins de transferência de propriedade que a embarcação encontra-se livre e desembaraçada de quaisquer ônus perante a Capitania dos Portos.",
    observations: [
      "Reconhecimento de firma em cartório ou assinatura digital ICP-Brasil.",
      "Via original retida no processo de registro da Capitania.",
    ],
    totalPages: 2,
    compatibleWithWatermark: true,
  },
  {
    id: "doc_3",
    title: "Requerimento de renovação",
    fileName: "Requerimento-renovacao.pdf",
    service: "Renovação de documento",
    customerName: "Marina Costa",
    vesselName: "Mar Azul",
    requestText:
      "Requeiro a renovação do TIE/TIEM da referida embarcação, atestando a regularidade de seus equipamentos de salvatagem e segurança da navegação.",
    observations: [
      "Taxa GRU correspondente anexa ao dossiê.",
      "Validade anterior expirada nos termos da NORMAM-211/DPC.",
    ],
    totalPages: 1,
    compatibleWithWatermark: true,
  },
  {
    id: "doc_4",
    title: "Declaração do interessado",
    fileName: "Declaracao-interessado.pdf",
    service: "Renovação de documento",
    customerName: "Marina Costa",
    vesselName: "Mar Azul",
    requestText:
      "Declaro que mantenho a embarcação em perfeitas condições operacionais de acordo com as normas da Autoridade Marítima brasileira.",
    observations: [
      "Termo de vistoria assinado pelo responsável técnico.",
      "Documento de porte obrigatório a bordo.",
    ],
    totalPages: 1,
    compatibleWithWatermark: true,
  },
  {
    id: "doc_5",
    title: "Termo de responsabilidade",
    fileName: "Termo-responsabilidade-motor.pdf",
    service: "Alteração de motor",
    customerName: "Marina Costa",
    vesselName: "Mar Azul",
    requestText:
      "Responsabilizo-me pelas modificações executadas no sistema de propulsão e instalação do novo motor Mercury Verado 300 HP na embarcação acima descrita.",
    observations: [
      "Nota fiscal de aquisição do motor validada.",
      "ART/RRT de engenharia naval registrada.",
    ],
    totalPages: 2,
    compatibleWithWatermark: true,
  },
];

// Identidades visuais selecionáveis
const AVAILABLE_IDENTITIES = [
  { id: "marina_sul_contratante", name: "Marina Sul · Contratante", hasLogo: true },
  { id: "marina_sul_espaco", name: "Marina Sul · Espaço principal", hasLogo: true },
  { id: "nautica_express", name: "Náutica Express · Parceira", hasLogo: true },
  { id: "sem_logo_cadastrado", name: "Despachante Silva (Sem logo cadastrado)", hasLogo: false },
];

export function VisualizarEditarPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Documento selecionado no carrossel (0 a 4)
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const currentDoc = ORDER_DOCUMENTS[currentDocIndex] || ORDER_DOCUMENTS[0];

  // Paginação interna do documento exibido (ex: 1 de 2)
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Abas Mobile: "documento" ou "editar"
  const [activeMobileTab, setActiveMobileTab] = useState<"documento" | "editar">("documento");

  // Estado de Personalização de Marca-d'água
  const [selectedIdentityId, setSelectedIdentityId] = useState("marina_sul_contratante");
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [watermarkOpacity, setWatermarkOpacity] = useState(5); // 2 a 15
  const [watermarkScale, setWatermarkScale] = useState(60); // 20 a 100
  const [watermarkPosition, setWatermarkPosition] = useState<"center" | "top" | "bottom">("center");
  const [watermarkPages, setWatermarkPages] = useState<"all" | "first_only">("all");
  const [applyToAllInOrder, setApplyToAllInOrder] = useState(true);

  // Accordions do Painel Lateral
  const [identityAccordionOpen, setIdentityAccordionOpen] = useState(true);
  const [watermarkAccordionOpen, setWatermarkAccordionOpen] = useState(true);
  const [dataTextAccordionOpen, setDataTextAccordionOpen] = useState(false);

  // Edição de Textos e Dados do Documento
  const [editableRequestText, setEditableRequestText] = useState(currentDoc.requestText);
  const [editableObs1, setEditableObs1] = useState(currentDoc.observations[0] || "");
  const [editableObs2, setEditableObs2] = useState(currentDoc.observations[1] || "");

  // Controle de Alterações e Salvamento
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Sincroniza campos quando o documento ativo muda
  useEffect(() => {
    setEditableRequestText(currentDoc.requestText);
    setEditableObs1(currentDoc.observations[0] || "");
    setEditableObs2(currentDoc.observations[1] || "");
    setCurrentPage(1);
  }, [currentDocIndex]);

  // Marca alterações não salvas
  const markChanged = () => {
    if (!hasUnsavedChanges) setHasUnsavedChanges(true);
  };

  const currentIdentity = useMemo(
    () => AVAILABLE_IDENTITIES.find((i) => i.id === selectedIdentityId) || AVAILABLE_IDENTITIES[0],
    [selectedIdentityId]
  );

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 10, 140));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 10, 70));
  const handleResetZoom = () => setZoomLevel(100);

  // Ação: Descartar Alterações
  const handleDiscardChanges = () => {
    setWatermarkEnabled(true);
    setWatermarkOpacity(5);
    setWatermarkScale(60);
    setWatermarkPosition("center");
    setWatermarkPages("all");
    setEditableRequestText(currentDoc.requestText);
    setEditableObs1(currentDoc.observations[0] || "");
    setEditableObs2(currentDoc.observations[1] || "");
    setHasUnsavedChanges(false);
    toast.info("Alterações descartadas. Configurações originais restauradas.");
  };

  // Ação: Salvar Alterações
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setHasUnsavedChanges(false);
      toast.success("Alterações salvas com sucesso!", {
        description: applyToAllInOrder
          ? "Configurações de marca-d'água aplicadas a todos os documentos compatíveis do pedido."
          : `Configurações salvas para o documento: ${currentDoc.title}.`,
      });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  // Ação: Gerar e Baixar PDF Real com a Marca-d'água
  const handleDownloadRealPdf = async () => {
    setIsExportingPdf(true);
    try {
      const branding: CompanyBranding = {
        company_name: "Marina Sul Serviços Náuticos",
        logo_primary_url: null,
        logo_secondary_url: null,
        brand_primary_color: "#0284c7",
        brand_secondary_color: "#0f172a",
        contact_phone: "(13) 3389-1200",
        contact_whatsapp: "(13) 99742-8811",
        contact_email: "contato@marinasul.com.br",
        contact_website: "www.marinasul.com.br",
        contact_address: "Av. dos Navegantes, 450 - Guarujá/SP",
        technical_responsible_name: "Eng. Roberto Albuquerque",
        technical_responsible_registry: "CREA-SP 506.192/D",
        signature_url: null,
        stamp_url: null,
        watermark_url: null,
        pdf_footer_text: "Documento oficial processado por NavalDocs Pro",
        pdf_template: "classico",
      };

      const docContent = `
${currentDoc.title.toUpperCase()}
INTERESSADA: ${currentDoc.customerName}
EMBARCAÇÃO: ${currentDoc.vesselName}
SERVIÇO: ${currentDoc.service}

SOLICITAÇÃO:
${editableRequestText}

OBSERVAÇÕES:
1. ${editableObs1}
2. ${editableObs2}

Assinatura da interessada: _____________________________________________
Emitido em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
      `.trim();

      const wmOptions: WatermarkCustomOptions = {
        enabled: watermarkEnabled && currentIdentity.hasLogo,
        opacity: watermarkOpacity / 100,
        scale: watermarkScale / 100,
        position: watermarkPosition,
        pages: watermarkPages,
      };

      const { buildBrandedDocumentPdf } = await import("@/services/brandedPdfBuilder");

      const { bytes } = await buildBrandedDocumentPdf({
        docName: currentDoc.title,
        content: docContent,
        branding,
        watermarkOptions: wmOptions,
      });

      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = currentDoc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`PDF "${currentDoc.fileName}" baixado com sucesso!`, {
        description: watermarkEnabled
          ? `Marca-d'água aplicada com ${watermarkOpacity}% de opacidade e ${watermarkScale}% de tamanho.`
          : "Documento gerado sem marca-d'água.",
      });
    } catch (err) {
      console.error("Erro ao gerar PDF com marca-d'água:", err);
      toast.error("Falha ao gerar o PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Se a página for a 2ª e a opção for "Somente a primeira página", a marca-d'água é omitida na prévia
  const showWatermarkOnThisPage =
    watermarkEnabled &&
    currentIdentity.hasLogo &&
    (watermarkPages === "all" || currentPage === 1);

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-800 flex flex-col font-sans antialiased">
      {/* ===================================================================== */}
      {/* 1. TOPO DA APLICAÇÃO (LOGO NAVALDOCS PRO + BUSCA + NOTIFICAÇÕES + USUÁRIO) */}
      {/* ===================================================================== */}
      <header className="h-14 sm:h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="sm:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo Original NavalDocs Pro */}
          <div
            onClick={() => navigate({ to: "/dashboard" })}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#1868db] to-[#0d47a1] flex items-center justify-center text-white shadow-xs">
              {/* Símbolo do Veleiro NavalDocs */}
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                <path d="M4 19h16c.6 0 1-.4 1-1 0-.3-.1-.5-.3-.7L16 12l4-7c.2-.3.1-.7-.1-.9-.3-.2-.7-.2-.9.1L4.3 17.1c-.2.2-.3.5-.3.9 0 .6.4 1 1 1z" />
              </svg>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-extrabold text-[#0f1d36] text-base sm:text-lg leading-tight tracking-tight">
                NavalDocs <span className="text-[#1868db]">Pro</span>
              </span>
            </div>
          </div>
        </div>

        {/* Barra de busca central (Desktop) */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              readOnly
              value="Buscar cliente, embarcação ou processo..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-400 cursor-default focus:outline-none"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-400 font-mono">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Notificações e Perfil */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative p-2 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-100 cursor-pointer"
            aria-label="Notificações"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>

          <div className="h-8 w-8 rounded-full bg-blue-100 text-[#1868db] flex items-center justify-center font-bold text-xs">
            RS
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* 2. SUB-CABEÇALHO DA TELA: VOLTAR À REVISÃO + TÍTULO + STATUS + BOTÃO SALVAR */}
      {/* ===================================================================== */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => navigate({ to: "/processes/novo-pedido", search: { preview: "true", step: 4 } })}
              className="text-xs font-semibold text-[#1868db] hover:text-[#1456b8] inline-flex items-center gap-1.5 cursor-pointer mb-1 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Voltar à revisão</span>
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-extrabold text-[#0f1d36] tracking-tight">
                Visualizar e editar
              </h1>

              {/* Status de alteração (Desktop) */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium">
                {hasUnsavedChanges ? (
                  <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Alterações não salvas
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    Salvo
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Pedido de {currentDoc.customerName} · {currentDoc.vesselName}
            </p>
          </div>

          {/* Botões do topo direito (Desktop) */}
          <div className="hidden sm:flex items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              disabled={isExportingPdf}
              onClick={handleDownloadRealPdf}
              className="h-10 px-4 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              {isExportingPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5 text-[#1868db]" />
              )}
              <span>Baixar PDF</span>
            </Button>

            <Button
              type="button"
              disabled={isSaving}
              onClick={handleSaveChanges}
              className="h-10 px-5 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs shadow-sm flex items-center gap-2 cursor-pointer transition-all"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Salvar alterações</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. BARRA DE NAVEGAÇÃO ENTRE DOCUMENTOS (CARROSSEL 1 DE 5) */}
      {/* ===================================================================== */}
      <div className="bg-white border-b border-slate-200/60 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={currentDocIndex === 0}
            onClick={() => setCurrentDocIndex((prev) => Math.max(prev - 1, 0))}
            className="h-8 px-3 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40 shadow-2xs"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Anterior</span>
          </Button>

          <div className="text-xs sm:text-sm font-bold text-[#0f1d36] text-center truncate px-2">
            Documento {currentDocIndex + 1} de {ORDER_DOCUMENTS.length} ·{" "}
            <span className="text-[#1868db]">{currentDoc.title}</span>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={currentDocIndex === ORDER_DOCUMENTS.length - 1}
            onClick={() => setCurrentDocIndex((prev) => Math.min(prev + 1, ORDER_DOCUMENTS.length - 1))}
            className="h-8 px-3 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40 shadow-2xs"
          >
            <span className="hidden sm:inline">Próximo</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. ABAS DE VISUALIZAÇÃO NO CELULAR: [ DOCUMENTO ] e [ EDITAR ] */}
      {/* ===================================================================== */}
      <div className="sm:hidden px-4 pt-3 pb-1 bg-white border-b border-slate-200/60">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveMobileTab("documento")}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center cursor-pointer",
              activeMobileTab === "documento"
                ? "bg-[#1868db] text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Documento
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileTab("editar")}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center cursor-pointer",
              activeMobileTab === "editar"
                ? "bg-[#1868db] text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Editar
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 5. CORPO PRINCIPAL: VISUALIZADOR DE DOCUMENTO + PAINEL DE PERSONALIZAÇÃO */}
      {/* ===================================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =================================================================== */}
        {/* COLUNA ESQUERDA: VISUALIZADOR DA FOLHA DO DOCUMENTO */}
        {/* =================================================================== */}
        <section
          className={cn(
            "lg:col-span-7 xl:col-span-8 flex flex-col items-center space-y-3",
            activeMobileTab === "editar" ? "hidden lg:flex" : "flex"
          )}
        >
          {/* Chip de Identidade Ativa no Celular */}
          <div className="lg:hidden w-full max-w-xl bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs shadow-2xs">
            <div className="flex items-center gap-2 text-slate-700 min-w-0">
              <Building2 className="h-4 w-4 text-[#1868db] shrink-0" />
              <span className="truncate">
                Identidade: <strong className="text-[#0f1d36]">{currentIdentity.name}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveMobileTab("editar")}
              className="text-xs font-bold text-[#1868db] hover:underline shrink-0 ml-2"
            >
              Alterar
            </button>
          </div>

          {/* Barra Flutuante de Ferramentas de Visualização (Zoom e Páginas) */}
          <div className="w-full max-w-xl flex items-center justify-between bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 shadow-2xs text-xs">
            {/* Páginas */}
            <div className="flex items-center gap-2 font-semibold text-slate-700">
              <FileText className="h-4 w-4 text-[#1868db]" />
              <span>
                Página {currentPage} de {currentDoc.totalPages}
              </span>
            </div>

            {/* Controles de Zoom */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleZoomOut}
                aria-label="Diminuir zoom"
                className="h-7 w-7 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 cursor-pointer"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 text-xs font-bold text-slate-700 hover:text-[#1868db] cursor-pointer"
              >
                {zoomLevel}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                aria-label="Aumentar zoom"
                className="h-7 w-7 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 cursor-pointer"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                aria-label="Ajustar à tela"
                className="hidden sm:flex h-7 w-7 ml-1 rounded-lg border border-slate-200 hover:bg-slate-50 items-center justify-center text-slate-500 cursor-pointer"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* ÁREA DA FOLHA DO DOCUMENTO (A4 COM PRÉVIA E MARCA-D'ÁGUA) */}
          <div
            className="w-full flex justify-center overflow-x-auto py-2 transition-transform duration-200"
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: "top center",
            }}
          >
            {/* Folha A4 com proporção e sombra suave */}
            <div
              className={cn(
                "w-full max-w-[580px] bg-white rounded-2xl border border-slate-200/90 shadow-lg relative p-8 sm:p-12 overflow-hidden flex flex-col justify-between select-text",
                "min-h-[760px]"
              )}
            >
              {/* Badge "PRÉVIA" no canto superior direito */}
              <div className="absolute top-5 right-5 z-20">
                <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-400 tracking-wider uppercase">
                  PRÉVIA
                </span>
              </div>

              {/* =============================================================== */}
              {/* CAMADA DE MARCA-D'ÁGUA REAL (RENDERIZADA NO CENTRO / FUNDO) */}
              {/* =============================================================== */}
              {showWatermarkOnThisPage && (
                <div
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-0 z-0 pointer-events-none flex items-center justify-center transition-all duration-300",
                    watermarkPosition === "top" && "items-start pt-24",
                    watermarkPosition === "bottom" && "items-end pb-24"
                  )}
                >
                  <div
                    style={{
                      width: `${watermarkScale}%`,
                      opacity: watermarkOpacity / 100,
                    }}
                    className="flex flex-col items-center justify-center filter grayscale-0 contrast-125"
                  >
                    <MarinaSulLogo className="w-full h-auto" />
                  </div>
                </div>
              )}

              {/* =============================================================== */}
              {/* CONTEÚDO DO DOCUMENTO (TEXTO E ESTRUTURA OFICIAL) */}
              {/* =============================================================== */}
              <div className="relative z-10 space-y-6">
                {/* Cabeçalho Oficial com o Logo da Empresa */}
                <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
                  <MarinaSulLogo className="h-16 w-auto mb-2" />
                </div>

                {/* Título do Documento */}
                <div className="text-center pt-2 pb-4">
                  <h2 className="text-xl sm:text-2xl font-black text-[#0f1d36] tracking-wider uppercase">
                    {currentDoc.title}
                  </h2>
                </div>

                {/* Dados da Interessada e Embarcação */}
                <div className="space-y-2 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-[#0f1d36] w-28 shrink-0">Interessada:</span>
                    <span className="font-medium text-slate-700">{currentDoc.customerName}</span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-[#0f1d36] w-28 shrink-0">Embarcação:</span>
                    <span className="font-medium text-slate-700">{currentDoc.vesselName}</span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-[#0f1d36] w-28 shrink-0">Serviço:</span>
                    <span className="font-medium text-slate-700">{currentDoc.service}</span>
                  </div>
                </div>

                {/* Corpo do Texto de Solicitação */}
                <div className="pt-4 text-xs sm:text-sm text-slate-700 leading-relaxed text-justify">
                  <p>{editableRequestText}</p>
                </div>

                {/* Observações Numeradas */}
                <div className="pt-4 space-y-1.5 text-xs sm:text-sm text-slate-700">
                  <span className="font-bold text-[#0f1d36] block">Observações:</span>
                  <p className="text-xs text-slate-600 pl-2">1. {editableObs1}</p>
                  <p className="text-xs text-slate-600 pl-2">2. {editableObs2}</p>
                </div>
              </div>

              {/* Bloco Inferior: Linha de Assinatura e Rodapé */}
              <div className="relative z-10 pt-16 space-y-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-64 border-b border-slate-400 mb-1.5" />
                  <span className="text-xs text-slate-500 font-medium">
                    Assinatura da interessada
                  </span>
                </div>

                <div className="text-right pt-4">
                  <span className="text-[10px] text-slate-400 italic">
                    Modelo ilustrativo
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Resumo Inferior no Celular */}
          <div className="lg:hidden w-full max-w-xl bg-white border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between text-xs shadow-2xs mt-2">
            <div className="flex items-center gap-2">
              <Droplet className="h-4 w-4 text-[#1868db]" />
              <span className="font-semibold text-slate-700">
                {watermarkEnabled
                  ? `Marca-d'água ativada · ${watermarkOpacity}%`
                  : "Marca-d'água desativada"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveMobileTab("editar")}
              className="text-xs font-bold text-[#1868db] hover:underline cursor-pointer"
            >
              Ajustar
            </button>
          </div>

          {/* Botão Acessível de Salvar no Celular */}
          <div className="lg:hidden w-full max-w-xl pt-1 space-y-2">
            <Button
              type="button"
              disabled={isSaving}
              onClick={handleSaveChanges}
              className="w-full h-11 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Salvar alterações</span>
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate({ to: "/processes/novo-pedido", search: { preview: "true", step: 4 } })}
                className="text-xs font-semibold text-slate-500 hover:text-[#1868db] inline-flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>Voltar à revisão</span>
              </button>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* COLUNA DIREITA: PAINEL DE PERSONALIZAÇÃO DO DOCUMENTO */}
        {/* =================================================================== */}
        <aside
          className={cn(
            "lg:col-span-5 xl:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5",
            activeMobileTab === "documento" ? "hidden lg:block" : "block"
          )}
        >
          <h2 className="text-base sm:text-lg font-bold text-[#0f1d36]">
            Personalização do documento
          </h2>

          {/* ================================================================= */}
          {/* SEÇÃO 1: IDENTIDADE VISUAL */}
          {/* ================================================================= */}
          <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setIdentityAccordionOpen(!identityAccordionOpen)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/60 transition-colors text-left select-none cursor-pointer"
            >
              <div className="flex items-center gap-2.5 font-bold text-xs sm:text-sm text-[#0f1d36]">
                <Palette className="h-4 w-4 text-[#1868db]" />
                <span>Identidade visual</span>
              </div>
              {identityAccordionOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </button>

            {identityAccordionOpen && (
              <div className="p-4 pt-1 border-t border-slate-100 space-y-3 text-xs animate-in fade-in-50 duration-150">
                <div className="space-y-1.5">
                  <Label htmlFor="empresa-select" className="text-xs font-semibold text-slate-700">
                    Empresa exibida no documento
                  </Label>
                  <Select
                    value={selectedIdentityId}
                    onValueChange={(val) => {
                      setSelectedIdentityId(val);
                      markChanged();
                    }}
                  >
                    <SelectTrigger id="empresa-select" className="w-full h-10 rounded-xl border-slate-200 text-xs font-medium">
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_IDENTITIES.map((item) => (
                        <SelectItem key={item.id} value={item.id} className="text-xs">
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!currentIdentity.hasLogo && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span>Esta empresa não possui um logo cadastrado para marca-d'água. </span>
                      <button
                        type="button"
                        onClick={() => navigate({ to: "/identidade" })}
                        className="font-bold underline text-amber-900 ml-1 cursor-pointer"
                      >
                        Cadastrar logo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* SEÇÃO 2: MARCA-D'ÁGUA (CONTROLES COMPLETOS) */}
          {/* ================================================================= */}
          <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setWatermarkAccordionOpen(!watermarkAccordionOpen)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/60 transition-colors text-left select-none cursor-pointer"
            >
              <div className="flex items-center gap-2.5 font-bold text-xs sm:text-sm text-[#0f1d36]">
                <Droplet className="h-4 w-4 text-[#1868db]" />
                <span>Marca-d’água</span>
              </div>
              {watermarkAccordionOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </button>

            {watermarkAccordionOpen && (
              <div className="p-4 pt-1 border-t border-slate-100 space-y-4 text-xs animate-in fade-in-50 duration-150">
                {/* Switch Exibir marca-d'água */}
                <div className="flex items-center justify-between py-1">
                  <Label
                    htmlFor="watermark-toggle"
                    className="text-xs font-bold text-[#0f1d36] cursor-pointer"
                  >
                    Exibir marca-d’água
                  </Label>
                  <Switch
                    id="watermark-toggle"
                    checked={watermarkEnabled}
                    onCheckedChange={(val) => {
                      setWatermarkEnabled(val);
                      markChanged();
                    }}
                    className="data-[state=checked]:bg-[#1868db]"
                  />
                </div>

                {watermarkEnabled && (
                  <>
                    {/* Miniatura do Logo da Empresa com Caixa Suave */}
                    <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 flex items-center gap-3">
                      <div className="h-10 w-16 bg-white rounded-lg border border-slate-200 flex items-center justify-center p-1 shrink-0">
                        <MarinaSulLogo hideText className="h-6 w-auto" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-[#0f1d36] block truncate">
                          Marina Sul
                        </span>
                        <span className="text-[10px] text-slate-500 block leading-snug">
                          Usa o logo da empresa selecionada.
                        </span>
                      </div>
                    </div>

                    {/* Controle de Opacidade (2% a 15%, padrão 5%) */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-xs text-slate-700">Opacidade</span>
                        <span className="text-xs font-bold text-[#0f1d36]">
                          {watermarkOpacity}%
                        </span>
                      </div>

                      <Slider
                        value={[watermarkOpacity]}
                        min={2}
                        max={15}
                        step={1}
                        onValueChange={(val) => {
                          setWatermarkOpacity(val[0]);
                          markChanged();
                        }}
                        className="py-1 cursor-pointer"
                        aria-label="Opacidade da marca-d'água"
                      />

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span>2%</span>
                        <span>15%</span>
                      </div>
                    </div>

                    {/* Controle de Tamanho (20% a 100%, padrão 60%) */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-xs text-slate-700">Tamanho</span>
                        <span className="text-xs font-bold text-[#0f1d36]">
                          {watermarkScale}% da largura
                        </span>
                      </div>

                      <Slider
                        value={[watermarkScale]}
                        min={20}
                        max={100}
                        step={5}
                        onValueChange={(val) => {
                          setWatermarkScale(val[0]);
                          markChanged();
                        }}
                        className="py-1 cursor-pointer"
                        aria-label="Tamanho da marca-d'água"
                      />

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span>20%</span>
                        <span>100%</span>
                      </div>
                    </div>

                    {/* Posição */}
                    <div className="space-y-1.5 pt-1">
                      <Label htmlFor="posicao-select" className="text-xs font-semibold text-slate-700">
                        Posição
                      </Label>
                      <Select
                        value={watermarkPosition}
                        onValueChange={(val: any) => {
                          setWatermarkPosition(val);
                          markChanged();
                        }}
                      >
                        <SelectTrigger id="posicao-select" className="w-full h-10 rounded-xl border-slate-200 text-xs font-medium">
                          <SelectValue placeholder="Selecione a posição" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="center" className="text-xs">
                            Centralizada
                          </SelectItem>
                          <SelectItem value="top" className="text-xs">
                            Superior
                          </SelectItem>
                          <SelectItem value="bottom" className="text-xs">
                            Inferior
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Páginas */}
                    <div className="space-y-1.5 pt-1">
                      <Label htmlFor="paginas-select" className="text-xs font-semibold text-slate-700">
                        Páginas
                      </Label>
                      <Select
                        value={watermarkPages}
                        onValueChange={(val: any) => {
                          setWatermarkPages(val);
                          markChanged();
                        }}
                      >
                        <SelectTrigger id="paginas-select" className="w-full h-10 rounded-xl border-slate-200 text-xs font-medium">
                          <SelectValue placeholder="Páginas a aplicar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="text-xs">
                            Todas as páginas
                          </SelectItem>
                          <SelectItem value="first_only" className="text-xs">
                            Somente a primeira página
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Checkbox: Aplicar aos documentos compatíveis do pedido */}
                    <div className="pt-2 space-y-1.5">
                      <div className="flex items-start gap-2.5">
                        <Checkbox
                          id="apply-all"
                          checked={applyToAllInOrder}
                          onCheckedChange={(checked) => {
                            setApplyToAllInOrder(!!checked);
                            markChanged();
                          }}
                          className="mt-0.5 data-[state=checked]:bg-[#1868db] data-[state=checked]:border-[#1868db]"
                        />
                        <Label
                          htmlFor="apply-all"
                          className="text-xs text-slate-700 font-medium leading-snug cursor-pointer select-none"
                        >
                          Aplicar aos documentos compatíveis deste pedido.
                        </Label>
                      </div>

                      <p className="text-[11px] text-slate-400 pl-6 inline-flex items-center gap-1">
                        <Info className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>Disponível somente nos modelos que permitem personalização.</span>
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* SEÇÃO 3: DADOS E TEXTO (FORMULÁRIO DE EDIÇÃO) */}
          {/* ================================================================= */}
          <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setDataTextAccordionOpen(!dataTextAccordionOpen)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/60 transition-colors text-left select-none cursor-pointer"
            >
              <div className="flex items-center gap-2.5 font-bold text-xs sm:text-sm text-[#0f1d36]">
                <FileText className="h-4 w-4 text-[#1868db]" />
                <span>Dados e texto</span>
              </div>
              {dataTextAccordionOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </button>

            {dataTextAccordionOpen && (
              <div className="p-4 pt-1 border-t border-slate-100 space-y-3.5 text-xs animate-in fade-in-50 duration-150">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Texto da solicitação</Label>
                  <textarea
                    rows={3}
                    value={editableRequestText}
                    onChange={(e) => {
                      setEditableRequestText(e.target.value);
                      markChanged();
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20 leading-relaxed resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Observação 1</Label>
                  <Input
                    value={editableObs1}
                    onChange={(e) => {
                      setEditableObs1(e.target.value);
                      markChanged();
                    }}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Observação 2</Label>
                  <Input
                    value={editableObs2}
                    onChange={(e) => {
                      setEditableObs2(e.target.value);
                      markChanged();
                    }}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* BOTÕES DO PAINEL LATERAL (DESCARTAR E SALVAR) */}
          {/* ================================================================= */}
          <div className="pt-2 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleDiscardChanges}
                disabled={!hasUnsavedChanges}
                className="h-10 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs cursor-pointer shadow-2xs disabled:opacity-40"
              >
                Descartar alterações
              </Button>

              <Button
                type="button"
                disabled={isSaving}
                onClick={handleSaveChanges}
                className="h-10 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Salvar alterações</span>
                  </>
                )}
              </Button>
            </div>

            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <Info className="h-3 w-3 text-slate-400 shrink-0" />
              <span>Confira a leitura antes de salvar.</span>
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
