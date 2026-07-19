import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Upload, Loader2, FileText, RefreshCw, CheckCircle2, AlertTriangle,
  XCircle, Eye, Sparkles, Save, ChevronDown, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  listProcessDocumentUploads,
  uploadProcessDocumentFile,
  runProcessDocumentOcr,
  getSignedUrl,
  updateExtractedField,
  setValidationStatus,
  compareExtractedWith,
  applyDataToProcessDocument,
  type ProcessDocumentUpload,
} from "@/services/processDocumentUploads";

const FIELD_LABELS: Record<string, string> = {
  name: "Nome", cpf: "CPF", cnpj: "CNPJ", rg: "RG", birth_date: "Nascimento",
  address: "Endereço", city: "Cidade", state: "UF", zip_code: "CEP",
  phone: "Telefone", email: "E-mail",
  vessel_name: "Embarcação", registration_number: "Inscrição", vessel_type: "Tipo",
  length: "Comprimento", beam: "Boca", depth: "Pontal", gross_tonnage: "Arqueação",
  engine_power: "Potência", engine_model: "Motor", engine_serial: "Série motor",
  issue_date: "Emissão", expiry_date: "Validade", issuer: "Órgão emissor",
};

type Doc = {
  id: string;
  template_id: string | null;
  is_required: boolean;
  status: string;
  metadata: any;
  document_templates?: { name?: string; code?: string } | null;
};

export function ProcessDocumentsPanel({ processId }: { processId: string }) {
  const { profile } = useAuth();
  const companyId = profile?.company_id as string | undefined;

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["process_documents", processId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("process_documents")
        .select("id, template_id, is_required, status, metadata, document_templates(name, code)")
        .eq("process_id", processId)
        .order("is_required", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Doc[];
    },
  });

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-500 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando documentos…</div>;
  }
  if (docs.length === 0) {
    return (
      <div className="p-6 text-sm text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
        Nenhum documento da Biblioteca foi vinculado a este processo ainda. Crie um novo processo pelo wizard "Process-First" para vincular os modelos sugeridos.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {docs.map((d) => (
        <DocumentCard key={d.id} doc={d} processId={processId} companyId={companyId} />
      ))}
    </div>
  );
}

