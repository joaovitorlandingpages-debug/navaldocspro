import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  ArrowLeft, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Sparkles, 
  Check, 
  ExternalLink, 
  HelpCircle,
  Eye,
  X,
  Loader2,
  Ship,
  User,
  Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  ExtractedDocumentReview, 
  DOCUMENT_TYPE_LABELS,
  ExtractedFieldDetail
} from "@/services/ocr/documentOcrTypes";
import { 
  loadReviewSessionWithFallback, 
  ReviewSessionData 
} from "@/services/ocr/reviewSessionStorage";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/documentos/revisar/$id")({
  component: DocumentoRevisarPage,
});

function DocumentoRevisarPage() {
  const { id } = useParams({ from: "/documentos/revisar/$id" });
  const navigate = useNavigate();
  const { companyId } = useAuth();

  const [sessionData, setSessionData] = useState<ReviewSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Valores dos campos editáveis pelo usuário
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Controles do visualizador de documento
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [previewError, setPreviewError] = useState(false);

  // Modal de visualização ampliada do documento no celular
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);

  // Carrega a sessão de revisão
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const session = await loadReviewSessionWithFallback(id, companyId);
        if (!isMounted) return;

        if (session && session.review) {
          setSessionData(session);
          // Inicializa campos editáveis
          const initialValues: Record<string, string> = {};
          Object.entries(session.review.fields || {}).forEach(([key, detail]) => {
            initialValues[key] = detail.value || "";
          });
          setFieldValues(initialValues);
        } else {
          setLoadError("Sessão de conferência não encontrada ou expirada.");
        }
      } catch (err: any) {
        if (!isMounted) return;
        setLoadError(err?.message || "Erro ao carregar os dados de conferência.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const review = sessionData?.review;
  const isVessel = sessionData?.targetEntity === "vessel";

  // Identificação do tipo de documento
  const typeMeta = useMemo(() => {
    if (!review) return { label: "Documento Náutico", badgeColor: "bg-blue-50 text-[#075BFF] border-blue-200" };
    return DOCUMENT_TYPE_LABELS[review.documentType] || {
      label: review.documentTypeLabel || "Documento Geral",
      category: review.category || "vessel",
      badgeColor: isVessel ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-blue-50 text-[#075BFF] border-blue-200",
    };
  }, [review, isVessel]);

  // Estatísticas de extração
  const stats = useMemo(() => {
    if (!review || !review.fields) return { total: 0, filledCount: 0, doubtsCount: 0, divergentCount: 0 };
    const fieldsList = Object.values(review.fields);
    return {
      total: fieldsList.length,
      filledCount: fieldsList.filter((f) => f.value && f.value.trim().length > 0).length,
      doubtsCount: fieldsList.filter((f) => f.confidence < 0.7 && f.confidence > 0).length,
      divergentCount: review.discrepancies?.length || 0,
    };
  }, [review]);

  // Agrupamento semântico dos campos
  const groupedFields = useMemo(() => {
    if (!review || !review.fields) return {};
    const groups: Record<string, Array<{ key: string; detail: ExtractedFieldDetail }>> = {};

    if (isVessel) {
      groups["1. Dados de Identificação da Embarcação"] = [];
      groups["2. Dimensões e Capacidade"] = [];
      groups["3. Propulsão e Motor"] = [];
      groups["4. Proprietário Indicado no Documento"] = [];
      groups["5. Outras Informações Extraídas"] = [];
    } else {
      groups["1. Identificação do Cliente"] = [];
      groups["2. Contato"] = [];
      groups["3. Endereço"] = [];
      groups["4. Outras Informações Extraídas"] = [];
    }

    Object.entries(review.fields).forEach(([key, detail]) => {
      if (isVessel) {
        if (["name", "registration_number", "vessel_type", "category", "construction_year", "hull_material"].includes(key)) {
          groups["1. Dados de Identificação da Embarcação"].push({ key, detail });
        } else if (["length", "boca", "pontal", "gross_tonnage", "capacity", "navigation_area"].includes(key)) {
          groups["2. Dimensões e Capacidade"].push({ key, detail });
        } else if (["engine_brand", "engine_power", "engine_serial_number", "engine_count"].includes(key)) {
          groups["3. Propulsão e Motor"].push({ key, detail });
        } else if (["identified_owner_name", "identified_owner_doc"].includes(key)) {
          groups["4. Proprietário Indicado no Documento"].push({ key, detail });
        } else {
          groups["5. Outras Informações Extraídas"].push({ key, detail });
        }
      } else {
        if (["name", "cpf_cnpj", "rg", "birth_date", "type"].includes(key)) {
          groups["1. Identificação do Cliente"].push({ key, detail });
        } else if (["email", "phone"].includes(key)) {
          groups["2. Contato"].push({ key, detail });
        } else if (["cep", "logradouro", "numero", "bairro", "cidade", "uf", "complemento"].includes(key)) {
          groups["3. Endereço"].push({ key, detail });
        } else {
          groups["4. Outras Informações Extraídas"].push({ key, detail });
        }
      }
    });

    return groups;
  }, [review, isVessel]);

  const handleFieldChange = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleResetView = () => {
    setZoom(1);
    setRotation(0);
  };

  const originUrl = sessionData?.originUrl || (isVessel ? "/vessels/novo" : "/customers/novo");

  // Ação de Voltar
  const handleBack = () => {
    navigate({ to: originUrl as any });
  };

  // Ação de Preencher Manualmente
  const handleFillManually = () => {
    if (!review) return;

    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.setItem(
        "ndp_review_result",
        JSON.stringify({
          manual: true,
          targetEntity: sessionData.targetEntity,
          file: {
            id: review.fileId || id,
            name: review.fileName,
            path: review.fileUrl,
            size: review.fileSize,
          },
        })
      );
    }

    toast.info("Documento mantido em anexo. Conclua o preenchimento manualmente.");
    navigate({ to: originUrl as any });
  };

  // Ação de Confirmar e Aplicar ao Cadastro
  const handleConfirmAndApply = () => {
    if (!review || isSubmitting) return;

    setIsSubmitting(true);

    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.setItem(
          "ndp_review_result",
          JSON.stringify({
            confirmed: true,
            targetEntity: sessionData.targetEntity,
            fields: fieldValues,
            file: {
              id: review.fileId || id,
              name: review.fileName,
              path: review.fileUrl,
              size: review.fileSize,
            },
          })
        );
      }

      toast.success("Dados conferidos e aplicados com sucesso!");
      navigate({ to: originUrl as any });
    } catch (err: any) {
      setIsSubmitting(false);
      toast.error("Falha ao transferir os dados para o cadastro.");
    }
  };

  const isPdf = review?.fileType?.includes("pdf") || review?.fileName?.toLowerCase().endsWith(".pdf");
  const previewSource = review?.fileUrl;

  // Renderizador de Estado de Carregamento
  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-blue-50 text-[#075BFF] flex items-center justify-center mb-4 animate-pulse">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-[#0B1739]">
          Carregando conferência do documento...
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Recuperando dados extraídos e integridade das informações para visualização completa.
        </p>
      </div>
    );
  }

  // Renderizador de Erro
  if (loadError || !review) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-[#0B1739]">
          Não foi possível carregar a conferência
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          {loadError || "Os dados do documento não estão disponíveis no momento."}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => navigate({ to: (isVessel ? "/vessels/novo" : "/customers/novo") as any })}
            className="bg-[#075BFF] hover:bg-blue-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
          >
            Retornar ao cadastro
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col w-full text-slate-900">
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO SUPERIOR (Fixo no topo em todas as resoluções) */}
      {/* ========================================================================= */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Botão Voltar + Título e Metadados */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              id="btn-back-to-form"
              onClick={handleBack}
              onPointerDown={() => (document.activeElement as HTMLElement)?.blur?.()}
              className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Voltar ao cadastro sem perder alterações"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Voltar</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-extrabold text-sm sm:text-lg text-[#0B1739] leading-tight truncate">
                  Conferência de leitura automática
                </h1>
                <Badge className={`${typeMeta.badgeColor} border text-[10px] sm:text-[11px] font-bold px-2 py-0.5 shrink-0`}>
                  {typeMeta.label}
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                Arquivo: <strong className="text-slate-700">{review.fileName}</strong> ({((review.fileSize || 0) / 1024).toFixed(1)} KB)
              </p>
            </div>
          </div>

          {/* Indicador de Entidade (Desktop) */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {isVessel ? (
              <span className="text-xs font-bold text-sky-800 bg-sky-50 border border-sky-200 px-3 py-1 rounded-xl flex items-center gap-1.5">
                <Ship className="h-3.5 w-3.5 text-sky-600" /> Cadastro de Embarcação
              </span>
            ) : (
              <span className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-[#075BFF]" /> Cadastro de Cliente
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. ESTRUTURA PRINCIPAL (Desktop: 2 colunas / Mobile: Página única natural) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto">
        
        {/* ========================================================================= */}
        {/* PAINEL ESQUERDO: VISUALIZADOR DE DOCUMENTO NO DESKTOP (lg:flex) */}
        {/* ========================================================================= */}
        <div className="hidden lg:flex lg:w-1/2 bg-slate-900 border-r border-slate-200 flex-col overflow-hidden sticky top-[57px] h-[calc(100dvh-57px)]">
          {/* Barra de Ferramentas de Zoom e Rotação */}
          <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between text-xs border-b border-slate-700 shrink-0">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-blue-400" /> Prévia do Documento Original
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRotate}
                className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Girar 90 graus"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Diminuir Zoom"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="text-[11px] font-mono text-slate-400 w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Aumentar Zoom"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetView}
                className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-[10px] font-bold cursor-pointer"
                title="Redefinir visualização"
              >
                Reset
              </button>
              {previewSource && (
                <a
                  href={previewSource}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors ml-1 cursor-pointer"
                  title="Abrir em nova aba"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Área de Visualização com Zoom */}
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/60 custom-scrollbar">
            {!previewSource || previewError ? (
              <div className="text-center p-8 text-slate-400 max-w-sm">
                <FileText className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                <p className="font-bold text-sm text-slate-300">Prévia indisponível</p>
                <p className="text-xs mt-1">O arquivo foi processado com sucesso. Você pode conferir os campos ao lado.</p>
              </div>
            ) : isPdf ? (
              <iframe
                src={`${previewSource}#toolbar=0&navpanes=0`}
                title="Documento Original"
                onError={() => setPreviewError(true)}
                className="w-full h-full rounded-xl bg-white shadow-xl border border-slate-700"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                  transition: "transform 0.2s ease-out",
                }}
              />
            ) : (
              <img
                src={previewSource}
                alt="Documento Original"
                onError={() => setPreviewError(true)}
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                  transition: "transform 0.2s ease-out",
                }}
              />
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PAINEL DIREITO / FLUXO MOBILE COMPLETO COM ROLAGEM NATURAL */}
        {/* ========================================================================= */}
        <div className="flex-1 w-full bg-white flex flex-col min-w-0">
          
          {/* Conteúdo Principal com Rolagem Natural */}
          <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 pb-[calc(140px+env(safe-area-inset-bottom,16px))]">
            
            {/* 1. CARD DE STATUS DA LEITURA */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">
                      Documento Identificado
                    </span>
                    <span className="text-sm font-extrabold text-[#0B1739]">
                      {typeMeta.label}
                    </span>
                  </div>
                </div>

                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl flex items-center gap-1.5 shrink-0">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                  {stats.filledCount} campos extraídos
                </span>
              </div>

              {/* Alerta de Conferência Obrigatória */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">
                  <strong>Atenção:</strong> A leitura automática pode cometer erros. Confira todos os dados antes de salvar ou gerar documentos. Todos os campos são editáveis.
                </div>
              </div>
            </div>

            {/* 2. SEÇÃO DOCUMENTO ORIGINAL NO CELULAR (Acesso Rápido / Ampliação) */}
            <div className="block lg:hidden bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold text-[#0B1739]">
                    Documento Original
                  </span>
                </div>
                <Button
                  type="button"
                  id="btn-view-original-doc"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMobilePreviewOpen(true)}
                  className="text-xs font-bold text-[#075BFF] border-blue-200 hover:bg-blue-50 rounded-xl gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Ver documento original</span>
                </Button>
              </div>

              {previewSource && !isPdf && (
                <div 
                  onClick={() => setIsMobilePreviewOpen(true)}
                  className="h-28 w-full bg-slate-900 rounded-xl overflow-hidden cursor-pointer relative group flex items-center justify-center border border-slate-200"
                >
                  <img
                    src={previewSource}
                    alt="Miniatura do documento"
                    className="h-full w-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-bold flex items-center gap-1 bg-black/60 px-3 py-1 rounded-lg">
                      <Maximize2 className="h-3.5 w-3.5" /> Ampliar visualização
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. DIVERGÊNCIAS DETECTADAS (Se houver) */}
            {review.discrepancies && review.discrepancies.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 space-y-2">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-xs sm:text-sm">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>Divergências detectadas com dados anteriores:</span>
                </div>
                <ul className="space-y-1.5 pl-6 text-xs text-rose-700 list-disc">
                  {review.discrepancies.map((d, i) => (
                    <li key={i}>
                      <strong>{d.label}:</strong> O documento traz <u>"{d.extractedValue}"</u> enquanto o sistema possuía <u>"{d.existingValue}"</u>.
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 4. SEÇÃO CAMPOS EXTRAÍDOS EM LARGURA TOTAL */}
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-2">
                <h2 className="text-sm sm:text-base font-extrabold text-[#0B1739]">
                  Campos extraídos para conferência
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Revise ou altere qualquer valor diretamente nos campos abaixo antes de aplicar.
                </p>
              </div>

              {Object.entries(groupedFields).map(([sectionTitle, fieldsList]) => {
                if (!fieldsList || fieldsList.length === 0) return null;

                return (
                  <div key={sectionTitle} className="space-y-3">
                    <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                      {sectionTitle}
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {fieldsList.map(({ key, detail }) => {
                        const val = fieldValues[key] !== undefined ? fieldValues[key] : (detail.value || "");
                        const isHighConfidence = detail.confidence >= 0.85;
                        const isDoubt = detail.confidence > 0 && detail.confidence < 0.7;

                        return (
                          <div
                            key={key}
                            className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                              isDoubt
                                ? "bg-amber-50/40 border-amber-200 shadow-xs"
                                : val
                                ? "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                                : "bg-slate-50/60 border-slate-200/80"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <label
                                htmlFor={`field-${key}`}
                                className="text-xs font-bold text-slate-700 leading-snug break-words flex-1"
                                title={detail.label}
                              >
                                {detail.label}
                              </label>

                              {val ? (
                                isHighConfidence ? (
                                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-1.5 py-0.5 shrink-0 flex items-center gap-1">
                                    <Check className="h-2.5 w-2.5" /> Alta certeza
                                  </Badge>
                                ) : isDoubt ? (
                                  <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-1.5 py-0.5 shrink-0 flex items-center gap-1">
                                    <HelpCircle className="h-2.5 w-2.5" /> Conferir
                                  </Badge>
                                ) : (
                                  <Badge className="bg-slate-100 text-slate-600 text-[10px] font-medium px-1.5 py-0.5 shrink-0">
                                    Identificado
                                  </Badge>
                                )
                              ) : (
                                <Badge className="bg-slate-100 text-slate-400 text-[10px] font-normal px-1.5 py-0.5 shrink-0">
                                  Não encontrado
                                </Badge>
                              )}
                            </div>

                            <input
                              type="text"
                              id={`field-${key}`}
                              name={key}
                              value={val}
                              onChange={(e) => handleFieldChange(key, e.target.value)}
                              placeholder={`Preencha ${detail.label.toLowerCase()}...`}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#075BFF] focus:ring-2 focus:ring-[#075BFF]/10 text-xs sm:text-sm font-semibold text-slate-900 bg-white placeholder:text-slate-400 placeholder:font-normal transition-all"
                            />

                            {detail.rawExcerpt && (
                              <p 
                                className="text-[10px] text-slate-400 mt-1.5 truncate"
                                title={`Texto detectado: "${detail.rawExcerpt}"`}
                              >
                                Trecho: <span className="font-mono text-slate-500">"{detail.rawExcerpt}"</span>
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </main>

          {/* ========================================================================= */}
          {/* 3. RODAPÉ DE AÇÕES (Fixo na parte inferior em todas as telas) */}
          {/* ========================================================================= */}
          <footer 
            className="sticky bottom-0 bg-white border-t border-slate-200 px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-30 shrink-0"
            style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))" }}
          >
            <div className="max-w-7xl mx-auto flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4">
              {/* Botão Secundário: Preencher Manualmente */}
              <Button
                type="button"
                id="btn-fill-manually"
                variant="outline"
                size="lg"
                disabled={isSubmitting}
                onClick={handleFillManually}
                onPointerDown={() => (document.activeElement as HTMLElement)?.blur?.()}
                className="w-full sm:w-auto min-h-[44px] px-5 py-3 text-xs sm:text-sm font-semibold rounded-xl border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer shadow-2xs whitespace-normal text-center"
              >
                Preencher manualmente
              </Button>

              {/* Botão Principal: Confirmar e Aplicar ao Cadastro */}
              <Button
                type="button"
                id="btn-confirm-and-apply"
                size="lg"
                disabled={isSubmitting}
                onClick={handleConfirmAndApply}
                onPointerDown={() => (document.activeElement as HTMLElement)?.blur?.()}
                className="w-full sm:w-auto min-h-[46px] px-6 py-3 text-xs sm:text-sm font-bold rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white gap-2 shadow-sm cursor-pointer whitespace-normal text-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>Aplicando ao cadastro...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Confirmar e aplicar ao cadastro</span>
                  </>
                )}
              </Button>
            </div>
          </footer>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL DE VISUALIZAÇÃO AMPLIADA DO DOCUMENTO ORIGINAL (Mobile) */}
      {/* ========================================================================= */}
      <Dialog open={isMobilePreviewOpen} onOpenChange={setIsMobilePreviewOpen}>
        <DialogContent className="w-full max-w-4xl h-[100dvh] max-h-[100dvh] p-0 flex flex-col bg-slate-950 text-white rounded-none border-0 overflow-hidden">
          <DialogHeader className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 pr-12">
            <div>
              <DialogTitle className="text-sm font-bold text-white flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-blue-400" /> Documento Original
              </DialogTitle>
              <DialogDescription className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                {review.fileName}
              </DialogDescription>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleRotate}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Girar"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Menos zoom"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Mais zoom"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleResetView}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition-colors"
              >
                Reset
              </button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/80 custom-scrollbar">
            {isPdf ? (
              <iframe
                src={`${previewSource}#toolbar=0&navpanes=0`}
                title="Documento Original Ampliado"
                className="w-full h-full rounded-lg bg-white"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                  transition: "transform 0.2s ease-out",
                }}
              />
            ) : (
              <img
                src={previewSource}
                alt="Documento Original Ampliado"
                className="max-w-full max-h-full object-contain rounded-lg"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                  transition: "transform 0.2s ease-out",
                }}
              />
            )}
          </div>

          <div className="bg-slate-900 p-3 border-t border-slate-800 flex justify-end shrink-0" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}>
            <Button
              type="button"
              onClick={() => setIsMobilePreviewOpen(false)}
              className="bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl px-5"
            >
              Fechar visualização
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
