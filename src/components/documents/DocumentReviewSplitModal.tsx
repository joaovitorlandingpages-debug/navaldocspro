import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  RefreshCcw, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Eye, 
  Sparkles, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  Info,
  Maximize2
} from "lucide-react";
import { 
  ExtractedDocumentReview, 
  ExtractedFieldDetail, 
  DOCUMENT_TYPE_LABELS 
} from "@/services/ocr/documentOcrTypes";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  review: ExtractedDocumentReview | null;
  onConfirm: (confirmedFields: Record<string, string>, review: ExtractedDocumentReview) => void;
}

export function DocumentReviewSplitModal({ isOpen, onClose, review, onConfirm }: Props) {
  if (!review) return null;

  // Estados locais para edição dos campos na conferência
  const [fields, setFields] = useState<Record<string, ExtractedFieldDetail>>({});
  const [mobileTab, setMobileTab] = useState<"document" | "fields">("fields");
  const [previewError, setPreviewError] = useState(false);
  
  // Controles do visualizador de documento
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // URL de prévia local e segura: prioriza blob do arquivo em memória para garantir render 100% livre de erros 404
  const previewSource = useMemo(() => {
    if (review.file instanceof File) {
      try {
        return URL.createObjectURL(review.file);
      } catch {
        // ignora e usa fileUrl
      }
    }
    return review.fileUrl;
  }, [review.file, review.fileUrl]);

  // Sincroniza campos quando review for atualizado
  useEffect(() => {
    if (review) {
      setFields({ ...review.fields });
      setZoom(1);
      setRotation(0);
      setMobileTab("fields");
      setPreviewError(false);
    }
  }, [review]);

  // Manipulador de edição de campo
  const handleFieldChange = (key: string, newValue: string) => {
    setFields((prev) => {
      const current = prev[key];
      if (!current) return prev;
      return {
        ...prev,
        [key]: {
          ...current,
          value: newValue,
          status: newValue !== current.originalValue ? "manual" : current.status,
          doubtReason: undefined, // remove dúvida ao editar
        },
      };
    });
  };

  // Contadores analíticos
  const stats = useMemo(() => {
    const list = Object.values(fields);
    const filled = list.filter((f) => f.value.trim().length > 0);
    const doubts = list.filter((f) => f.status === "doubt");
    const divergent = list.filter((f) => f.status === "divergent");
    const high = list.filter((f) => f.status === "high_confidence");
    const edited = list.filter((f) => f.status === "manual");
    return {
      total: list.length,
      filledCount: filled.length,
      doubtsCount: doubts.length,
      divergentCount: divergent.length,
      highCount: high.length,
      editedCount: edited.length,
    };
  }, [fields]);

  // Rotação da imagem em passos de 90°
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Zoom
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetView = () => {
    setZoom(1);
    setRotation(0);
  };

  // Submissão da conferência obrigatória
  const handleConfirmAndApply = () => {
    const result: Record<string, string> = {};
    let accepted = 0;
    let edited = 0;
    let manual = 0;

    Object.entries(fields).forEach(([k, f]) => {
      result[k] = f.value;
      if (f.status === "manual") edited++;
      else if (f.value.trim().length > 0) accepted++;
      else manual++;
    });

    const updatedReview: ExtractedDocumentReview = {
      ...review,
      fields,
      audit: {
        acceptedCount: accepted,
        editedCount: edited,
        manualCount: manual,
        reviewedAt: new Date().toISOString(),
      },
    };

    toast.success("Dados conferidos e aplicados com sucesso!", {
      description: `${accepted} campos extraídos aceitos e ${edited} ajustados manualmente.`
    });

    onConfirm(result, updatedReview);
    onClose();
  };

  const isPdf = review.fileType.includes("pdf") || review.fileName.toLowerCase().endsWith(".pdf");
  const typeMeta = DOCUMENT_TYPE_LABELS[review.documentType] || DOCUMENT_TYPE_LABELS.GENERIC;

  // Agrupamento por seções
  const groupedFields = useMemo(() => {
    const groups: Record<string, ExtractedFieldDetail[]> = {
      identificacao: [],
      contato_endereco: [],
      nautico: [],
      propulsao: [],
      outros: [],
    };
    Object.values(fields).forEach((f) => {
      const sec = f.section || "outros";
      if (!groups[sec]) groups[sec] = [];
      groups[sec].push(f);
    });
    return groups;
  }, [fields]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="w-full max-w-6xl h-[100dvh] max-h-[100dvh] sm:h-[90vh] sm:max-h-[90vh] sm:w-[96vw] flex flex-col p-0 gap-0 bg-slate-50 rounded-none sm:rounded-2xl overflow-hidden shadow-2xl border-0 sm:border border-slate-200"
      >
        
        {/* ========================================================================= */}
        {/* 1. CABEÇALHO DO MODAL COM IDENTIFICAÇÃO DO TIPO E ALERTA OBRIGATÓRIO */}
        {/* ========================================================================= */}
        <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 sm:py-4 pr-12 sm:pr-6 flex flex-col gap-2 shrink-0 z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm sm:text-lg text-[#0B1739] leading-tight">
                  Conferência de Leitura Automática
                </span>
                <Badge className={`${typeMeta.badgeColor} border text-[10px] sm:text-[11px] font-bold px-2 py-0.5`}>
                  {typeMeta.label}
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                Arquivo: <strong className="text-slate-700">{review.fileName}</strong> ({((review.fileSize || 0) / 1024).toFixed(1)} KB)
              </p>
            </div>

            {/* Badges de estatística de extração */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {stats.filledCount > 0 ? (
                <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {stats.filledCount} campos identificados
                </span>
              ) : (
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Nenhum campo extraído automaticamente
                </span>
              )}
              {stats.doubtsCount > 0 && (
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {stats.doubtsCount} conferir
                </span>
              )}
              {stats.divergentCount > 0 && (
                <span className="text-[10px] sm:text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {stats.divergentCount} divergentes
                </span>
              )}
            </div>
          </div>

          {/* STATUS DE EXTRAÇÃO: banners diferenciados por tipo de resultado */}
          {stats.filledCount === 0 ? (
            <div className="bg-orange-50/90 border border-orange-200 rounded-xl p-2.5 sm:p-3 flex items-start gap-2 text-[11px] sm:text-xs text-orange-900 shadow-2xs">
              <AlertCircle className="h-3.5 w-3.5 text-orange-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">
                <strong>Não foi possível identificar os dados automaticamente.</strong>{" "}
                Preencha os campos manualmente ao lado antes de aplicar ao cadastro.
              </div>
            </div>
          ) : (
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2 sm:p-2.5 flex items-start gap-2 text-[11px] sm:text-xs text-amber-900 shadow-2xs">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">
              <strong>Atenção:</strong> A leitura automática pode cometer erros. Confira todos os dados antes de salvar ou gerar documentos.
            </div>
          </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 2. BARRA DE ALTERNÂNCIA MOBILE (DOCUMENTO VS CAMPOS) */}
        {/* ========================================================================= */}
        <div className="flex lg:hidden bg-slate-100 border-b border-slate-200 p-1 shrink-0">
          <button
            onClick={() => setMobileTab("document")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mobileTab === "document" ? "bg-white text-[#075BFF] shadow-xs" : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <Eye className="h-3.5 w-3.5" /> Ver Documento Original
          </button>
          <button
            onClick={() => setMobileTab("fields")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mobileTab === "fields" ? "bg-white text-[#075BFF] shadow-xs" : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" /> Conferir Campos ({stats.filledCount})
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 3. CORPO PRINCIPAL COM DIVISÃO LADO A LADO NO DESKTOP */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 relative">
          
          {/* PAINEL ESQUERDO: VISUALIZADOR DE DOCUMENTO */}
          <div className={`w-full lg:w-1/2 bg-slate-900 flex flex-col border-r border-slate-200 overflow-hidden ${
            mobileTab === "document" ? "flex" : "hidden lg:flex"
          }`}>
            {/* Barra de Ferramentas de Zoom e Rotação */}
            <div className="bg-slate-800/90 text-white px-4 py-2 flex items-center justify-between text-xs border-b border-slate-700 shrink-0">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-400" /> Prévia do Documento
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleRotate}
                  className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Girar 90 graus"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Diminuir Zoom"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-[11px] font-mono text-slate-400 w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleResetView}
                  className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-[10px] font-bold"
                  title="Redefinir visualização"
                >
                  Reset
                </button>
                <a
                  href={review.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors ml-1"
                  title="Abrir arquivo em nova aba"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Área de Visualização com suporte a Zoom, Rotação e Tratamento Amigável de Erros */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/60 pb-[calc(160px+env(safe-area-inset-bottom,0px))] sm:pb-4 overscroll-contain">
              {previewError ? (
                <div className="max-w-md p-6 bg-slate-900 border border-slate-700 rounded-2xl text-center text-slate-300 space-y-3 shadow-xl">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-blue-400">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Documento pronto para conferência</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    O arquivo <strong className="text-slate-200">{review.fileName}</strong> foi processado. Se a prévia visual integrada estiver bloqueada pelo navegador, confira os campos extraídos no formulário ao lado.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-600 text-slate-200 hover:bg-slate-800 text-xs"
                      onClick={() => setPreviewError(false)}
                    >
                      Tentar recarregar
                    </Button>
                    <a
                      href={previewSource}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Abrir arquivo
                    </a>
                  </div>
                </div>
              ) : isPdf ? (
                <iframe
                  src={`${previewSource}#toolbar=0&navpanes=0`}
                  title="Documento PDF"
                  onError={() => setPreviewError(true)}
                  className="w-full h-full rounded-lg bg-white shadow-lg border border-slate-700"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: "center center",
                    transition: "transform 0.2s ease-out",
                  }}
                />
              ) : (
                <img
                  src={previewSource}
                  alt="Documento escaneado"
                  onError={() => setPreviewError(true)}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: "center center",
                    transition: "transform 0.2s ease-out",
                  }}
                />
              )}
            </div>
          </div>

          {/* PAINEL DIREITO: CONFERÊNCIA DOS CAMPOS EXTRAÍDOS */}
          <div className={`w-full lg:w-1/2 bg-white flex flex-col overflow-y-auto overscroll-contain ${
            mobileTab === "fields" ? "flex" : "hidden lg:flex"
          }`}>
            <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-5 pb-[calc(150px+env(safe-area-inset-bottom,0px))] sm:pb-8">

              {/* Bloco de Divergências Encontradas (se houver) */}
              {review.discrepancies.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                    <span>Divergências detectadas com os dados já salvos no sistema:</span>
                  </div>
                  <ul className="space-y-1.5 pl-6 text-xs text-rose-700 list-disc">
                    {review.discrepancies.map((d, i) => (
                      <li key={i}>
                        <strong>{d.label}:</strong> O documento traz <u>"{d.extractedValue}"</u> enquanto o cadastro possui <u>"{d.existingValue}"</u>.
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-rose-600 font-medium pt-1">
                    Os dados anteriores NÃO serão sobrescritos sem a sua confirmação explícita.
                  </p>
                </div>
              )}

              {/* Seções de Campos */}
              {Object.entries(groupedFields).map(([sectionKey, fieldList]) => {
                if (fieldList.length === 0) return null;

                const sectionTitle = 
                  sectionKey === "identificacao" ? "1. Dados de Identificação" :
                  sectionKey === "contato_endereco" ? "2. Contato e Endereço" :
                  sectionKey === "nautico" ? "1. Características Náuticas" :
                  sectionKey === "propulsao" ? "2. Propulsão e Motores" : "Outros Dados";

                return (
                  <div key={sectionKey} className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                      {sectionTitle}
                    </h3>

                    <div className="space-y-3.5">
                      {fieldList.map((f) => {
                        const isDoubt = f.status === "doubt";
                        const isDivergent = f.status === "divergent";
                        const isHigh = f.status === "high_confidence";
                        const isManual = f.status === "manual";
                        const isNotFound = f.status === "not_found";

                        return (
                          <div 
                            key={f.key} 
                            className={`p-3.5 rounded-xl border transition-all ${
                              isDoubt ? "bg-amber-50/40 border-amber-200" :
                              isDivergent ? "bg-rose-50/40 border-rose-200" :
                              isManual ? "bg-blue-50/30 border-blue-200" :
                              isHigh ? "bg-slate-50/50 border-slate-200" :
                              "bg-slate-50/20 border-slate-200/80"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <Label htmlFor={`input-${f.key}`} className="text-xs font-bold text-[#0B1739] flex items-center gap-1.5">
                                <span>{f.label}</span>
                                {f.isRequired && <span className="text-rose-500 font-bold">*</span>}
                              </Label>

                              {/* Badge de Confiança / Status */}
                              {isHigh && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Alta certeza
                                </span>
                              )}
                              {isDoubt && (
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" /> Conferir
                                </span>
                              )}
                              {isDivergent && (
                                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-300 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" /> Divergente
                                </span>
                              )}
                              {isManual && (
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                                  ✏️ Editado
                                </span>
                              )}
                              {isNotFound && (
                                <span className="text-[10px] font-medium text-slate-400">
                                  Não identificado
                                </span>
                              )}
                            </div>

                            {/* Campo de Entrada com Edição Imediata */}
                            <Input
                              id={`input-${f.key}`}
                              value={f.value}
                              onChange={(e) => handleFieldChange(f.key, e.target.value)}
                              placeholder={isNotFound ? "Não identificado no documento — preencha se possuir" : ""}
                              className={`h-9 text-xs sm:text-sm bg-white font-medium rounded-lg ${
                                isDoubt ? "border-amber-300 focus-visible:ring-amber-200" :
                                isDivergent ? "border-rose-300 focus-visible:ring-rose-200" :
                                "border-slate-200"
                              }`}
                            />

                            {/* Explicação de Dúvida (se houver) */}
                            {f.doubtReason && (
                              <p className="text-[11px] text-amber-700 font-medium mt-1 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 shrink-0" /> {f.doubtReason}
                              </p>
                            )}

                            {/* Trecho / Origem no Documento */}
                            {f.sourceExcerpt && (
                              <p className="text-[10px] text-slate-400 font-mono mt-1 truncate" title={f.sourceExcerpt}>
                                Trecho: "{f.sourceExcerpt}"
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
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. RODAPÉ COM AÇÕES EXPLÍCITAS E REGISTRO DE AUDITORIA */}
        {/* ========================================================================= */}
        <div 
          className="bg-white border-t border-slate-200 px-4 sm:px-6 pt-3 sm:pt-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-30 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4"
          style={{
            paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))",
          }}
        >
          <div className="text-[11px] sm:text-xs text-slate-500 font-medium text-center sm:text-left leading-tight hidden xs:block sm:block">
            Revise os dados conferidos antes de aplicar ao cadastro oficial.
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              onPointerDown={() => {
                (document.activeElement as HTMLElement)?.blur?.();
              }}
              className="w-full sm:w-auto min-h-[42px] px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border-slate-300 hover:bg-slate-100 text-slate-700 bg-white shadow-2xs whitespace-normal text-center cursor-pointer order-2 sm:order-1"
            >
              <span>Preencher manualmente</span>
            </Button>

            <Button
              type="button"
              onClick={handleConfirmAndApply}
              onPointerDown={() => {
                (document.activeElement as HTMLElement)?.blur?.();
              }}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white gap-2 shadow-sm whitespace-normal text-center cursor-pointer order-1 sm:order-2"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Confirmar e aplicar ao cadastro</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