function DocumentCard({ doc, processId, companyId }: { doc: Doc; processId: string; companyId?: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: uploads = [], isLoading } = useQuery({
    queryKey: ["pdu", doc.id],
    queryFn: () => listProcessDocumentUploads(doc.id),
  });

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      if (!companyId) throw new Error("Sem empresa vinculada");
      const u = await uploadProcessDocumentFile({
        file, processDocumentId: doc.id, processId, companyId,
        userId: (await supabase.auth.getUser()).data.user?.id ?? undefined,
      });
      return u;
    },
    onSuccess: async (u) => {
      toast.success("Arquivo anexado");
      qc.invalidateQueries({ queryKey: ["pdu", doc.id] });
      qc.invalidateQueries({ queryKey: ["process-center", "detail", processId] });
      // Auto OCR
      ocrMut.mutate(u.id);
    },
    onError: (e: any) => toast.error("Falha no upload: " + (e?.message ?? e)),
  });

  const ocrMut = useMutation({
    mutationFn: (uploadId: string) => runProcessDocumentOcr(uploadId),
    onSuccess: () => {
      toast.success("OCR concluído");
      qc.invalidateQueries({ queryKey: ["pdu", doc.id] });
    },
    onError: (e: any) => toast.error("OCR falhou: " + (e?.message ?? e)),
  });

  const headerStatus = doc.status;
  const tplName = doc.document_templates?.name ?? "Documento";

  return (
    <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 text-left"
      >
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        <FileText className="h-5 w-5 text-primary" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-navy">{tplName}</span>
            {doc.document_templates?.code && (
              <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">{doc.document_templates.code}</span>
            )}
            {doc.is_required && <span className="text-[10px] px-2 py-0.5 bg-red-50 text-red-700 rounded font-bold">Obrigatório</span>}
            <StatusBadge status={headerStatus} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{uploads.length} anexo(s)</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
          disabled={uploadMut.isPending}
        >
          {uploadMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />} Anexar
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadMut.mutate(f);
            e.target.value = "";
          }}
        />
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50/50">
          {isLoading && <div className="text-xs text-slate-500 flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Carregando anexos…</div>}
          {!isLoading && uploads.length === 0 && (
            <div className="text-xs text-slate-500 italic">Nenhum anexo. Clique em "Anexar" para enviar um arquivo (PDF ou imagem).</div>
          )}
          {uploads.map((u) => (
            <UploadRow
              key={u.id}
              upload={u}
              processDocumentId={doc.id}
              onRerunOcr={() => ocrMut.mutate(u.id)}
              ocrRunning={ocrMut.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UploadRow({
  upload, processDocumentId, onRerunOcr, ocrRunning,
}: {
  upload: ProcessDocumentUpload;
  processDocumentId: string;
  onRerunOcr: () => void;
  ocrRunning: boolean;
}) {
  const qc = useQueryClient();
  const [fields, setFields] = useState<Record<string, any>>(upload.extracted_fields ?? {});
  const [openPreview, setOpenPreview] = useState(false);

  useEffect(() => { setFields(upload.extracted_fields ?? {}); }, [upload.extracted_fields]);

  const ctxQ = useQuery({
    queryKey: ["pdu_ctx", upload.process_id],
    queryFn: async () => {
      const { data: proc } = await supabase
        .from("processes")
        .select("id, customer_id, vessel_id, company_id")
        .eq("id", upload.process_id)
        .single();
      const [{ data: customer }, { data: vessel }, { data: company }] = await Promise.all([
        proc?.customer_id ? supabase.from("customers").select("name, cpf_cnpj, email, phone, address").eq("id", proc.customer_id).single() : Promise.resolve({ data: null } as any),
        proc?.vessel_id ? supabase.from("vessels").select("name, registration_number, vessel_type").eq("id", proc.vessel_id).single() : Promise.resolve({ data: null } as any),
        proc?.company_id ? supabase.from("companies").select("name, cnpj").eq("id", proc.company_id).single() : Promise.resolve({ data: null } as any),
      ]);
      return { customer, vessel, company };
    },
  });

  const comparison = useMemo(
    () => compareExtractedWith(fields, { ...ctxQ.data, confidence: upload.confidence_score }),
    [fields, ctxQ.data, upload.confidence_score]
  );

  const saveField = async (k: string, v: any) => {
    setFields((p) => ({ ...p, [k]: v }));
    try { await updateExtractedField(upload.id, k, v); } catch (e: any) { toast.error("Falha ao salvar: " + e?.message); }
  };

  const applyMut = useMutation({
    mutationFn: async () => {
      await setValidationStatus(upload.id, comparison.status, comparison.errors);
      await applyDataToProcessDocument({ uploadId: upload.id, processDocumentId, fields });
    },
    onSuccess: () => {
      toast.success("Dados aplicados ao documento");
      qc.invalidateQueries({ queryKey: ["pdu", processDocumentId] });
      qc.invalidateQueries({ queryKey: ["process_documents", upload.process_id] });
      qc.invalidateQueries({ queryKey: ["process-center", "detail", upload.process_id] });
    },
    onError: (e: any) => toast.error("Falha ao aplicar: " + (e?.message ?? e)),
  });

  const previewMut = useMutation({
    mutationFn: () => getSignedUrl(upload.file_url),
    onSuccess: (url) => window.open(url, "_blank"),
    onError: (e: any) => toast.error("Não foi possível abrir o arquivo: " + e?.message),
  });

  const filledKeys = Object.keys(fields).filter((k) => fields[k] != null && String(fields[k]).trim() !== "");

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
      <div className="flex items-center gap-3 p-3 border-b border-slate-100">
        <FileText className="h-4 w-4 text-slate-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-navy truncate">{upload.file_name}</div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <OcrBadge status={upload.ocr_status} />
            {upload.detected_document_type && (
              <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-bold">{upload.detected_document_type}</span>
            )}
            {typeof upload.confidence_score === "number" && (
              <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                conf. {(upload.confidence_score * 100).toFixed(0)}%
              </span>
            )}
            <ValidationDot status={comparison.status} />
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => previewMut.mutate()} disabled={previewMut.isPending}>
          <Eye className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="outline" onClick={onRerunOcr} disabled={ocrRunning || upload.ocr_status === "processando"}>
          {upload.ocr_status === "processando" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          {upload.ocr_status === "concluido" ? " Refazer OCR" : " Executar OCR"}
        </Button>
      </div>

      {upload.ocr_status === "concluido" && (
        <div className="p-3 space-y-3">
          {comparison.errors.length > 0 && (
            <div className="text-xs rounded-lg bg-amber-50 border border-amber-200 p-2 space-y-1">
              {comparison.errors.map((e, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertTriangle className="h-3 w-3 text-amber-600 mt-0.5 shrink-0" />
                  <span>{e.message}</span>
                </div>
              ))}
            </div>
          )}

          {filledKeys.length === 0 ? (
            <div className="text-xs text-slate-500 italic">Nenhum campo extraído.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filledKeys.map((k) => (
                <label key={k} className="text-xs">
                  <span className="font-semibold text-slate-600">{FIELD_LABELS[k] ?? k}</span>
                  <input
                    className="mt-1 w-full px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-sm"
                    defaultValue={fields[k] ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value;
                      if (v !== (upload.extracted_fields?.[k] ?? "")) saveField(k, v);
                    }}
                  />
                </label>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-[10px] text-slate-400">
              Atualizado em {new Date(upload.updated_at).toLocaleString("pt-BR")}
            </span>
            <Button size="sm" onClick={() => applyMut.mutate()} disabled={applyMut.isPending}>
              {applyMut.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
              Aplicar dados ao documento
            </Button>
          </div>
        </div>
      )}

      {upload.ocr_status === "falhou" && (
        <div className="p-3 text-xs text-red-700 bg-red-50 flex items-start gap-2">
          <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>OCR falhou. {(upload.validation_errors?.[0]?.message ?? "Tente novamente.")}</span>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; tx: string; label: string }> = {
    pendente: { bg: "bg-slate-100", tx: "text-slate-700", label: "Pendente" },
    em_preenchimento: { bg: "bg-blue-50", tx: "text-blue-700", label: "Em preenchimento" },
    aguardando_revisao: { bg: "bg-amber-50", tx: "text-amber-700", label: "Aguardando revisão" },
    aprovado: { bg: "bg-green-50", tx: "text-green-700", label: "Aprovado" },
    pdf_generated: { bg: "bg-emerald-50", tx: "text-emerald-700", label: "PDF gerado" },
  };
  const s = map[status] ?? { bg: "bg-slate-100", tx: "text-slate-700", label: status };
  return <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${s.bg} ${s.tx}`}>{s.label}</span>;
}

function OcrBadge({ status }: { status: ProcessDocumentUpload["ocr_status"] }) {
  const map = {
    pendente: { c: "bg-slate-100 text-slate-700", l: "OCR pendente" },
    processando: { c: "bg-blue-50 text-blue-700", l: "Processando…" },
    concluido: { c: "bg-green-50 text-green-700", l: "OCR concluído" },
    falhou: { c: "bg-red-50 text-red-700", l: "OCR falhou" },
    ignorado: { c: "bg-slate-100 text-slate-500", l: "Ignorado" },
  } as const;
  const s = map[status] ?? map.pendente;
  return <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${s.c}`}>{s.l}</span>;
}

function ValidationDot({ status }: { status: string }) {
  const map: Record<string, { c: string; l: string; Icon: any }> = {
    conferido: { c: "bg-green-50 text-green-700", l: "Conferido", Icon: CheckCircle2 },
    baixa_confianca: { c: "bg-amber-50 text-amber-700", l: "Baixa confiança", Icon: AlertTriangle },
    divergente: { c: "bg-red-50 text-red-700", l: "Divergente", Icon: XCircle },
    ausente: { c: "bg-slate-100 text-slate-600", l: "Ausente", Icon: AlertTriangle },
    pendente: { c: "bg-slate-100 text-slate-600", l: "Pendente", Icon: AlertTriangle },
    falhou: { c: "bg-red-50 text-red-700", l: "Falhou", Icon: XCircle },
  };
  const s = map[status] ?? map.pendente;
  const I = s.Icon;
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded font-bold inline-flex items-center gap-1 ${s.c}`}>
      <I className="h-3 w-3" /> {s.l}
    </span>
  );
}
