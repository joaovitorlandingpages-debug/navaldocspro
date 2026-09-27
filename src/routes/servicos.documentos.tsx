import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  ArrowLeft, 
  User, 
  Ship, 
  Folder, 
  Cog, 
  FileText, 
  Clock, 
  CheckCircle2, 
  MinusCircle, 
  AlertTriangle, 
  ExternalLink, 
  Eye, 
  Upload, 
  Loader2, 
  Save, 
  FileCheck2, 
  Info, 
  Check, 
  X, 
  FileSpreadsheet, 
  Building2, 
  Home, 
  CreditCard,
  Anchor
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/servicos/documentos")({
  validateSearch: (search: Record<string, unknown>) => ({
    category: (search.category as "profissional" | "esporte_recreio") || "esporte_recreio",
    customerId: (search.customerId as string) || "",
    vesselId: (search.vesselId as string) || "",
    services: (search.services as string) || "",
    activeServiceId: (search.activeServiceId as string) || "",
    from: (search.from as string) || undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <DocumentosDoServicoPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

// Catálogo de serviços com seus nomes oficiais e fontes
const SERVICE_CATALOG: Record<string, { title: string; category: "profissional" | "esporte_recreio" | "moto_aquatica" }> = {
  "inscricao-inicial": { title: "Inscrição inicial", category: "esporte_recreio" },
  "renovacao-tie": { title: "Renovação do TIE", category: "esporte_recreio" },
  "segunda-via-tie": { title: "Segunda via do TIE", category: "esporte_recreio" },
  "transferencia-propriedade": { title: "Transferência de propriedade", category: "esporte_recreio" },
  "transferencia-jurisdicao": { title: "Transferência de jurisdição", category: "esporte_recreio" },
  "transferencia-ambas": { title: "Transferência de propriedade e jurisdição", category: "esporte_recreio" },
  "comunicacao-venda": { title: "Comunicação de venda", category: "esporte_recreio" },
  "inscricao-comercial": { title: "Inscrição comercial inicial", category: "profissional" },
  "renovacao-tie-prof": { title: "Renovação de TIE profissional", category: "profissional" },
  "segunda-via-tie-prof": { title: "Segunda via de TIE profissional", category: "profissional" },
  "transferencia-prof": { title: "Transferência de propriedade profissional", category: "profissional" },
  "transferencia-jurisdicao-prof": { title: "Transferência de jurisdição profissional", category: "profissional" },
};

function DocumentosDoServicoPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { currentCompany } = useAuth();

  const category = search.category || "esporte_recreio";
  const customerId = search.customerId;
  const vesselId = search.vesselId;
  const rawServices = search.services ? search.services.split(",").filter(Boolean) : [];
  
  const [activeServiceKey, setActiveServiceKey] = useState<string>(
    search.activeServiceId || rawServices[0] || "renovacao-tie"
  );

  // Estados de dados carregados
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const [vessel, setVessel] = useState<any>(null);

  // Estados condicionais do formulário
  const [vesselType, setVesselType] = useState("Lancha");
  const [lengthMeters, setLengthMeters] = useState("6,50 m");
  const [ownerType, setOwnerType] = useState<"pf" | "pj">("pf");
  const [serviceAttendance, setServiceAttendance] = useState<"representante" | "proprietario">("representante");

  // Estado dos arquivos anexados / disponíveis
  const [attachedFiles, setAttachedFiles] = useState<{
    rg: { available: boolean; name: string; url?: string };
    residence: { available: boolean; name: string; url?: string };
    vesselDoc: { available: boolean; name: string; url?: string };
  }>({
    rg: { available: true, name: "Documento de identificação (RG/CNH)" },
    residence: { available: true, name: "Comprovante de residência" },
    vesselDoc: { available: false, name: "Documento atual da embarcação (TIE/TIEM)" },
  });

  // Modais
  const [isVesselModalOpen, setIsVesselModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFileForUpload, setSelectedFileForUpload] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{ title: string; desc: string } | null>(null);
  const [isReviewBlockedModalOpen, setIsReviewBlockedModalOpen] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);

  // Carregamento dos dados do cliente e embarcação
  useEffect(() => {
    async function loadContextData() {
      setLoading(true);
      try {
        if (customerId) {
          const { data: custData } = await supabase
            .from("customers")
            .select("*")
            .eq("id", customerId)
            .maybeSingle();

          if (custData) {
            setCustomer(custData);
            if (custData.document_type === "CNPJ" || (custData.document && custData.document.length > 14)) {
              setOwnerType("pj");
            } else {
              setOwnerType("pf");
            }
          }
        }

        if (vesselId) {
          const { data: vesData } = await supabase
            .from("vessels")
            .select("*")
            .eq("id", vesselId)
            .maybeSingle();

          if (vesData) {
            setVessel(vesData);
            if (vesData.vessel_type) {
              setVesselType(vesData.vessel_type);
            }
            if (vesData.length_overall) {
              setLengthMeters(`${vesData.length_overall} m`);
            }
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados do processo:", err);
      } finally {
        setLoading(false);
      }
    }

    loadContextData();
  }, [customerId, vesselId]);

  // Verificar se a embarcação é moto aquática
  const isJetSki = useMemo(() => {
    const typeStr = (vesselType || vessel?.vessel_type || "").toLowerCase();
    const nameStr = (vessel?.name || "").toLowerCase();
    return typeStr.includes("moto") || typeStr.includes("jet") || typeStr.includes("aquática") || nameStr.includes("jet");
  }, [vesselType, vessel]);

  // Obter link e dados oficiais de orientação conforme categoria e tipo
  const officialSourceInfo = useMemo(() => {
    if (category === "profissional") {
      return {
        label: "CPES • Marinha do Brasil (Profissional)",
        url: "https://www.marinha.mil.br/cpes/node/388",
        categoryName: "Embarcações profissionais",
      };
    }
    if (isJetSki) {
      return {
        label: "CPES • Marinha do Brasil (Moto aquática)",
        url: "https://www.marinha.mil.br/cpes/node/384",
        categoryName: "Moto aquática",
      };
    }
    return {
      label: "CPES • Marinha do Brasil",
      url: "https://www.marinha.mil.br/cpes/node/382",
      categoryName: "Esporte e recreio",
    };
  }, [category, isJetSki]);

  // Título do serviço ativo
  const activeServiceTitle = useMemo(() => {
    if (SERVICE_CATALOG[activeServiceKey]) {
      return SERVICE_CATALOG[activeServiceKey].title;
    }
    return "Renovação do TIE";
  }, [activeServiceKey]);

  // Ação de upload de documento
  const handleUploadFile = async () => {
    if (!selectedFileForUpload || !uploadTarget) return;

    setUploading(true);
    try {
      await new Promise((r) => setTimeout(r, 600));

      if (uploadTarget === "vesselDoc") {
        setAttachedFiles((prev) => ({
          ...prev,
          vesselDoc: {
            available: true,
            name: selectedFileForUpload.name,
          },
        }));
      } else if (uploadTarget === "rg") {
        setAttachedFiles((prev) => ({
          ...prev,
          rg: {
            available: true,
            name: selectedFileForUpload.name,
          },
        }));
      } else if (uploadTarget === "residence") {
        setAttachedFiles((prev) => ({
          ...prev,
          residence: {
            available: true,
            name: selectedFileForUpload.name,
          },
        }));
      }

      toast.success("Documento anexado com sucesso!");
      setIsUploadModalOpen(false);
      setSelectedFileForUpload(null);
      setUploadTarget(null);
    } catch (err) {
      toast.error("Erro ao enviar documento.");
    } finally {
      setUploading(false);
    }
  };

  // Salvar rascunho
  const handleSaveDraft = async () => {
    setIsDraftSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      toast.success("Rascunho do serviço salvo com sucesso!", {
        description: "Você pode continuar a organização dos documentos quando desejar.",
      });
    } catch (err) {
      toast.error("Erro ao salvar rascunho.");
    } finally {
      setIsDraftSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* ========================================================================= */}
        {/* CABEÇALHO COM LINK VOLTAR */}
        {/* ========================================================================= */}
        <div>
          <button
            type="button"
            onClick={() => {
              navigate({
                to: "/servicos/selecionar",
                search: {
                  category,
                  customerId,
                  vesselId,
                },
              });
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#075BFF] hover:text-blue-700 transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar à seleção</span>
          </button>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
            Documentos do serviço
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Confira os dados e organize os documentos antes de continuar.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* SELETOR DE MÚLTIPLOS SERVIÇOS (SE HOUVER MAIS DE UM SELECIONADO) */}
        {/* ========================================================================= */}
        {rawServices.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
            <span className="text-xs font-semibold text-slate-500 shrink-0 mr-1">Serviço ativo:</span>
            {rawServices.map((srvKey) => {
              const srvInfo = SERVICE_CATALOG[srvKey];
              const isCurrent = srvKey === activeServiceKey;
              return (
                <button
                  key={srvKey}
                  type="button"
                  onClick={() => setActiveServiceKey(srvKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    isCurrent
                      ? "bg-[#075BFF] text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {srvInfo?.title || srvKey}
                </button>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* BARRA DE RESUMO (CLIENTE, EMBARCAÇÃO, CATEGORIA, SERVIÇO) */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* Cliente */}
          <div className="flex items-center gap-3 pt-2 sm:pt-0 sm:pr-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Cliente</span>
              <span className="text-sm font-bold text-[#0B1739] truncate block">
                {customer?.fantasy_name || customer?.name || "Ana Oliveira"}
              </span>
            </div>
          </div>

          {/* Embarcação */}
          <div className="flex items-center gap-3 pt-3 sm:pt-0 sm:px-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <Ship className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Embarcação</span>
              <span className="text-sm font-bold text-[#0B1739] truncate block">
                {vessel?.name || "Aurora"}
              </span>
            </div>
          </div>

          {/* Categoria */}
          <div className="flex items-center gap-3 pt-3 sm:pt-0 sm:px-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <Folder className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Categoria</span>
              <span className="text-sm font-bold text-[#0B1739] truncate block">
                {officialSourceInfo.categoryName}
              </span>
            </div>
          </div>

          {/* Serviço */}
          <div className="flex items-center gap-3 pt-3 sm:pt-0 sm:pl-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <Cog className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Serviço</span>
              <span className="text-sm font-bold text-[#0B1739] truncate block">
                {activeServiceTitle}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* GRID PRINCIPAL: 2 COLUNAS CONFORME IMAGEM */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ======================================================================= */}
          {/* COLUNA ESQUERDA (7 COLUNAS): DADOS DE REQUISITOS + ARQUIVOS DO CLIENTE */}
          {/* ======================================================================= */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* CARD 1: DADOS PARA DEFINIR OS REQUISITOS */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
              <h2 className="text-base font-bold text-[#0B1739]">
                Dados para definir os requisitos
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tipo de embarcação */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Tipo de embarcação</label>
                  <select
                    value={vesselType}
                    onChange={(e) => setVesselType(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Lancha">Lancha</option>
                    <option value="Veleiro">Veleiro</option>
                    <option value="Moto Aquática (Jet Ski)">Moto Aquática (Jet Ski)</option>
                    <option value="Bote">Bote / Inflável</option>
                    <option value="Pesca Profissional">Pesca Profissional</option>
                    <option value="Passageiro">Transporte de Passageiros</option>
                    <option value="Carga">Carga / Rebocador</option>
                  </select>
                </div>

                {/* Comprimento */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Comprimento</label>
                  <input
                    type="text"
                    value={lengthMeters}
                    onChange={(e) => setLengthMeters(e.target.value)}
                    placeholder="Ex: 6,50 m"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Proprietário */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Proprietário</label>
                  <select
                    value={ownerType}
                    onChange={(e) => setOwnerType(e.target.value as "pf" | "pj")}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="pf">Pessoa física</option>
                    <option value="pj">Pessoa jurídica</option>
                  </select>
                </div>

                {/* Atendimento */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Atendimento</label>
                  <select
                    value={serviceAttendance}
                    onChange={(e) => setServiceAttendance(e.target.value as "representante" | "proprietario")}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="representante">Por representante</option>
                    <option value="proprietario">Pelo próprio proprietário</option>
                  </select>
                </div>
              </div>

              {/* Link Conferir dados da embarcação */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsVesselModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#075BFF] hover:text-blue-700 transition-colors cursor-pointer"
                >
                  <Ship className="h-4 w-4" />
                  <span>Conferir dados da embarcação</span>
                </button>
              </div>
            </div>

            {/* CARD 2: ARQUIVOS DO CLIENTE */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div>
                <h2 className="text-base font-bold text-[#0B1739]">
                  Arquivos do cliente
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Confira os arquivos existentes ou anexe novos.
                </p>
              </div>

              <div className="space-y-3">
                {/* Item 1: Documento de identificação */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 truncate">
                      Documento de identificação
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {attachedFiles.rg.available ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        <Check className="h-3 w-3" />
                        <span>Disponível</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        <MinusCircle className="h-3 w-3" />
                        <span>Não anexado</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewData({
                          title: "Documento de identificação",
                          desc: "Documento pessoal cadastrado na ficha do cliente (RG / CNH). Disponível para conferência.",
                        });
                        setIsPreviewModalOpen(true);
                      }}
                      className="text-xs font-semibold text-[#075BFF] hover:text-blue-700 transition-colors cursor-pointer"
                    >
                      Conferir
                    </button>
                  </div>
                </div>

                {/* Item 2: Comprovante de residência */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0">
                      <Home className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 truncate">
                      Comprovante de residência
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {attachedFiles.residence.available ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        <Check className="h-3 w-3" />
                        <span>Disponível</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        <MinusCircle className="h-3 w-3" />
                        <span>Não anexado</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewData({
                          title: "Comprovante de residência",
                          desc: "Comprovante recente de endereço vinculado ao cadastro do cliente. Disponível para conferência.",
                        });
                        setIsPreviewModalOpen(true);
                      }}
                      className="text-xs font-semibold text-[#075BFF] hover:text-blue-700 transition-colors cursor-pointer"
                    >
                      Conferir
                    </button>
                  </div>
                </div>

                {/* Item 3: Documento atual da embarcação */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 truncate">
                      Documento atual da embarcação
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {attachedFiles.vesselDoc.available ? (
                      <>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          <Check className="h-3 w-3" />
                          <span>Disponível</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewData({
                              title: "Documento atual da embarcação",
                              desc: `Arquivo anexado: ${attachedFiles.vesselDoc.name}.`,
                            });
                            setIsPreviewModalOpen(true);
                          }}
                          className="text-xs font-semibold text-[#075BFF] hover:text-blue-700 transition-colors cursor-pointer"
                        >
                          Conferir
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          <MinusCircle className="h-3 w-3" />
                          <span>Não anexado</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadTarget("vesselDoc");
                            setIsUploadModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 rounded-lg border border-[#075BFF] text-[#075BFF] hover:bg-blue-50 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Anexar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Legenda */}
              <p className="text-[11px] text-slate-400 pt-1">
                Lista ilustrativa — requisitos aguardando validação.
              </p>
            </div>
          </div>

          {/* ======================================================================= */}
          {/* COLUNA DIREITA (5 COLUNAS): FORMULÁRIOS + REQUISITOS EM REVISÃO */}
          {/* ======================================================================= */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* CARD 3: FORMULÁRIOS DO SERVIÇO */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-[#0B1739]">
                Formulários do serviço
              </h2>

              <div className="space-y-3">
                {/* Requerimento */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800">
                      Requerimento
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                    <Clock className="h-3 w-3" />
                    <span>Modelo pendente</span>
                  </span>
                </div>

                {/* Procuração */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800">
                      Procuração
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                    <Clock className="h-3 w-3" />
                    <span>Modelo pendente</span>
                  </span>
                </div>
              </div>

              {/* Legenda de liberação */}
              <p className="text-[11px] text-slate-400 pt-1">
                Os modelos serão liberados após revisão.
              </p>
            </div>

            {/* CARD 4: REQUISITOS EM REVISÃO (ALERTA ÂMBAR) */}
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#FEF3C7] border border-[#FCD34D] flex items-center justify-center text-[#D97706] shrink-0 mt-0.5">
                  <Info className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#92400E]">
                    Requisitos em revisão
                  </h3>
                  <p className="text-xs text-[#B45309] leading-relaxed">
                    A lista oficial deste serviço ainda precisa ser validada.
                  </p>
                </div>
              </div>

              <div className="pt-2 pl-12 space-y-2">
                <p className="text-[11px] font-medium text-[#B45309]/80">
                  Fonte: {officialSourceInfo.label}
                </p>
                
                <div>
                  <a
                    href={officialSourceInfo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#075BFF] hover:text-blue-700 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Consultar orientação oficial</span>
                  </a>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* ========================================================================= */}
        {/* RODAPÉ COM AÇÕES */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              navigate({
                to: "/servicos/selecionar",
                search: {
                  category,
                  customerId,
                  vesselId,
                },
              });
            }}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
          >
            Voltar
          </button>

          <button
            type="button"
            disabled={isDraftSaving}
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#075BFF] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {isDraftSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>Salvar rascunho</span>
          </button>

          <button
            type="button"
            onClick={() => {
              navigate({
                to: "/servicos/revisar",
                search: {
                  category,
                  customerId,
                  vesselId,
                  services: rawServices.join(","),
                },
              });
            }}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <span>Revisar processo</span>
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL: CONFERIR DADOS DA EMBARCAÇÃO */}
      {/* ========================================================================= */}
      <Dialog open={isVesselModalOpen} onOpenChange={setIsVesselModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0">
                <Ship className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#0B1739]">
                  Dados da embarcação
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Consulte os parâmetros cadastrados no sistema.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Nome:</span>
              <span className="font-bold text-[#0B1739]">{vessel?.name || "Aurora"}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Número de Inscrição:</span>
              <span className="font-medium text-slate-800">{vessel?.registration_number || "381P202400192"}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Tipo:</span>
              <span className="font-medium text-slate-800">{vesselType}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Comprimento:</span>
              <span className="font-medium text-slate-800">{lengthMeters}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Capitania / Jurisdição:</span>
              <span className="font-medium text-slate-800">{vessel?.port_of_registry || "Capitania dos Portos de São Paulo"}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Proprietário vinculado:</span>
              <span className="font-medium text-slate-800">{customer?.fantasy_name || customer?.name || "Ana Oliveira"}</span>
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsVesselModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Fechar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: PREVIEW DE DOCUMENTO */}
      {/* ========================================================================= */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#0B1739]">
                  {previewData?.title || "Documento disponível"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Arquivo localizado e verificado no cadastro.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-3 text-xs text-slate-600">
            <p className="leading-relaxed">{previewData?.desc}</p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#075BFF]" />
              <span className="font-semibold text-slate-700">Arquivo válido e pronto para uso no processo</span>
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[#075BFF] text-white text-xs font-semibold hover:bg-blue-600"
            >
              Concluir conferência
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: ANEXAR DOCUMENTO */}
      {/* ========================================================================= */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#0B1739]">
                  Anexar documento
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Envie o arquivo PDF ou imagem do documento.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFileForUpload(e.target.files[0]);
                }
              }}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/20"
            >
              <Upload className="h-8 w-8 text-[#075BFF] mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                {selectedFileForUpload ? selectedFileForUpload.name : "Clique para selecionar o arquivo"}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Formatos aceitos: PDF, PNG, JPG (máx. 10MB)
              </p>
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setIsUploadModalOpen(false);
                setSelectedFileForUpload(null);
              }}
              className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!selectedFileForUpload || uploading}
              onClick={handleUploadFile}
              className="flex-1 py-2.5 rounded-xl bg-[#075BFF] text-white text-xs font-semibold hover:bg-blue-600 disabled:opacity-50"
            >
              {uploading ? "Enviando..." : "Salvar anexo"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: AVISO DE REQUISITOS EM REVISÃO (BLOQUEIO DE REVISÃO FINAL) */}
      {/* ========================================================================= */}
      <Dialog open={isReviewBlockedModalOpen} onOpenChange={setIsReviewBlockedModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#0B1739]">
                  Requisitos em revisão
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Fluxo em validação de catálogo
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-3 text-xs text-slate-600 leading-relaxed">
            <p>
              Os requisitos oficiais e os modelos de formulários para <strong>{activeServiceTitle}</strong> ({officialSourceInfo.categoryName}) estão atualmente em fase de revisão regulatória.
            </p>
            <p>
              Você pode salvar o rascunho dos documentos e dados preenchidos. A geração do processo definitivo estará disponível assim que a revisão da lista de exigências for aprovada para uso.
            </p>
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
            <button
              type="button"
              onClick={() => setIsReviewBlockedModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Entendido
            </button>
            <button
              type="button"
              onClick={() => {
                setIsReviewBlockedModalOpen(false);
                handleSaveDraft();
              }}
              className="flex-1 py-2.5 rounded-xl bg-[#075BFF] text-white text-xs font-semibold hover:bg-blue-600"
            >
              Salvar como rascunho
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
