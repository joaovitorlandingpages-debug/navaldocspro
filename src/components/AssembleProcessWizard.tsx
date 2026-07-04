import { useState, useEffect, useMemo } from "react";
import { ModalLayout } from "@/components/ui/ModalLayout";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  Ship,
  UserCheck,
  Wrench,
  RotateCw,
  RefreshCw,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import {
  mergeExtractedData,
  type SourceCategory,
} from "@/services/automation/requiredInputsResolver";
import { DocumentAutoFiller } from "@/services/documentAutoFiller";

interface PackageItem {
  id: string;
  document_template_id: string;
  document_role: string;
  is_required: boolean;
  sort_order: number;
  template: {
    id: string;
    name: string;
    base_content: string | null;
    category: string | null;
  } | null;
}

interface Package {
  id: string;
  name: string;
  process_type: string;
  description: string | null;
  items: PackageItem[];
}

interface OCRExtraction {
  category: SourceCategory;
  fileName: string;
  status: "uploading" | "processing" | "done" | "failed";
  data?: any;
  jobId?: string;
}

interface PreviewDoc {
  templateId: string;
  name: string;
  role: string;
  isRequired: boolean;
  content: string;
  missingFields: string[];
  pendingEngineering: boolean;
  selected: boolean;
}

const STEPS = ["Upload Documentos", "Escolher Procedimento", "Pacote Gerado", "Finalizar"];

const PROCEDURE_META: Record<
  string,
  { label: string; icon: any; desc: string }
> = {
  registro_inicial: {
    label: "Registro Inicial",
    icon: Ship,
    desc: "Primeira inscrição da embarcação",
  },
  transferencia: {
    label: "Transferência",
    icon: UserCheck,
    desc: "Mudança de proprietário",
  },
  alteracao_caracteristica: {
    label: "Alteração de Característica",
    icon: Wrench,
    desc: "Mudança técnica registrada",
  },
  alteracao_motor: {
    label: "Alteração de Motor",
    icon: Wrench,
    desc: "Troca ou alteração de motorização",
  },
  regularizacao: {
    label: "Regularização",
    icon: RotateCw,
    desc: "Regularização de embarcação",
  },
  segunda_via: {
    label: "Segunda Via",
    icon: RefreshCw,
    desc: "Reemissão de TIE/TIEM",
  },
};

const UPLOAD_SLOTS: Array<{ category: SourceCategory; label: string; hint: string }> = [
  { category: "PERSONAL_IDENTITY", label: "CNH ou RG", hint: "Nome, CPF, RG, contato" },
  { category: "PROOF_OF_ADDRESS", label: "Comprovante de Residência", hint: "Endereço completo" },
  { category: "VESSEL_TIE", label: "TIE / TIEM (opcional)", hint: "Dados da embarcação" },
];

