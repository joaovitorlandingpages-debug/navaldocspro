import { useState, useEffect, useMemo } from "react";
import { ModalLayout } from "@/components/ui/ModalLayout";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  Check,
  FileText,
  Upload,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileCheck2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  resolveRequiredInputs,
  mergeExtractedData,
  type RequiredInput,
  type SourceCategory,
} from "@/services/automation/requiredInputsResolver";
import { DocumentAutoFiller } from "@/services/documentAutoFiller";

interface Template {
  id: string;
  name: string;
  category: string | null;
  base_content: string | null;
  process_type: string | null;
}

interface OCRExtraction {
  category: SourceCategory;
  fileName: string;
  status: "uploading" | "processing" | "done" | "failed";
  data?: any;
  jobId?: string;
}

interface FilledDoc {
  templateId: string;
  name: string;
  content: string;
  missingFields: string[];
}

const STEPS = ["Documentos Alvo", "Insumos Necessários", "Upload & OCR", "Revisão & Geração"];

export function AssembleProcessWizard({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { profile } = useAuth();
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [extractions, setExtractions] = useState<Record<SourceCategory, OCRExtraction | null>>(
    {} as any
  );
  const [filled, setFilled] = useState<FilledDoc[]>([]);
  const [generating, setGenerating] = useState(false);

  const selectedTemplates = useMemo(
    () => templates.filter((t) => selectedIds.has(t.id)),
    [templates, selectedIds]
  );

  const requiredInputs = useMemo(
    () => resolveRequiredInputs(selectedTemplates),
    [selectedTemplates]
  );

  // Load templates on first open
  useEffect(() => {
    if (!isOpen || !profile?.company_id || templates.length > 0) return;
    setLoadingTemplates(true);
    supabase
      .from("document_templates")
      .select("id,name,category,base_content,process_type")
      .eq("is_active", true)
      .or(`company_id.eq.${profile.company_id},company_id.is.null`)
      .order("category", { ascending: true })
      .then((res: { data: Template[] | null; error: { message: string } | null }) => {
        if (res.error) toast.error("Erro ao carregar templates: " + res.error.message);
        else setTemplates((res.data || []) as Template[]);
        setLoadingTemplates(false);
      });
  }, [isOpen, profile?.company_id]);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep(0);
        setSelectedIds(new Set());
        setExtractions({} as any);
        setFilled([]);
      }, 200);
    }
  }, [isOpen]);

  // Group templates by category for step 1
  const grouped = useMemo(() => {
    const g: Record<string, Template[]> = {};
    for (const t of templates) {
      const key = t.category || "Outros";
      if (!g[key]) g[key] = [];
      g[key].push(t);
    }
    return g;
  }, [templates]);

  const toggleTemplate = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFileUpload = async (
    category: SourceCategory,
    ocrType: string,
    file: File
  ) => {
    if (!profile?.company_id) return;
    const id = crypto.randomUUID();
    setExtractions((prev) => ({
      ...prev,
      [category]: { category, fileName: file.name, status: "uploading" },
    }));

    try {
      const path = `${profile.company_id}/assembly/${id}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("ocr-documents")
        .upload(path, file);
      if (upErr) throw upErr;

      const { data: fileRow, error: fileErr } = await supabase
        .from("uploaded_files")
        .insert({
          company_id: profile.company_id,
          file_name: file.name,
          file_url: path,
          category: "assembly",
          file_type: file.type,
          file_size: file.size,
          status: "pending",
        })
        .select()
        .single();
      if (fileErr) throw fileErr;

      const { data: job, error: jobErr } = await supabase
        .from("ocr_jobs")
        .insert({
          company_id: profile.company_id,
          uploaded_file_id: fileRow.id,
          status: "pending",
          document_type: ocrType,
        })
        .select()
        .single();
      if (jobErr) throw jobErr;

      setExtractions((prev) => ({
        ...prev,
        [category]: {
          category,
          fileName: file.name,
          status: "processing",
          jobId: job.id,
        },
      }));

      // Invoke OCR
      await supabase.functions.invoke("process-ocr-document", {
        body: { jobId: job.id },
      });

      // Poll for result
      const result = await pollJob(job.id);
      setExtractions((prev) => ({
        ...prev,
        [category]: {
          category,
          fileName: file.name,
          status: result.status === "completed" ? "done" : "failed",
          jobId: job.id,
          data: result.extracted_data,
        },
      }));

      if (result.status === "completed") {
        toast.success(`${file.name} processado`);
      } else {
        toast.error(`Falha ao processar ${file.name}`);
      }
    } catch (e: any) {
      setExtractions((prev) => ({
        ...prev,
        [category]: { category, fileName: file.name, status: "failed" },
      }));
      toast.error("Erro: " + e.message);
    }
  };

  const pollJob = async (jobId: string, maxTries = 30): Promise<any> => {
    for (let i = 0; i < maxTries; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const { data } = await supabase
        .from("ocr_jobs")
        .select("status,extracted_data")
        .eq("id", jobId)
        .single();
      if (data?.status === "completed" || data?.status === "failed") return data;
    }
    return { status: "failed", extracted_data: null };
  };

  // Build filled previews on entering step 3
  useEffect(() => {
    if (step !== 3) return;
    const merged = mergeExtractedData(
      Object.values(extractions)
        .filter((e): e is OCRExtraction => !!e && e.status === "done" && !!e.data)
        .map((e) => ({ category: e.category, data: e.data }))
    );
    const payload = {
      ...merged,
      engineer: { ...merged.engineer, name: merged.engineer?.name || profile?.name },
      current_date: new Date().toLocaleDateString("pt-BR"),
    };
    const result: FilledDoc[] = selectedTemplates.map((t) => {
      const content = DocumentAutoFiller.fill(t.base_content || "", payload);
      return {
        templateId: t.id,
        name: t.name,
        content,
        missingFields: DocumentAutoFiller.getMissingFields(content),
      };
    });
    setFilled(result);
  }, [step, extractions, selectedTemplates, profile?.name]);

  const updateFilledContent = (templateId: string, content: string) => {
    setFilled((prev) =>
      prev.map((f) =>
        f.templateId === templateId
          ? { ...f, content, missingFields: DocumentAutoFiller.getMissingFields(content) }
          : f
      )
    );
  };

  const handleGenerate = async () => {
    if (!profile?.company_id) return;
    setGenerating(true);
    try {
      const rows = filled.map((f) => ({
        company_id: profile.company_id,
        template_id: f.templateId,
        name: f.name,
        status: f.missingFields.length > 0 ? "pendente_engenharia" : "rascunho",
        metadata: {
          content: f.content,
          missing_fields: f.missingFields,
          source: "auto_assembly",
        },
      }));
      const { error } = await supabase.from("generated_documents").insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} documentos gerados com sucesso!`);
      onClose();
    } catch (e: any) {
      toast.error("Erro ao gerar: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const canAdvance =
    (step === 0 && selectedIds.size > 0) ||
    (step === 1 && requiredInputs.length >= 0) ||
    (step === 2 &&
      requiredInputs
        .filter((r) => !r.optional)
        .every((r) => extractions[r.category]?.status === "done")) ||
    step === 3;

  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title="Montagem Automática de Processo"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Stepper */}
        <div className="flex items-center justify-between gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 flex items-center gap-2">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black ${
                  i <= step ? "bg-navy text-white" : "bg-slate-200 text-slate-500"
                }`}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-black uppercase tracking-wider ${
                  i === step ? "text-navy" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} />

        {/* Step 0 — Select target documents */}
        {step === 0 && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <p className="text-sm text-slate-600">
              Selecione todos os documentos que precisa gerar. O sistema vai descobrir
              automaticamente quais informações são necessárias.
            </p>
            {loadingTemplates ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin h-6 w-6 text-primary" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                Nenhum template disponível. Cadastre templates na biblioteca.
              </div>
            ) : (
              Object.entries(grouped).map(([cat, list]) => {
                const allSelected = list.every((t) => selectedIds.has(t.id));
                const toggleAll = () => {
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (allSelected) list.forEach((t) => next.delete(t.id));
                    else list.forEach((t) => next.add(t.id));
                    return next;
                  });
                };
                return (
                  <div key={cat} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        {cat}
                      </h4>
                      <button
                        type="button"
                        onClick={toggleAll}
                        className="text-[10px] font-black uppercase text-primary hover:underline"
                      >
                        {allSelected ? "Limpar" : "Selecionar todos"}
                      </button>
                    </div>
                    <div className="grid gap-2">
                      {list.map((t) => {
                        const checked = selectedIds.has(t.id);
                        return (
                          <label
                            key={t.id}
                            className={`flex items-center gap-3 p-3 border rounded-xl text-left transition-all cursor-pointer ${
                              checked
                                ? "border-primary bg-primary/5"
                                : "border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleTemplate(t.id)}
                              className="h-5 w-5 shrink-0"
                            />
                            <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="text-sm font-bold text-navy flex-1">{t.name}</span>
                            {t.process_type && (
                              <Badge variant="outline" className="text-[9px]">
                                {t.process_type}
                              </Badge>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Step 1 — Required inputs */}
        {step === 1 && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <p className="text-sm text-slate-600">
              Para gerar os <strong>{selectedTemplates.length}</strong> documentos selecionados,
              o sistema precisará dos seguintes insumos:
            </p>
            {requiredInputs.length === 0 ? (
              <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900 flex gap-3">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div>
                  Estes templates não usam placeholders dinâmicos — podem ser gerados sem
                  upload de documentos.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {requiredInputs.map((r) => (
                  <div
                    key={r.category}
                    className="flex items-start gap-3 p-4 border border-slate-200 rounded-xl bg-white"
                  >
                    <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <FileCheck2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-navy">{r.label}</h4>
                        {r.optional && (
                          <Badge variant="outline" className="text-[9px]">
                            opcional
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Preenche: {r.providesFields.join(", ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Upload OCR per category */}
        {step === 2 && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <p className="text-sm text-slate-600">
              Faça upload de cada documento. A IA extrai os dados automaticamente.
            </p>
            {requiredInputs.map((r) => {
              const ex = extractions[r.category];
              return (
                <div
                  key={r.category}
                  className="p-4 border border-slate-200 rounded-xl bg-white space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-navy">{r.label}</h4>
                      <p className="text-[11px] text-slate-500">{r.description}</p>
                    </div>
                    {ex?.status === "done" && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-0">
                        <Check className="h-3 w-3 mr-1" /> Processado
                      </Badge>
                    )}
                    {ex?.status === "processing" && (
                      <Badge className="bg-amber-100 text-amber-700 border-0">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Analisando
                      </Badge>
                    )}
                    {ex?.status === "failed" && (
                      <Badge className="bg-red-100 text-red-700 border-0">Falha</Badge>
                    )}
                  </div>

                  {!ex || ex.status === "failed" ? (
                    <label className="flex items-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-primary transition">
                      <Upload className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold">Selecionar arquivo</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload(r.category, r.ocrType, f);
                        }}
                      />
                    </label>
                  ) : (
                    <div className="text-xs text-slate-600 flex items-center gap-2">
                      <FileText className="h-3 w-3" /> {ex.fileName}
                    </div>
                  )}

                  {ex?.status === "done" && ex.data && (
                    <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-2 gap-2 text-[11px]">
                      {Object.entries(ex.data)
                        .slice(0, 6)
                        .map(([k, v]) => (
                          <div key={k}>
                            <span className="text-slate-400 uppercase text-[9px]">{k}</span>
                            <div className="font-bold text-navy truncate">{String(v)}</div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Step 3 — Preview & edit */}
        {step === 3 && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <p className="text-sm text-slate-600">
              Revise cada documento. Edite o que precisar e clique em <strong>Gerar tudo</strong>.
            </p>
            {filled.map((f) => (
              <div key={f.templateId} className="border border-slate-200 rounded-xl bg-white">
                <div className="flex items-center justify-between p-3 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-navy">{f.name}</h4>
                  {f.missingFields.length > 0 ? (
                    <Badge className="bg-amber-100 text-amber-700 border-0 text-[9px]">
                      {f.missingFields.length} pendente(s) de engenharia
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[9px]">
                      Completo
                    </Badge>
                  )}
                </div>
                <Textarea
                  value={f.content}
                  onChange={(e) => updateFilledContent(f.templateId, e.target.value)}
                  className="min-h-[180px] border-0 font-mono text-[11px] rounded-t-none"
                />
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance}
              className="bg-navy"
            >
              Avançar <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleGenerate} disabled={generating} className="bg-primary">
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Gerar {filled.length} documentos
            </Button>
          )}
        </div>
      </div>
    </ModalLayout>
  );
}
