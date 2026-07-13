/**
 * Onda C+ — Foco no item de checklist.
 * Abre a ação certa (gerar/editar/anexar/assinar/histórico) para um
 * `document_checklists.id` específico, sem forçar o usuário a procurar
 * o documento novamente.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileUploader } from "@/components/FileUploader";
import { openStoredFile } from "@/utils/file-preview";
import { signaturesService } from "@/services/signatures";
import { useAuth } from "@/hooks/useAuth";
import {
  Loader2, FileText, Eye, Upload, Signature, History, Sparkles, Send,
} from "lucide-react";

export type FocusAction = "gerar" | "editar" | "anexar" | "assinar" | "historico";

interface Props {
  processId: string;
  process: any;
  checklistId: string | null;
  action: FocusAction | null;
  onClose: () => void;
  onChanged?: () => void;
}

export function ProcessItemFocusDialog({ processId, process, checklistId, action, onClose, onChanged }: Props) {
  const open = !!checklistId;
  const qc = useQueryClient();
  const { profile } = useAuth();
  const [tab, setTab] = useState<FocusAction>("gerar");
  const [busy, setBusy] = useState(false);
  const [signeeName, setSigneeName] = useState("");
  const [signeeEmail, setSigneeEmail] = useState("");

  useEffect(() => {
    if (action) setTab(action);
  }, [action]);

  const { data: item, isLoading } = useQuery({
    queryKey: ["checklist-item", checklistId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_checklists")
        .select("id,item_name,status,is_mandatory,is_conditional,requires_signature,requires_ocr,document_id,template_id,document_role,notes")
        .eq("id", checklistId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: template } = useQuery({
    queryKey: ["checklist-template", item?.template_id],
    enabled: !!item?.template_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("document_templates")
        .select("*")
        .eq("id", item!.template_id!)
        .maybeSingle();
      return data;
    },
  });

  const { data: linkedDoc } = useQuery({
    queryKey: ["checklist-doc", item?.document_id],
    enabled: !!item?.document_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("generated_documents")
        .select("id,name,generated_file_url,signed_file_url,status,signature_status")
        .eq("id", item!.document_id!)
        .maybeSingle();
      return data;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["checklist-history", checklistId, item?.document_id],
    enabled: open && tab === "historico",
    queryFn: async () => {
      const events: any[] = [];
      if (item?.document_id) {
        const { data: sigReqs } = await supabase
          .from("signature_requests")
          .select("id,title,status,created_at")
          .eq("document_id", item.document_id);
        (sigReqs ?? []).forEach((r: any) => events.push({
          date: r.created_at, label: `Assinatura: ${r.title} — ${r.status}`,
        }));
      }
      const { data: audits } = await supabase
        .from("document_audit_logs")
        .select("action,created_at,details")
        .eq("process_id", processId)
        .order("created_at", { ascending: false })
        .limit(30);
      (audits ?? []).forEach((a: any) => {
        const label = `${a.action}${a.details?.item_name ? " — " + a.details.item_name : ""}`;
        if (!item?.item_name || label.toLowerCase().includes((item.item_name || "").toLowerCase())) {
          events.push({ date: a.created_at, label });
        }
      });
      return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
  });

  const hasDoc = !!linkedDoc?.generated_file_url || !!linkedDoc?.signed_file_url;
  const canGenerate = !!template;

  const kindLabel = useMemo(() => {
    if (!item) return "";
    if (item.is_conditional) return "Condicional";
    if (item.is_mandatory) return "Obrigatório";
    return "Opcional";
  }, [item]);

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["blueprint-checklist", processId] });
    qc.invalidateQueries({ queryKey: ["checklist-item", checklistId] });
    qc.invalidateQueries({ queryKey: ["checklist-doc", item?.document_id] });
    onChanged?.();
  };

  const handleGenerate = async () => {
    if (!template) {
      toast.error("Este item não tem template vinculado. Vincule um modelo no painel do processo.");
      return;
    }
    // Sub-fatia F.2.b — C5 migrado ao helper tipado (evento transitório).
    const { dispatchGenerateDocument } = await import("@/lib/events/generateDocumentEvent");
    dispatchGenerateDocument(template as any);
    onClose();
  };

  const handleOpenPreview = async () => {
    if (linkedDoc) {
      const url = linkedDoc.signed_file_url || linkedDoc.generated_file_url;
      if (url) {
        window.open(url, "_blank");
        return;
      }
      try {
        await openStoredFile(linkedDoc as any);
        return;
      } catch { /* fallthrough */ }
    }
    handleGenerate();
  };

  const handleAttachmentComplete = async () => {
    if (!checklistId) return;
    await supabase
      .from("document_checklists")
      .update({ status: "attached" })
      .eq("id", checklistId);
    toast.success("Anexo vinculado ao item.");
    refreshAll();
  };

  const handleCreateSignature = async () => {
    if (!profile?.company_id) return;
    if (!signeeName || !signeeEmail) {
      toast.error("Informe nome e e-mail do signatário.");
      return;
    }
    setBusy(true);
    try {
      await signaturesService.create({
        company_id: profile.company_id,
        title: `${item?.item_name || "Documento"} — ${process?.title || processId.slice(0, 8)}`,
        process_id: processId,
        document_id: item?.document_id ?? undefined,
        customer_id: process?.customer_id ?? undefined,
        signing_order: "sequential",
        created_by: profile.id,
        participants: [{ name: signeeName, email: signeeEmail, role: "cliente" }],
      });
      toast.success("Solicitação de assinatura criada.");
      refreshAll();
      onClose();
    } catch (e: any) {
      toast.error("Falha ao criar assinatura: " + (e?.message ?? "erro"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl w-[calc(100vw-1rem)] max-h-[92vh] sm:max-h-[90vh] max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:rounded-none max-sm:w-screen overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-navy">
            <Sparkles className="h-4 w-4 text-primary" />
            {item?.item_name || "Carregando..."}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap gap-2 pt-2">
            {item && (
              <>
                <Badge variant="outline" className="text-[10px] font-black uppercase">{kindLabel}</Badge>
                <Badge variant="outline" className="text-[10px] font-black uppercase">{item.status || "pendente"}</Badge>
                {item.requires_signature && <Badge className="text-[10px] font-black uppercase bg-amber-100 text-amber-700">Assina</Badge>}
                {item.requires_ocr && <Badge className="text-[10px] font-black uppercase bg-sky-100 text-sky-700">OCR</Badge>}
                {template && <Badge className="text-[10px] font-black uppercase bg-slate-100 text-slate-600">{template.name}</Badge>}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !item ? (
          <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as FocusAction)} className="w-full">
            <TabsList className="grid grid-cols-5 h-auto p-1 bg-slate-100 rounded-xl">
              <TabsTrigger value="gerar" className="text-[10px] font-black uppercase"><FileText className="h-3 w-3 mr-1" />Gerar</TabsTrigger>
              <TabsTrigger value="editar" className="text-[10px] font-black uppercase"><Eye className="h-3 w-3 mr-1" />Editar</TabsTrigger>
              <TabsTrigger value="anexar" className="text-[10px] font-black uppercase"><Upload className="h-3 w-3 mr-1" />Anexar</TabsTrigger>
              <TabsTrigger value="assinar" className="text-[10px] font-black uppercase" disabled={!item.requires_signature && !item.document_id}><Signature className="h-3 w-3 mr-1" />Assinar</TabsTrigger>
              <TabsTrigger value="historico" className="text-[10px] font-black uppercase"><History className="h-3 w-3 mr-1" />Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="gerar" className="pt-4 space-y-3">
              <p className="text-sm text-slate-600">
                {canGenerate
                  ? `Gerar ${template!.name} com os dados atuais do processo, cliente e embarcação.`
                  : "Este item ainda não tem template vinculado. Configure o pacote do tipo de processo no admin."}
              </p>
              <Button onClick={handleGenerate} disabled={!canGenerate} className="w-full rounded-xl">
                <FileText className="h-4 w-4 mr-2" /> Gerar agora
              </Button>
            </TabsContent>

            <TabsContent value="editar" className="pt-4 space-y-3">
              <p className="text-sm text-slate-600">
                {hasDoc
                  ? "Abrir o documento já gerado para revisão."
                  : "Nenhum documento gerado ainda — abrir o editor de geração."}
              </p>
              <Button onClick={handleOpenPreview} className="w-full rounded-xl">
                <Eye className="h-4 w-4 mr-2" /> {hasDoc ? "Abrir documento" : "Abrir editor"}
              </Button>
            </TabsContent>

            <TabsContent value="anexar" className="pt-4 space-y-3">
              <p className="text-sm text-slate-600">Anexar um arquivo diretamente a este item do checklist.</p>
              <FileUploader
                processId={processId}
                bucket="process-attachments"
                category={item.item_name}
                onSuccess={() => { void handleAttachmentComplete(); }}
              />
            </TabsContent>

            <TabsContent value="assinar" className="pt-4 space-y-3">
              {!item.document_id && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
                  Este item ainda não tem documento gerado. A solicitação será criada apenas para o processo.
                </p>
              )}
              <div className="space-y-2">
                <Input placeholder="Nome do signatário" value={signeeName} onChange={(e) => setSigneeName(e.target.value)} />
                <Input placeholder="E-mail do signatário" type="email" value={signeeEmail} onChange={(e) => setSigneeEmail(e.target.value)} />
              </div>
              <Button onClick={handleCreateSignature} disabled={busy} className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 text-white">
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Criar solicitação de assinatura
              </Button>
            </TabsContent>

            <TabsContent value="historico" className="pt-4">
              {history.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">Nenhum evento registrado para este item.</p>
              ) : (
                <ul className="space-y-2 max-h-72 overflow-y-auto">
                  {history.map((e, i) => (
                    <li key={i} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 text-xs">
                      <p className="font-bold text-navy">{e.label}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{new Date(e.date).toLocaleString("pt-BR")}</p>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ProcessItemFocusDialog;
