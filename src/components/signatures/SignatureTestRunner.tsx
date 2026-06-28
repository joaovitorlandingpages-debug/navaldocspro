import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Beaker, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { signaturesService, buildPublicSignUrl } from "@/services/signatures";

type StepStatus = "pending" | "running" | "ok" | "warn" | "fail";
interface Step { id: string; label: string; status: StepStatus; detail?: string; }

const TEST_TITLE_PREFIX = "[TESTE AUTO]";

export function SignatureTestRunner({ companyId, userId, onChanged }: {
  companyId: string; userId?: string; onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);

  const update = (id: string, patch: Partial<Step>) =>
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));

  const initialSteps: Step[] = [
    { id: "create", label: "1. Criar solicitação demo", status: "pending" },
    { id: "participant", label: "2. Participante + token", status: "pending" },
    { id: "open", label: "3-4. Simular abertura do link", status: "pending" },
    { id: "sign", label: "5-8. Aceitar termo + assinar (typed)", status: "pending" },
    { id: "complete", label: "9. Concluir solicitação", status: "pending" },
    { id: "pdf", label: "10-11. PDF assinado + certificado", status: "pending" },
    { id: "code", label: "12. Código de verificação", status: "pending" },
    { id: "verify", label: "13. Página /verificar-assinatura", status: "pending" },
    { id: "downloads", label: "14. Downloads disponíveis", status: "pending" },
    { id: "anchor", label: "16. Âncoras: lookup + fallback", status: "pending" },
    { id: "log", label: "17. Log signature_test_executed", status: "pending" },
  ];

  const run = async () => {
    setRunning(true);
    setVerifyUrl(null);
    setSteps(initialSteps);
    const startedAt = Date.now();
    let requestId: string | null = null;
    try {
      // 1. Create
      update("create", { status: "running" });
      const created = await signaturesService.create({
        company_id: companyId,
        title: `${TEST_TITLE_PREFIX} ${new Date().toLocaleString("pt-BR")}`,
        signing_order: "free",
        created_by: userId,
        participants: [{
          name: "Participante de Teste",
          email: "teste@navaldocs.local",
          role: "cliente",
        }],
      });
      requestId = created.request.id;
      update("create", { status: "ok", detail: `request_id=${requestId!.slice(0, 8)}…` });

      // 2. Participant
      update("participant", { status: "running" });
      const part = created.participants[0];
      const token = part.access_token;
      update("participant", { status: "ok", detail: `token=${token.slice(0, 10)}…` });

      // 3-4. Open
      update("open", { status: "running" });
      await signaturesService.logView(token);
      update("open", { status: "ok", detail: buildPublicSignUrl(token) });

      // 5-8. Sign
      update("sign", { status: "running" });
      await signaturesService.signByToken(token, {
        signature_type: "typed",
        signature_data: "Assinatura Teste Automatizado",
        accepted_terms: true,
      });
      update("sign", { status: "ok" });

      // 9. Completion
      update("complete", { status: "running" });
      const { data: reqAfter } = await supabase
        .from("signature_requests").select("status,final_signed_pdf_url,evidence_certificate_url")
        .eq("id", requestId).maybeSingle();
      if (reqAfter?.status !== "completed") {
        update("complete", { status: "fail", detail: `status=${reqAfter?.status}` });
        throw new Error("Não concluiu");
      }
      update("complete", { status: "ok" });

      // 10-11. PDFs
      update("pdf", { status: "running" });
      if (reqAfter.final_signed_pdf_url && reqAfter.evidence_certificate_url) {
        update("pdf", { status: "ok", detail: "ambos gerados" });
      } else {
        update("pdf", { status: "warn", detail: "PDFs não gerados (anon storage?) — verifique policies" });
      }

      // 12. Code
      update("code", { status: "running" });
      const { data: cert } = await supabase
        .from("signature_evidence_certificates")
        .select("verification_code,pdf_url")
        .eq("signature_request_id", requestId).maybeSingle();
      if (!cert?.verification_code) {
        update("code", { status: "fail", detail: "código ausente" });
        throw new Error("sem código");
      }
      update("code", { status: "ok", detail: cert.verification_code });

      // 13. Verify page
      update("verify", { status: "running" });
      const url = `${window.location.origin}/verificar-assinatura/${cert.verification_code}`;
      setVerifyUrl(url);
      const { data: check } = await supabase
        .from("signature_evidence_certificates")
        .select("id").eq("verification_code", cert.verification_code).maybeSingle();
      update("verify", { status: check ? "ok" : "fail", detail: url });

      // 14. Downloads
      update("downloads", { status: "running" });
      if (reqAfter.final_signed_pdf_url) {
        const { data: signed, error } = await supabase.storage
          .from("signed-documents").createSignedUrl(reqAfter.final_signed_pdf_url, 60);
        update("downloads", { status: error ? "warn" : "ok", detail: error?.message ?? "URL OK" });
      } else {
        update("downloads", { status: "warn", detail: "sem arquivos para baixar" });
      }

      // 15. Log
      update("log", { status: "running" });
      await supabase.from("activity_logs").insert({
        company_id: companyId,
        user_id: userId,
        action: "signature_test_executed",
        resource_type: "signature_requests",
        resource_id: requestId,
        metadata: { duration_ms: Date.now() - startedAt, verification_code: cert.verification_code },
      });
      update("log", { status: "ok" });

      toast.success("Teste concluído");
      onChanged();
    } catch (e: any) {
      toast.error(`Falha: ${e.message}`);
    } finally {
      setRunning(false);
    }
  };

  const cleanup = async () => {
    if (!confirm(`Apagar TODAS as solicitações com prefixo "${TEST_TITLE_PREFIX}"?`)) return;
    setCleaning(true);
    try {
      const { data: tests } = await supabase
        .from("signature_requests")
        .select("id")
        .eq("company_id", companyId)
        .like("title", `${TEST_TITLE_PREFIX}%`);
      const ids = (tests ?? []).map((t: any) => t.id);
      if (ids.length === 0) { toast.info("Nada para apagar"); return; }
      await supabase.from("signature_evidence_certificates").delete().in("signature_request_id", ids);
      await supabase.from("signature_events").delete().in("signature_request_id", ids);
      await supabase.from("signature_participants").delete().in("signature_request_id", ids);
      await supabase.from("signature_requests").delete().in("id", ids);
      toast.success(`${ids.length} solicitação(ões) de teste removidas`);
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setCleaning(false); }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50">
        <Beaker className="w-4 h-4" /> Rodar teste de assinatura
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Beaker className="w-5 h-5 text-amber-600" />
              Teste automatizado — Central de Assinaturas
            </DialogTitle>
          </DialogHeader>

          <div className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded p-3">
            Cria uma solicitação marcada como <code className="font-mono">{TEST_TITLE_PREFIX}</code>,
            executa o ciclo completo (criar → abrir → assinar → gerar PDF + certificado → verificar)
            e exibe o resultado de cada etapa. Use "Apagar dados de teste" depois.
          </div>

          <div className="space-y-1 max-h-[50vh] overflow-y-auto">
            {(steps.length ? steps : initialSteps).map(s => (
              <div key={s.id} className="flex items-start gap-2 py-1.5 border-b border-slate-100">
                <span className="text-base w-5">{ICON[s.status]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{s.label}</p>
                  {s.detail && <p className="text-[11px] text-slate-500 font-mono truncate">{s.detail}</p>}
                </div>
                <Badge variant="outline" className="text-[10px] capitalize">{s.status}</Badge>
              </div>
            ))}
          </div>

          {verifyUrl && (
            <a href={verifyUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline break-all">
              Abrir página de verificação →
            </a>
          )}

          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={cleanup} disabled={cleaning || running} className="gap-2">
              {cleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Apagar dados de teste
            </Button>
            <Button onClick={run} disabled={running} className="gap-2">
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Beaker className="w-4 h-4" />}
              Rodar teste agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const ICON: Record<StepStatus, string> = {
  pending: "⚪",
  running: "⏳",
  ok: "✅",
  warn: "⚠️",
  fail: "🔴",
};
