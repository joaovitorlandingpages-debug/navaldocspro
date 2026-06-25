import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  PDFFont,
  PDFPage,
} from "pdf-lib";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  CheckCircle2,
  XCircle,
  FileCheck,
  Download,
  Package,
  Truck,
  Ban,
  Loader2,
  ShieldCheck,
  RefreshCcw,
  AlertTriangle,
  FileText,
  Ship,
  User as UserIcon,
} from "lucide-react";

interface Props {
  processId: string;
}

type ChecklistItem = { key: string; label: string; ok: boolean; detail?: string };

type Bundle = {
  process: any;
  customer: any;
  vessel: any;
  company: any;
  procDocs: any[];
  uploads: any[];
  attachments: any[];
  generated: any[];
  checklist: any[];
  audit: any[];
};

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  pronto_para_gerar: "Pronto para gerar",
  gerado: "Gerado",
  entregue: "Entregue",
  cancelado: "Cancelado",
  not_generated: "Não gerado",
};

async function logEvent(event_type: string, processId: string, metadata: any = {}) {
  try {
    await supabase.from("system_logs").insert({
      event_type,
      module: "DOSSIER",
      message: `${event_type} (process ${processId})`,
      metadata: { processId, ...metadata },
    } as any);
  } catch {}
}

function newVerificationCode() {
  const r = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(r).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function newDossierNumber() {
  const y = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 900000) + 100000;
  return `DOS-${y}-${seq}`;
}

