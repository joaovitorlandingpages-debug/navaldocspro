import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import {
  ArrowLeft, Download, Eye, Ship, FileText, Wrench, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle2, Lightbulb, Clock, Check, X, Loader2, Sparkles,
  User, Calendar, FolderArchive, FileCheck, Palette
} from "lucide-react";
import { useState, useMemo } from "react";
import JSZip from "jszip";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/routes/dashboard";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/processes/arquivos-gerados")({
  validateSearch: (search: Record<string, unknown>): { orderId?: string; customerId?: string; vesselId?: string; preview?: string; allReady?: string } => ({
    orderId: (search.orderId as string) || undefined,
    customerId: (search.customerId as string) || undefined,
    vesselId: (search.vesselId as string) || undefined,
    preview: (search.preview as string) || undefined,
    allReady: (search.allReady as string) || undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <ArquivosGeradosPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

// Componente do selo vermelho do PDF
function PdfBadgeIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-red-600 text-white flex flex-col items-center justify-center font-bold shrink-0 shadow-2xs select-none",
        className
      )}
    >
      <span className="text-[9px] font-black tracking-tighter leading-none">PDF</span>
    </div>
  );
}

interface GeneratedFileItem {
  id: string;
  name: string;
  version: number;
  generatedAt: string;
  serviceId: string;
  serviceName: string;
  folderName: string;
  status: "gerado" | "pendente";
  pagesCount: number;
  fileSize: string;
  contentSample: string;
}

interface ServiceGroup {
  id: string;
  name: string;
  icon: any;
  status: "pronto" | "pendente";
  files: GeneratedFileItem[];
  pendingNote?: string;
  pendingTitle?: string;
}

const INITIAL_SERVICE_GROUPS: ServiceGroup[] = [
  {
    id: "transferencia",
    name: "Transferência de propriedade",
    icon: Ship,
    status: "pronto",
    files: [
      {
        id: "transf-req",
        name: "Requerimento.pdf",
        version: 1,
        generatedAt: "12/03/2025 às 14:32",
        serviceId: "transferencia",
        serviceName: "Transferência de propriedade",
        folderName: "Processo_0247_Transferencia",
        status: "gerado",
        pagesCount: 2,
        fileSize: "248 KB",
        contentSample: "REQUERIMENTO DE TRANSFERÊNCIA DE PROPRIEDADE\n\nÀ CAPITANIA DOS PORTOS\n\nEmbarcação: MAR AZUL (Inscrição: 381-000123)\nVendedor: Marina Costa (CPF: 042.819.330-12)\nComprador: Carlos Eduardo Ramos (CPF: 192.834.721-09)\n\nRequer-se a transferência de propriedade nos termos da NORMAM-211/DPC.",
      },
      {
        id: "transf-decl",
        name: "Declaracao-transferencia.pdf",
        version: 1,
        generatedAt: "12/03/2025 às 14:32",
        serviceId: "transferencia",
        serviceName: "Transferência de propriedade",
        folderName: "Processo_0247_Transferencia",
        status: "gerado",
        pagesCount: 1,
        fileSize: "185 KB",
        contentSample: "TERMO DE ENTREGA E DECLARAÇÃO DE RESPONSABILIDADE\n\nDeclaro para os devidos fins de direito que recebi a embarcação MAR AZUL em perfeitas condições de navegabilidade, assumindo plena responsabilidade civil e marítima.",
      },
    ],
  },
  {
    id: "renovacao",
    name: "Renovação de documento",
    icon: FileText,
    status: "pronto",
    files: [
      {
        id: "renov-req",
        name: "Requerimento.pdf",
        version: 1,
        generatedAt: "12/03/2025 às 14:32",
        serviceId: "renovacao",
        serviceName: "Renovação de documento",
        folderName: "Processo_0258_Renovacao",
        status: "gerado",
        pagesCount: 2,
        fileSize: "230 KB",
        contentSample: "REQUERIMENTO DE RENOVAÇÃO DE TÍTULO DE INSCRIÇÃO DE EMBARCAÇÃO (TIE)\n\nÀ CAPITANIA DOS PORTOS\n\nEmbarcação: MAR AZUL\nProprietário: Marina Costa\nValidade expirada: 20/11/2025\n\nRequer a emissão da nova via do documento de inscrição.",
      },
      {
        id: "renov-decl",
        name: "Declaracao-interessado.pdf",
        version: 1,
        generatedAt: "12/03/2025 às 14:32",
        serviceId: "renovacao",
        serviceName: "Renovação de documento",
        folderName: "Processo_0258_Renovacao",
        status: "gerado",
        pagesCount: 1,
        fileSize: "160 KB",
        contentSample: "DECLARAÇÃO DO INTERESSADO PARA RENOVAÇÃO\n\nDeclaro que a embarcação mantém as mesmas características técnicas originais e dotação regulamentar de salvatagem e combate a incêndio.",
      },
    ],
  },
  {
    id: "alteracao_motor",
    name: "Alteração de motor",
    icon: Wrench,
    status: "pendente",
    pendingTitle: "Requerimento de alteração",
    pendingNote: "Confira a identificação do novo motor.",
    files: [],
  },
];

function ArquivosGeradosPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/processes/arquivos-gerados" });
  const { profile } = useAuth();

  // Grupos de serviços com seus arquivos
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>(() => {
    if (search.allReady === "true") {
      return INITIAL_SERVICE_GROUPS.map((g) => {
        if (g.id === "alteracao_motor") {
          return {
            ...g,
            status: "pronto" as const,
            files: [
              {
                id: "motor-req",
                name: "Requerimento-alteracao-motor.pdf",
                version: 1,
                generatedAt: "12/03/2025 às 14:40",
                serviceId: "alteracao_motor",
                serviceName: "Alteração de motor",
                folderName: "Processo_0269_Alteracao_Motor",
                status: "gerado" as const,
                pagesCount: 2,
                fileSize: "260 KB",
                contentSample: "REQUERIMENTO DE ALTERAÇÃO DE DADOS CADASTRAIS (MOTOR)\n\nÀ CAPITANIA DOS PORTOS\n\nEmbarcação: MAR AZUL\nNovo Motor: Mercury Verado 300 HP - Série: MV-992812\n\nSolicita-se a averbação no TIE.",
              },
            ],
          };
        }
        return g;
      });
    }
    return INITIAL_SERVICE_GROUPS;
  });

  // Controle de sanfona por serviço (todos abertos por padrão, como na imagem)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    transferencia: true,
    renovacao: true,
    alteracao_motor: true,
  });

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Modais
  const [viewingFile, setViewingFile] = useState<GeneratedFileItem | null>(null);
  const [isResolvingPending, setIsResolvingPending] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  // Contadores
  const totalGeneratedFiles = useMemo(() => {
    return serviceGroups.reduce((acc, g) => acc + g.files.length, 0);
  }, [serviceGroups]);

  const pendingCount = useMemo(() => {
    return serviceGroups.filter((g) => g.status === "pendente").length;
  }, [serviceGroups]);

  const hasPending = pendingCount > 0;

  // Download individual de arquivo PDF
  const handleDownloadFile = (file: GeneratedFileItem) => {
    toast.loading(`Baixando ${file.name}...`, { id: `down-${file.id}` });
    try {
      const blob = new Blob([file.contentSample], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Download de ${file.name} concluído com sucesso!`, { id: `down-${file.id}` });
    } catch (err) {
      console.error(err);
      toast.error(`Erro ao baixar ${file.name}.`, { id: `down-${file.id}` });
    }
  };

  // Download em ZIP estruturado com pastas por processo
  const handleDownloadZip = async () => {
    if (totalGeneratedFiles === 0) {
      toast.info("Nenhum arquivo gerado disponível para download.");
      return;
    }

    setIsZipping(true);
    toast.loading(`Preparando ZIP com ${totalGeneratedFiles} arquivos organizados por processo...`, { id: "zip-download" });

    try {
      const zip = new JSZip();
      const rootFolder = zip.folder("Pedido_Mar_Azul");

      serviceGroups.forEach((group) => {
        if (group.files.length > 0) {
          const serviceFolder = rootFolder?.folder(
            group.files[0].folderName || `Processo_${group.id}`
          );
          group.files.forEach((file) => {
            serviceFolder?.file(file.name, file.contentSample);
          });
        }
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Pedido_Mar_Azul_${totalGeneratedFiles}_arquivos.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Pacote ZIP com ${totalGeneratedFiles} arquivos baixado com sucesso!`, { id: "zip-download" });
    } catch (err) {
      console.error("Erro ao gerar ZIP:", err);
      toast.error("Não foi possível gerar o arquivo ZIP.", { id: "zip-download" });
    } finally {
      setIsZipping(false);
    }
  };

  // Resolução da pendência de Alteração de motor
  const handleConfirmResolvePending = () => {
    toast.loading("Validando nota fiscal e gerando Requerimento de Alteração de Motor...", { id: "resolve-pending" });

    setTimeout(() => {
      setServiceGroups((prev) =>
        prev.map((g) => {
          if (g.id === "alteracao_motor") {
            return {
              ...g,
              status: "pronto" as const,
              files: [
                {
                  id: "motor-req",
                  name: "Requerimento-alteracao-motor.pdf",
                  version: 1,
                  generatedAt: "12/03/2025 às 14:40",
                  serviceId: "alteracao_motor",
                  serviceName: "Alteração de motor",
                  folderName: "Processo_0269_Alteracao_Motor",
                  status: "gerado" as const,
                  pagesCount: 2,
                  fileSize: "260 KB",
                  contentSample: "REQUERIMENTO DE ALTERAÇÃO DE DADOS CADASTRAIS (MOTOR)\n\nÀ CAPITANIA DOS PORTOS\n\nEmbarcação: MAR AZUL\nNovo Motor: Mercury Verado 300 HP - Série: MV-992812\n\nSolicita-se a averbação no TIE.",
                },
              ],
            };
          }
          return g;
        })
      );

      setIsResolvingPending(false);
      toast.success("Pendência resolvida! Requerimento de alteração de motor gerado com sucesso.", { id: "resolve-pending" });
    }, 1000);
  };

  return (
    <div className="animate-in fade-in duration-300 max-w-5xl mx-auto space-y-6 pb-20">
      {/* 1. CABEÇALHO DINÂMICO */}
      <div className="space-y-3">
        {/* Link Voltar ao pedido */}
        <div>
          <Link
            to="/processes/novo-pedido"
            search={{ preview: "true", step: "4" }}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#1868db] hover:underline transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar ao pedido</span>
          </Link>
        </div>

        {/* Título, Subtítulo e Botão de ZIP no Desktop */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0f1d36] tracking-tight">
              {hasPending ? (
                <>
                  <span className="hidden sm:inline">Seus arquivos estão disponíveis</span>
                  <span className="sm:hidden">Arquivos disponíveis</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Seus arquivos estão prontos</span>
                  <span className="sm:hidden">Arquivos prontos</span>
                </>
              )}
            </h1>

            <p className="text-slate-500 text-xs sm:text-sm mt-0.5 font-normal">
              {hasPending ? (
                <>
                  <span className="hidden sm:inline">
                    {totalGeneratedFiles} arquivos gerados. {pendingCount} arquivo ainda precisa de conferência.
                  </span>
                  <span className="sm:hidden">
                    {totalGeneratedFiles} gerados · {pendingCount} pendente
                  </span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">
                    {totalGeneratedFiles} arquivos gerados. Todos os documentos disponíveis para download.
                  </span>
                  <span className="sm:hidden">
                    {totalGeneratedFiles} gerados · Pronto para envio
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Botão de ZIP no Desktop (alinhado à direita) */}
          <div className="hidden sm:block shrink-0">
            <Button
              type="button"
              disabled={isZipping || totalGeneratedFiles === 0}
              onClick={handleDownloadZip}
              className="h-11 px-6 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs sm:text-sm shadow-sm flex items-center gap-2 cursor-pointer transition-all"
            >
              {isZipping ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Preparando ZIP...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Baixar {totalGeneratedFiles} arquivos em ZIP</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Sub-barra de contexto: Cliente, Embarcação e Serviços */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-semibold text-slate-700 py-1 border-t border-slate-100 sm:border-0 pt-2 sm:pt-0">
          <div className="flex items-center gap-1.5 text-[#0f1d36]">
            <User className="h-3.5 w-3.5 text-[#1868db]" />
            <span>Marina Costa · Mar Azul</span>
          </div>

          <span className="text-slate-300 font-light">|</span>

          <div className="flex items-center gap-1.5 text-slate-600">
            <Calendar className="h-3.5 w-3.5 text-[#1868db]" />
            <span>3 serviços</span>
          </div>
        </div>

        {/* Botão de ZIP no Mobile (largura total) */}
        <div className="sm:hidden pt-1">
          <Button
            type="button"
            disabled={isZipping || totalGeneratedFiles === 0}
            onClick={handleDownloadZip}
            className="w-full h-11 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {isZipping ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Preparando ZIP...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Baixar {totalGeneratedFiles} arquivos em ZIP</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 2. CAIXA DE ALERTA DE PENDÊNCIA (SE HOUVER PENDÊNCIA) */}
      {hasPending && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#fff9ea] border border-[#fde8b3] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-[#e89a17] text-white font-black text-sm flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 shadow-2xs">
              !
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-[#0f1d36]">
                Este pedido ainda tem uma pendência.
              </h3>
              <p className="text-slate-600 text-xs mt-0.5">
                <span className="hidden sm:inline">Revise as informações abaixo para finalizar o processo.</span>
                <span className="sm:hidden">Revise as informações para finalizar.</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsResolvingPending(true)}
            className="text-xs font-bold text-[#1868db] hover:underline inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>Resolver pendência</span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* 3. CARTÕES DE SERVIÇOS E ARQUIVOS GERADOS */}
      <div className="space-y-4">
        {serviceGroups.map((group) => {
          const IconComp = group.icon;
          const isExpanded = expandedSections[group.id] ?? true;

          return (
            <div
              key={group.id}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs transition-all"
            >
              {/* Cabeçalho do Cartão de Serviço */}
              <button
                type="button"
                onClick={() => toggleSection(group.id)}
                className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/40 text-left transition-colors cursor-pointer select-none"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 text-[#1868db] flex items-center justify-center shrink-0">
                    <IconComp className="h-4 w-4" />
                  </div>

                  <h3 className="font-bold text-xs sm:text-sm text-[#0f1d36]">
                    {group.name}
                  </h3>

                  {group.status === "pronto" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                      <span>{group.files.length} arquivos gerados</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                      <Clock className="h-3 w-3 text-amber-600" />
                      <span>Pendente</span>
                    </span>
                  )}
                </div>

                <div className="text-slate-400 pl-2">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>

              {/* Conteúdo Expansível: Arquivos Produzidos ou Pendentes */}
              {isExpanded && (
                <div className="p-4 sm:p-5 pt-0 space-y-3 border-t border-slate-100 divide-y divide-slate-100">
                  {/* Lista de Arquivos Gerados */}
                  {group.files.map((file) => (
                    <div
                      key={file.id}
                      className="pt-3 first:pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <PdfBadgeIcon className="mt-0.5" />
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-[#0f1d36] truncate">
                            {file.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Versão {file.version} · Gerado em {file.generatedAt}
                          </p>
                        </div>
                      </div>

                      {/* Botões de Ação: Visualizar e Baixar */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setViewingFile(file)}
                          className="h-8 px-3 rounded-lg border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500" />
                          <span>Visualizar</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleDownloadFile(file)}
                          className="h-8 px-3 rounded-lg border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Download className="h-3.5 w-3.5 text-slate-500" />
                          <span>Baixar</span>
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Linha de Pendência (caso o serviço ainda não esteja pronto) */}
                  {group.status === "pendente" && (
                    <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-700">
                            {group.pendingTitle || "Requerimento de alteração"}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {group.pendingNote || "Confira a identificação do novo motor."}
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsResolvingPending(true)}
                        className="h-8 px-4 rounded-lg border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold self-end sm:self-auto cursor-pointer shadow-2xs"
                      >
                        Resolver pendência
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. CARTÃO DE PRÓXIMOS PASSOS */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="h-9 w-9 rounded-full bg-blue-50 text-[#1868db] flex items-center justify-center shrink-0 mt-0.5">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-[#0f1d36]">
              Próximos passos
            </h4>
            <p className="text-slate-600 text-xs mt-0.5">
              Confira quais documentos precisam de assinatura antes do envio.
            </p>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Arquivos gerados não foram assinados ou protocolados automaticamente.
            </p>
          </div>
        </div>

        {/* Botões Desktop */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/processes" })}
            className="h-10 px-5 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer shadow-2xs"
          >
            Acompanhar processos
          </Button>

          <Button
            type="button"
            onClick={() => navigate({ to: "/processes/novo-pedido" })}
            className="h-10 px-5 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs shadow-sm cursor-pointer"
          >
            Novo pedido
          </Button>
        </div>

        {/* Botão Mobile */}
        <div className="sm:hidden pt-1">
          <Button
            type="button"
            onClick={() => navigate({ to: "/processes" })}
            className="w-full h-11 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs shadow-sm cursor-pointer"
          >
            Acompanhar processos
          </Button>
        </div>
      </div>

      {/* Nota de rodapé */}
      <div className="text-right">
        <span className="text-[11px] text-slate-400 font-normal">
          Dados e modelos ilustrativos
        </span>
      </div>

      {/* ===================================================================== */}
      {/* MODAIS INTERATIVOS */}
      {/* ===================================================================== */}

      {/* Modal: Visualizar Arquivo Gerado */}
      <Dialog open={!!viewingFile} onOpenChange={(open) => { if (!open) setViewingFile(null); }}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <PdfBadgeIcon />
              <div>
                <DialogTitle className="text-base font-bold text-[#0f1d36]">
                  {viewingFile?.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {viewingFile?.serviceName} · Versão {viewingFile?.version} · {viewingFile?.fileSize}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Prévia do Documento Oficial */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60 flex justify-center">
            <div className="w-full max-w-xl bg-white rounded-xl border border-slate-300/80 p-6 sm:p-8 shadow-sm space-y-4 text-xs font-mono">
              {/* Brasão / Cabeçalho Marítimo Oficial */}
              <div className="text-center border-b border-slate-200 pb-4 space-y-1 font-sans">
                <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase block">
                  MARINHA DO BRASIL · DIRETORIA DE PORTOS E COSTAS
                </span>
                <span className="text-xs font-bold text-[#0f1d36] block">
                  CAPITANIA DOS PORTOS DE SÃO PAULO
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Sistema Integrado NavalDocs Pro · Registro Digital
                </span>
              </div>

              {/* Corpo do Documento */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed text-xs">
                {viewingFile?.contentSample}
              </div>

              {/* Assinaturas Digitais e Chaves */}
              <div className="pt-4 border-t border-slate-200 text-[10px] font-sans text-slate-400 flex items-center justify-between">
                <span>Certificado SHA-256: 8f4a9b21e84c...</span>
                <span>Página 1 de {viewingFile?.pagesCount || 1}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setViewingFile(null)}
              className="h-9 px-4 rounded-xl border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Fechar
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setViewingFile(null);
                  navigate({
                    to: "/processes/visualizar-e-editar",
                    search: {
                      preview: "true",
                    },
                  });
                }}
                className="h-9 px-3.5 rounded-xl border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-slate-50"
              >
                <Palette className="h-3.5 w-3.5 text-[#1868db]" />
                <span>Personalizar marca-d'água</span>
              </Button>

              {viewingFile && (
                <Button
                  type="button"
                  onClick={() => handleDownloadFile(viewingFile)}
                  className="h-9 px-5 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Baixar PDF</span>
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Resolver Pendência do Motor */}
      <Dialog open={isResolvingPending} onOpenChange={setIsResolvingPending}>
        <DialogContent className="max-w-lg w-[95vw] rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-[#0f1d36] flex items-center gap-2">
              <Wrench className="h-4 w-4 text-[#1868db]" />
              <span>Resolver pendência · Alteração de motor</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Confirme a identificação do novo motor para gerar o requerimento oficial.
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 text-slate-700 space-y-2">
              <span className="font-bold text-[#0f1d36] block">Dados do Novo Motor Identificados:</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Potência:</span>
                  <span className="font-semibold text-slate-800">300 HP</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Marca / Modelo:</span>
                  <span className="font-semibold text-slate-800">Mercury Verado</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Número de Série:</span>
                  <span className="font-semibold text-slate-800">MV-992812</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Comprovante:</span>
                  <span className="font-semibold text-emerald-700">NF-e 049.201 validada</span>
                </div>
              </div>
            </div>

            <p className="text-slate-500 text-[11px]">
              Ao confirmar, o Requerimento de Alteração de Dados Cadastrais será gerado imediatamente e inserido no pacote ZIP do pedido.
            </p>
          </div>

          <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsResolvingPending(false)}
              className="h-9 px-4 rounded-xl border-slate-200 text-slate-700 text-xs font-semibold"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={handleConfirmResolvePending}
              className="h-9 px-5 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Confirmar e gerar arquivo</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