export function AssembleProcessWizard({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { profile } = useAuth();
  const [step, setStep] = useState(0);
  const [extractions, setExtractions] = useState<Record<string, OCRExtraction | null>>({});
  const [packages, setPackages] = useState<Package[]>([]);
  const [loadingPkgs, setLoadingPkgs] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<string | null>(null);
  const [previews, setPreviews] = useState<PreviewDoc[]>([]);
  const [generating, setGenerating] = useState(false);

  // Load packages on first open
  useEffect(() => {
    if (!isOpen || packages.length > 0) return;
    setLoadingPkgs(true);
    supabase
      .from("document_process_packages")
      .select(
        `id,name,process_type,description,
         items:document_process_package_items(
           id,document_template_id,document_role,is_required,sort_order,
           template:document_templates(id,name,base_content,category)
         )`
      )
      .eq("is_active", true)
      .then(({ data, error }: { data: any; error: { message: string } | null }) => {
        if (error) toast.error("Erro ao carregar pacotes: " + error.message);
        else setPackages((data || []) as any);
        setLoadingPkgs(false);
      });
  }, [isOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep(0);
        setExtractions({});
        setSelectedProcedure(null);
        setPreviews([]);
      }, 200);
    }
  }, [isOpen]);

  const selectedPackage = useMemo(
    () => packages.find((p) => p.process_type === selectedProcedure) || null,
    [packages, selectedProcedure]
  );

  // Build previews when entering step 2 (pacote gerado) or when procedure changes
  useEffect(() => {
    if (step !== 2 || !selectedPackage) return;

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

    const sorted = [...selectedPackage.items].sort((a, b) => a.sort_order - b.sort_order);
    const result: PreviewDoc[] = sorted
      .filter((i) => i.template)
      .map((i) => {
        const content = DocumentAutoFiller.fill(i.template!.base_content || "", payload);
        const missing = DocumentAutoFiller.getMissingFields(content);
        const pendingEng = i.document_role === "memorial_tecnico" || /memorial|engenharia/i.test(i.template!.name);
        return {
          templateId: i.document_template_id,
          name: i.template!.name,
          role: i.document_role,
          isRequired: i.is_required,
          content,
          missingFields: missing,
          pendingEngineering: pendingEng,
          selected: true,
        };
      });
    setPreviews(result);
  }, [step, selectedPackage, extractions, profile?.name]);

  const handleFileUpload = async (category: SourceCategory, file: File) => {
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
          document_type: category,
        })
        .select()
        .single();
      if (jobErr) throw jobErr;

      setExtractions((prev) => ({
        ...prev,
        [category]: { category, fileName: file.name, status: "processing", jobId: job.id },
      }));

      await supabase.functions.invoke("process-ocr-document", { body: { jobId: job.id } });

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

      if (result.status === "completed") toast.success(`${file.name} processado`);
      else toast.error(`Falha ao processar ${file.name}`);
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

  const togglePreview = (templateId: string) => {
    setPreviews((prev) =>
      prev.map((p) => (p.templateId === templateId ? { ...p, selected: !p.selected } : p))
    );
  };

  const handleGenerate = async () => {
    if (!profile?.company_id) return;
    const toGenerate = previews.filter((p) => p.selected);
    if (toGenerate.length === 0) {
      toast.error("Selecione ao menos um documento");
      return;
    }
    setGenerating(true);
    try {
      const rows = toGenerate.map((f) => ({
        company_id: profile.company_id,
        template_id: f.templateId,
        name: f.name,
        status: f.pendingEngineering ? "pendente_engenharia" : "rascunho",
        metadata: {
          content: f.content,
          missing_fields: f.missingFields,
          role: f.role,
          procedure: selectedProcedure,
          source: "auto_assembly_package",
          pending_engineering: f.pendingEngineering,
        },
      }));
      const { error } = await supabase.from("generated_documents").insert(rows);
      if (error) throw error;
      toast.success(`Pacote gerado: ${rows.length} documentos!`);
      setStep(3);
    } catch (e: any) {
      toast.error("Erro ao gerar: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const hasMinUpload =
    extractions["PERSONAL_IDENTITY"]?.status === "done" ||
    Object.values(extractions).some((e) => e?.status === "done");

  const canAdvance =
    (step === 0 && hasMinUpload) ||
    (step === 1 && !!selectedProcedure && !!selectedPackage) ||
    (step === 2 && previews.some((p) => p.selected)) ||
    step === 3;

  const availableProcedures = packages
    .filter((p) => PROCEDURE_META[p.process_type])
    .map((p) => ({ ...p, meta: PROCEDURE_META[p.process_type] }));

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

        {/* Step 0 — Upload */}
        {step === 0 && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <p className="text-sm text-slate-600">
              Envie os documentos básicos do cliente. A IA extrai automaticamente nome, CPF,
              RG, endereço e demais dados.
            </p>
            <div className="grid gap-3">
              {UPLOAD_SLOTS.map((slot) => {
                const ex = extractions[slot.category];
                return (
                  <div
                    key={slot.category}
                    className="p-4 border border-slate-200 rounded-xl bg-white space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-navy">{slot.label}</h4>
                        <p className="text-[11px] text-slate-500">{slot.hint}</p>
                      </div>
                      {ex?.status === "done" && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-0">
                          <Check className="h-3 w-3 mr-1" /> Pronto
                        </Badge>
                      )}
                      {ex?.status === "processing" && (
                        <Badge className="bg-amber-100 text-amber-700 border-0">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Analisando
                        </Badge>
                      )}
                      {ex?.status === "uploading" && (
                        <Badge className="bg-slate-100 text-slate-700 border-0">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Enviando
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
                            if (f) handleFileUpload(slot.category, f);
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
          </div>
        )}

        {/* Step 1 — Choose procedure */}
        {step === 1 && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <p className="text-sm text-slate-600">
              Escolha o tipo de procedimento. O sistema vai montar o pacote documental
              correspondente.
            </p>
            {loadingPkgs ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin h-6 w-6 text-primary" />
              </div>
            ) : availableProcedures.length === 0 ? (
              <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900 flex gap-3">
                <AlertCircle className="h-5 w-5 shrink-0" />
                Nenhum pacote ativo cadastrado.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableProcedures.map((p) => {
                  const Icon = p.meta.icon;
                  const active = selectedProcedure === p.process_type;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProcedure(p.process_type)}
                      className={`p-4 border rounded-xl text-left transition-all flex gap-3 items-start ${
                        active
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-navy">{p.meta.label}</h4>
                        <p className="text-[11px] text-slate-500">{p.meta.desc}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {p.items?.length || 0} documentos no pacote
                        </p>
                      </div>
                      {active && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Package preview */}
        {step === 2 && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <ClipboardList className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-bold text-emerald-900">
                  Pacote: {selectedPackage?.name}
                </div>
                <div className="text-[11px] text-emerald-700">
                  {previews.filter((p) => p.selected).length} documentos selecionados ·{" "}
                  {previews.filter((p) => p.isRequired).length} obrigatórios ·{" "}
                  {previews.filter((p) => p.pendingEngineering).length} pendentes de
                  engenharia
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Desmarque documentos que não quer gerar. Os dados extraídos do OCR já foram
              aplicados.
            </p>
            {previews.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                Este pacote ainda não tem documentos cadastrados.
              </div>
            ) : (
              <div className="grid gap-2">
                {previews.map((p) => (
                  <label
                    key={p.templateId}
                    className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                      p.selected
                        ? "border-primary bg-primary/5"
                        : "border-slate-200 hover:bg-slate-50 opacity-60"
                    }`}
                  >
                    <Checkbox
                      checked={p.selected}
                      onCheckedChange={() => togglePreview(p.templateId)}
                    />
                    <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-navy truncate">{p.name}</div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {p.isRequired && (
                          <Badge className="bg-red-100 text-red-700 border-0 text-[9px]">
                            obrigatório
                          </Badge>
                        )}
                        {!p.isRequired && (
                          <Badge variant="outline" className="text-[9px]">
                            opcional
                          </Badge>
                        )}
                        {p.pendingEngineering && (
                          <Badge className="bg-amber-100 text-amber-700 border-0 text-[9px]">
                            pendente de engenharia
                          </Badge>
                        )}
                        {p.missingFields.length > 0 && !p.pendingEngineering && (
                          <Badge className="bg-slate-100 text-slate-600 border-0 text-[9px]">
                            {p.missingFields.length} campo(s) faltando
                          </Badge>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Done */}
        {step === 3 && (
          <div className="text-center py-10 space-y-4">
            <div className="h-16 w-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-navy">Pacote gerado com sucesso!</h3>
            <p className="text-sm text-slate-600">
              {previews.filter((p) => p.selected).length} documentos foram criados.
              Os documentos pendentes de engenharia foram marcados para revisão técnica.
            </p>
            <Button onClick={onClose} className="bg-primary">
              Fechar
            </Button>
          </div>
        )}

        {/* Footer */}
        {step < 3 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>

            {step < 2 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance}
                className="bg-navy"
              >
                Avançar <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleGenerate} disabled={generating || !canAdvance} className="bg-primary">
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Gerar Pacote ({previews.filter((p) => p.selected).length})
              </Button>
            )}
          </div>
        )}
      </div>
    </ModalLayout>
  );
}