async function fetchBundle(processId: string): Promise<Bundle> {
  const { data: process } = await supabase
    .from("processes")
    .select("*, customer:customers(*), vessel:vessels(*), company:companies(*)")
    .eq("id", processId)
    .maybeSingle();

  if (!process) throw new Error("Processo não encontrado");

  const [procDocsRes, uploadsRes, attachmentsRes, generatedRes, checklistRes, auditRes] =
    await Promise.all([
      supabase.from("process_documents").select("*").eq("process_id", processId),
      supabase.from("process_document_uploads").select("*").eq("process_id", processId),
      supabase.from("uploaded_files").select("*").eq("process_id", processId),
      supabase.from("generated_documents").select("*").eq("process_id", processId),
      supabase.from("document_checklists").select("*").eq("process_id", processId),
      supabase
        .from("activity_logs")
        .select("*")
        .eq("resource_id", processId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  return {
    process,
    customer: (process as any).customer,
    vessel: (process as any).vessel,
    company: (process as any).company,
    procDocs: procDocsRes.data || [],
    uploads: uploadsRes.data || [],
    attachments: attachmentsRes.data || [],
    generated: generatedRes.data || [],
    checklist: checklistRes.data || [],
    audit: auditRes.data || [],
  };
}

function computeChecklist(b: Bundle): ChecklistItem[] {
  const mandatory = b.procDocs.filter((d) => d.is_mandatory);
  const mandatoryApproved = mandatory.filter((d) => d.status === "approved" || d.status === "aprovado");
  const criticalDivergent = b.uploads.filter(
    (u) => u.validation_status === "divergente" && (u.confidence_score ?? 1) < 0.6
  );
  const generatedReady = b.generated.filter((g) => !!g.file_url);

  return [
    { key: "customer", label: "Cliente conferido", ok: !!b.customer?.name && !!b.customer?.cpf_cnpj },
    { key: "vessel", label: "Embarcação conferida", ok: !!b.vessel?.name },
    {
      key: "mandatory",
      label: "Documentos obrigatórios aprovados",
      ok: mandatory.length === 0 ? true : mandatoryApproved.length === mandatory.length,
      detail: `${mandatoryApproved.length}/${mandatory.length}`,
    },
    {
      key: "ocr",
      label: "OCR sem divergência crítica",
      ok: criticalDivergent.length === 0,
      detail: criticalDivergent.length ? `${criticalDivergent.length} divergência(s)` : "ok",
    },
    {
      key: "pdfs",
      label: "PDFs finais gerados",
      ok: generatedReady.length > 0,
      detail: `${generatedReady.length} pdf(s)`,
    },
    {
      key: "attachments",
      label: "Anexos obrigatórios presentes",
      ok: b.uploads.length + b.attachments.length > 0,
    },
    { key: "responsible", label: "Dados do responsável presentes", ok: !!b.company?.responsible_name || !!b.company?.name },
    {
      key: "ready",
      label: "Processo pronto para entrega",
      ok:
        !!b.customer?.name &&
        !!b.vessel?.name &&
        (mandatory.length === 0 || mandatoryApproved.length === mandatory.length) &&
        criticalDivergent.length === 0 &&
        generatedReady.length > 0,
    },
  ];
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = (text || "").split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      if (cur) lines.push(cur);
      cur = w;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

async function buildConsolidatedPdf(b: Bundle, dossierNumber: string, code: string) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 50;
  const navy = rgb(0.05, 0.1, 0.25);
  const muted = rgb(0.4, 0.45, 0.55);

  let page: PDFPage = pdf.addPage([595, 842]);
  let y = 800;

  const newPage = () => {
    page = pdf.addPage([595, 842]);
    y = 800;
  };
  const ensure = (h: number) => {
    if (y - h < margin) newPage();
  };
  const heading = (t: string) => {
    ensure(30);
    page.drawText(t, { x: margin, y, size: 14, font: bold, color: navy });
    y -= 22;
  };
  const line = (t: string, opts: { bold?: boolean; size?: number; color?: any } = {}) => {
    const size = opts.size ?? 10;
    const f = opts.bold ? bold : font;
    const lines = wrapText(t, f, size, 595 - margin * 2);
    for (const ln of lines) {
      ensure(size + 4);
      page.drawText(ln, { x: margin, y, size, font: f, color: opts.color ?? navy });
      y -= size + 4;
    }
  };
  const sep = () => {
    ensure(10);
    page.drawLine({
      start: { x: margin, y },
      end: { x: 595 - margin, y },
      thickness: 0.5,
      color: rgb(0.85, 0.87, 0.92),
    });
    y -= 12;
  };

  // Cover
  page.drawRectangle({ x: 0, y: 742, width: 595, height: 100, color: navy });
  page.drawText("DOSSIÊ FINAL DE PROCESSO", {
    x: margin,
    y: 800,
    size: 18,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText(`Nº ${dossierNumber}`, {
    x: margin,
    y: 775,
    size: 11,
    font,
    color: rgb(0.85, 0.88, 0.95),
  });
  page.drawText(`Verificação: ${code}`, {
    x: margin,
    y: 758,
    size: 9,
    font,
    color: rgb(0.85, 0.88, 0.95),
  });
  y = 720;

  heading("Processo");
  line(`Tipo: ${b.process.process_type || "—"}`);
  line(`Status: ${b.process.status || "—"}`);
  line(`Protocolo: ${b.process.protocol_number || "—"}`);
  line(`Aberto em: ${new Date(b.process.created_at).toLocaleString("pt-BR")}`);
  sep();

  heading("Cliente");
  line(`Nome: ${b.customer?.name || "—"}`, { bold: true });
  line(`CPF/CNPJ: ${b.customer?.cpf_cnpj || "—"}`);
  line(`E-mail: ${b.customer?.email || "—"}`);
  line(`Telefone: ${b.customer?.phone || "—"}`);
  sep();

  heading("Embarcação");
  line(`Nome: ${b.vessel?.name || "—"}`, { bold: true });
  line(`Registro: ${b.vessel?.registration_number || "—"}`);
  line(`Tipo: ${b.vessel?.vessel_type || "—"}`);
  line(`TPB: ${b.vessel?.gross_tonnage || "—"}`);
  sep();

  heading("Checklist Final");
  for (const item of computeChecklist(b)) {
    line(`${item.ok ? "[OK]" : "[!!]"} ${item.label}${item.detail ? "  —  " + item.detail : ""}`, {
      color: item.ok ? rgb(0.1, 0.5, 0.2) : rgb(0.7, 0.15, 0.15),
    });
  }
  sep();

  heading("Documentos do Processo");
  if (!b.procDocs.length) line("Nenhum documento vinculado.", { color: muted });
  for (const d of b.procDocs) {
    line(
      `• ${d.template_name || d.document_type || d.template_code || "Documento"}  —  ${d.status || "pendente"}${d.is_mandatory ? "  (obrigatório)" : ""}`
    );
  }
  sep();

  heading("PDFs Finais Aprovados");
  if (!b.generated.length) line("Nenhum PDF final gerado.", { color: muted });
  for (const g of b.generated) {
    line(`• ${g.name || g.document_type || g.id}  —  ${g.status || "—"}`);
  }
  sep();

  heading("Anexos");
  const all = [
    ...b.uploads.map((u) => ({ name: u.file_name, type: u.file_type, src: "upload" })),
    ...b.attachments.map((u) => ({ name: u.file_name, type: u.file_type, src: "attachment" })),
  ];
  if (!all.length) line("Nenhum anexo.", { color: muted });
  for (const a of all) line(`• [${a.src}] ${a.name}  —  ${a.type || ""}`);
  sep();

  heading("Resumo de Validação");
  const div = b.uploads.filter((u) => u.validation_status === "divergente").length;
  const ok = b.uploads.filter((u) => u.validation_status === "conferido").length;
  const pend = b.uploads.filter((u) => !u.validation_status || u.validation_status === "pendente").length;
  line(`Conferidos: ${ok}  |  Divergentes: ${div}  |  Pendentes: ${pend}`);
  sep();

  heading("Responsável");
  line(b.company?.responsible_name || b.company?.name || "—", { bold: true });
  line(`Empresa: ${b.company?.name || "—"}`);
  line(`CNPJ: ${b.company?.cnpj || "—"}`);
  sep();

  ensure(40);
  page.drawText(`Gerado em ${new Date().toLocaleString("pt-BR")}`, {
    x: margin,
    y,
    size: 9,
    font,
    color: muted,
  });
  y -= 14;
  page.drawText(`Código de verificação interno: ${code}`, {
    x: margin,
    y,
    size: 9,
    font: bold,
    color: navy,
  });

  return pdf.save();
}

async function downloadFile(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function buildZip(
  b: Bundle,
  consolidated: Uint8Array,
  dossierNumber: string,
  code: string,
  checklist: ChecklistItem[]
) {
  const zip = new JSZip();
  zip.file(`${dossierNumber}.pdf`, consolidated);

  const pdfsFolder = zip.folder("pdfs-finais")!;
  for (const g of b.generated) {
    if (!g.file_url) continue;
    const bytes = await downloadFile(g.file_url);
    if (bytes) pdfsFolder.file(`${(g.name || g.id).replace(/[^\w.-]+/g, "_")}.pdf`, bytes);
  }

  const attachFolder = zip.folder("anexos")!;
  for (const u of [...b.uploads, ...b.attachments]) {
    if (!u.file_url) continue;
    const bytes = await downloadFile(u.file_url);
    if (bytes) attachFolder.file((u.file_name || "arquivo").replace(/[^\w.-]+/g, "_"), bytes);
  }

  zip.file(
    "checklist.json",
    JSON.stringify({ dossierNumber, code, checklist }, null, 2)
  );
  zip.file(
    "audit-log.json",
    JSON.stringify(b.audit, null, 2)
  );
  zip.file(
    "resumo.txt",
    [
      `Dossiê: ${dossierNumber}`,
      `Código de verificação: ${code}`,
      `Processo: ${b.process.process_type} (${b.process.id})`,
      `Cliente: ${b.customer?.name || "-"}`,
      `Embarcação: ${b.vessel?.name || "-"}`,
      `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
      ``,
      `Checklist:`,
      ...checklist.map((c) => `${c.ok ? "[OK]" : "[!!]"} ${c.label}${c.detail ? " - " + c.detail : ""}`),
    ].join("\n")
  );

  return zip.generateAsync({ type: "uint8array" });
}

export default function ProcessFinalDossierTab({ processId }: Props) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<null | "generate" | "deliver" | "cancel" | "pdf" | "zip">(null);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [dossier, setDossier] = useState<any>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const b = await fetchBundle(processId);
      setBundle(b);
      const { data } = await supabase
        .from("process_dossiers")
        .select("*")
        .eq("process_id", processId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setDossier(data);
    } catch (e: any) {
      toast.error(e.message || "Falha ao carregar dossiê");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processId]);

  const checklist = useMemo(() => (bundle ? computeChecklist(bundle) : []), [bundle]);
  const canGenerate = checklist.length > 0 && checklist.every((c) => c.ok);
  const blockers = checklist.filter((c) => !c.ok);
  const status = dossier?.status || "rascunho";

  const signedUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from("process-dossiers")
      .createSignedUrl(path, 60 * 30);
    return data?.signedUrl;
  };

  const handleGenerate = async () => {
    if (!bundle) return;
    if (!canGenerate) {
      await logEvent("process_dossier_generation_blocked", processId, {
        blockers: blockers.map((b) => b.key),
      });
      toast.error("Dossiê bloqueado. Resolva as pendências do checklist.");
      return;
    }
    setBusy("generate");
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      const companyId = bundle.process.company_id;
      const dossierNumber = newDossierNumber();
      const code = newVerificationCode();

      await logEvent("process_dossier_generation_started", processId, { dossierNumber });

      const consolidated = await buildConsolidatedPdf(bundle, dossierNumber, code);
      const pdfPath = `${companyId}/${processId}/${dossierNumber}.pdf`;
      const up1 = await supabase.storage
        .from("process-dossiers")
        .upload(pdfPath, consolidated, { contentType: "application/pdf", upsert: true });
      if (up1.error) throw up1.error;
      await logEvent("process_dossier_pdf_generated", processId, { pdfPath });

      const zipBytes = await buildZip(bundle, consolidated, dossierNumber, code, checklist);
      const zipPath = `${companyId}/${processId}/${dossierNumber}.zip`;
      const up2 = await supabase.storage
        .from("process-dossiers")
        .upload(zipPath, zipBytes, { contentType: "application/zip", upsert: true });
      if (up2.error) throw up2.error;
      await logEvent("process_dossier_zip_generated", processId, { zipPath });

      const payload = {
        process_id: processId,
        company_id: companyId,
        status: "gerado",
        dossier_number: dossierNumber,
        verification_code: code,
        generated_by: userId,
        generated_at: new Date().toISOString(),
        final_pdf_url: pdfPath,
        zip_url: zipPath,
        checklist_snapshot: checklist as any,
        documents_snapshot: bundle.procDocs as any,
        attachments_snapshot: [...bundle.uploads, ...bundle.attachments] as any,
        audit_snapshot: bundle.audit as any,
      };

      if (dossier?.id) {
        await supabase.from("process_dossiers").update(payload).eq("id", dossier.id);
      } else {
        await supabase.from("process_dossiers").insert(payload);
        await logEvent("process_dossier_created", processId, { dossierNumber });
      }

      toast.success(`Dossiê ${dossierNumber} gerado com sucesso`);
      await reload();
    } catch (e: any) {
      toast.error(e.message || "Falha ao gerar dossiê");
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async (kind: "pdf" | "zip") => {
    if (!dossier) return;
    setBusy(kind);
    try {
      const path = kind === "pdf" ? dossier.final_pdf_url : dossier.zip_url;
      if (!path) {
        toast.error("Arquivo indisponível");
        return;
      }
      const url = await signedUrl(path);
      if (!url) throw new Error("Não foi possível gerar link");
      const res = await fetch(url);
      const blob = await res.blob();
      saveAs(blob, `${dossier.dossier_number || "dossie"}.${kind}`);
      await logEvent("process_dossier_downloaded", processId, { kind });
    } catch (e: any) {
      toast.error(e.message || "Falha no download");
    } finally {
      setBusy(null);
    }
  };

  const handleDeliver = async () => {
    if (!dossier) return;
    setBusy("deliver");
    try {
      await supabase
        .from("process_dossiers")
        .update({ status: "entregue", delivered_at: new Date().toISOString() })
        .eq("id", dossier.id);
      await logEvent("process_dossier_delivered", processId, { dossierNumber: dossier.dossier_number });
      toast.success("Dossiê marcado como entregue");
      await reload();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const handleCancel = async () => {
    if (!dossier) return;
    setBusy("cancel");
    try {
      await supabase.from("process_dossiers").update({ status: "cancelado" }).eq("id", dossier.id);
      await logEvent("process_dossier_cancelled", processId, { dossierNumber: dossier.dossier_number });
      toast.success("Dossiê cancelado");
      await reload();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-3">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!bundle) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileCheck className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-black text-navy uppercase tracking-tight">Dossiê Final</h3>
              <Badge
                variant="outline"
                className={
                  status === "entregue"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : status === "gerado"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : status === "cancelado"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }
              >
                {STATUS_LABEL[status] || status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              {dossier?.dossier_number ? `Nº ${dossier.dossier_number}` : "Nenhum dossiê gerado ainda."}
              {dossier?.verification_code && `  •  Verificação ${dossier.verification_code}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={reload} className="gap-2">
              <RefreshCcw className="h-4 w-4" /> Atualizar
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={busy !== null || !canGenerate || status === "cancelado"}
              className="gap-2 bg-primary text-white"
            >
              {busy === "generate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Gerar dossiê
            </Button>
            <Button
              variant="outline"
              disabled={!dossier?.final_pdf_url || busy !== null}
              onClick={() => handleDownload("pdf")}
              className="gap-2"
            >
              {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              PDF consolidado
            </Button>
            <Button
              variant="outline"
              disabled={!dossier?.zip_url || busy !== null}
              onClick={() => handleDownload("zip")}
              className="gap-2"
            >
              {busy === "zip" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
              ZIP completo
            </Button>
            <Button
              variant="outline"
              disabled={!dossier?.id || status === "entregue" || status === "cancelado" || busy !== null}
              onClick={handleDeliver}
              className="gap-2"
            >
              <Truck className="h-4 w-4" /> Marcar como entregue
            </Button>
            <Button
              variant="ghost"
              disabled={!dossier?.id || status === "cancelado" || busy !== null}
              onClick={handleCancel}
              className="gap-2 text-red-600"
            >
              <Ban className="h-4 w-4" /> Cancelar
            </Button>
          </div>
        </div>
      </div>

      {/* Blockers */}
      {!canGenerate && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-amber-900 text-sm uppercase tracking-wide">
                Pendências para gerar o dossiê
              </p>
              <ul className="mt-2 space-y-1 text-sm text-amber-800">
                {blockers.map((b) => (
                  <li key={b.key}>
                    • {b.label}
                    {b.detail ? `  —  ${b.detail}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {/* Summary */}
        <div className="md:col-span-2 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
          <h4 className="font-black uppercase tracking-widest text-xs text-slate-500">Resumo</h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <Item icon={<FileText className="h-4 w-4" />} label="Processo" value={bundle.process.process_type} />
            <Item icon={<UserIcon className="h-4 w-4" />} label="Cliente" value={bundle.customer?.name || "—"} />
            <Item icon={<Ship className="h-4 w-4" />} label="Embarcação" value={bundle.vessel?.name || "—"} />
            <Item icon={<FileCheck className="h-4 w-4" />} label="Documentos" value={`${bundle.procDocs.length} vinculados`} />
            <Item icon={<Download className="h-4 w-4" />} label="PDFs gerados" value={`${bundle.generated.length}`} />
            <Item icon={<Package className="h-4 w-4" />} label="Anexos" value={`${bundle.uploads.length + bundle.attachments.length}`} />
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h5 className="font-black uppercase tracking-widest text-[10px] text-slate-500 mb-2">
              Documentos obrigatórios
            </h5>
            <ul className="text-sm space-y-1">
              {bundle.procDocs
                .filter((d) => d.is_mandatory)
                .map((d) => (
                  <li key={d.id} className="flex justify-between gap-2">
                    <span className="text-slate-700">{d.template_name || d.template_code || d.document_type}</span>
                    <Badge
                      variant="outline"
                      className={
                        d.status === "approved" || d.status === "aprovado"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }
                    >
                      {d.status || "pendente"}
                    </Badge>
                  </li>
                ))}
              {bundle.procDocs.filter((d) => d.is_mandatory).length === 0 && (
                <li className="text-xs text-slate-400">Nenhum obrigatório vinculado.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Checklist */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <h4 className="font-black uppercase tracking-widest text-xs text-slate-500 mb-3">Checklist final</h4>
          <ul className="space-y-2">
            {checklist.map((c) => (
              <li key={c.key} className="flex items-start gap-2 text-sm">
                {c.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-slate-700">{c.label}</p>
                  {c.detail && <p className="text-[11px] text-slate-400">{c.detail}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Item({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">{icon}</div>
      <div>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</p>
        <p className="text-sm font-bold text-navy truncate">{value}</p>
      </div>
    </div>
  );
}
