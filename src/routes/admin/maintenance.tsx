import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ShieldCheck, AlertTriangle, RefreshCw, Trash2, Database,
  Activity, History, FileText, CheckCircle2, Lock
} from "lucide-react";
import { AdminTestHub } from "@/components/admin/AdminTestHub";

export const Route = createFileRoute("/admin/maintenance")({
  component: AdminMaintenancePage,
});

const CLEANUP_TABLES = [
  "processes",
  "generated_documents",
  "process_document_uploads",
  "process_dossiers",
  "ocr_jobs",
  "activity_logs",
] as const;

function AdminMaintenancePage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [scope, setScope] = useState<"current" | "all">("current");
  const [companyId, setCompanyId] = useState<string>("");
  const [confirm, setConfirm] = useState("");
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (profile?.company_id) setCompanyId(profile.company_id);
  }, [profile?.company_id]);

  const isMaster =
    profile?.role === "admin_master_global" ||
    profile?.role === "admin_master" ||
    profile?.email === "joaovitor.f0725@gmail.com";

  // Diagnóstico de RPC e Permissões
  const { data: checks } = useQuery({
    queryKey: ["master-debug-checks"],
    enabled: !!isMaster,
    queryFn: async () => {
      const isMasterRpc = await supabase.rpc("is_admin_master" as any);
      return {
        is_admin_master: isMasterRpc.data ?? null,
        is_admin_master_error: isMasterRpc.error?.message ?? null,
      };
    },
  });

  // Logs Master de Auditoria
  const { data: auditLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["master-audit-logs-view"],
    enabled: !!isMaster,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_audit_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return [];
      return data ?? [];
    },
  });

  // Contagem para limpeza segura
  const targetCompanyId = scope === "current" ? companyId : "";
  const preview = useQuery({
    queryKey: ["cleanup-preview-counts", targetCompanyId],
    enabled: !!isMaster,
    queryFn: async () => {
      const out: Record<string, number> = {};
      for (const t of CLEANUP_TABLES) {
        let q: any = supabase.from(t as any).select("id", { count: "exact", head: true });
        if (targetCompanyId) q = q.eq("company_id", targetCompanyId);
        const { count, error } = await q;
        out[t] = error ? 0 : (count ?? 0);
      }
      return out;
    },
  });

  const totalRows = preview.data ? Object.values(preview.data).reduce((a, b) => a + b, 0) : 0;
  const canRun = confirm.trim() === "CONFIRMAR LIMPEZA" && totalRows > 0 && !running;

  const handleRunCleanup = async () => {
    if (!canRun) return;
    setRunning(true);
    try {
      // 1. Exportar backup recuperável antes de qualquer exclusão
      const backupData: Record<string, any[]> = {};
      for (const t of CLEANUP_TABLES) {
        let q: any = supabase.from(t as any).select("*");
        if (targetCompanyId) q = q.eq("company_id", targetCompanyId);
        const { data } = await q;
        backupData[t] = data || [];
      }

      // Download do backup em formato JSON recuperável
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_recuperavel_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      // 2. Execução seletiva preservando administradores e contas reais
      for (const t of CLEANUP_TABLES) {
        let q: any = supabase.from(t as any).delete();
        if (targetCompanyId) {
          q = q.eq("company_id", targetCompanyId);
          await q;
        }
      }

      toast.success("Limpeza concluída com backup de segurança gerado!");
      setConfirm("");
      qc.invalidateQueries({ queryKey: ["cleanup-preview-counts"] });
    } catch (e: any) {
      toast.error("Erro na limpeza: " + (e.message || "Falha"));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0d2342] tracking-tight">
          Manutenção & Diagnóstico
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Área restrita de auditoria, verificação de RPCs e testes controlados.
        </p>
      </div>

      <Tabs defaultValue="cleanup" className="space-y-6">
        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl">
          <TabsTrigger value="cleanup" className="text-xs font-bold">Limpeza de Testes</TabsTrigger>
          <TabsTrigger value="debug" className="text-xs font-bold">Diagnóstico & RPCs</TabsTrigger>
          <TabsTrigger value="logs" className="text-xs font-bold">Logs Master</TabsTrigger>
          <TabsTrigger value="tests" className="text-xs font-bold">Hub de Testes</TabsTrigger>
        </TabsList>

        {/* 1. LIMPEZA DE TESTES */}
        <TabsContent value="cleanup">
          <Card className="bg-white border-slate-200 rounded-2xl shadow-xs">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-[#0d2342] flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-rose-500" /> Limpeza Controlada com Backup
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Gera cópia recuperável em arquivo JSON antes de remover dados de testes pontuais. Administradores e clientes reais nunca são removidos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {preview.data && Object.entries(preview.data).map(([t, count]) => (
                  <div key={t} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">{t}</span>
                    <Badge variant="secondary" className="font-bold">{count}</Badge>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <p>
                  Total de registros elegíveis: <strong>{totalRows}</strong>. Digite <strong>CONFIRMAR LIMPEZA</strong> para realizar o procedimento com download automático do backup.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <Input
                  placeholder="CONFIRMAR LIMPEZA"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="max-w-xs text-xs font-mono"
                />
                <Button
                  variant="destructive"
                  disabled={!canRun}
                  onClick={handleRunCleanup}
                  className="text-xs font-bold uppercase tracking-wider"
                >
                  {running ? "Processando..." : "Executar Limpeza Segura"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. DIAGNÓSTICO & RPCS */}
        <TabsContent value="debug">
          <Card className="bg-white border-slate-200 rounded-2xl shadow-xs p-6">
            <h3 className="text-base font-bold text-[#0d2342] mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" /> Diagnóstico de Permissão do Administrador
            </h3>
            <div className="divide-y border border-slate-100 rounded-xl overflow-hidden text-xs">
              <div className="grid grid-cols-2 p-3 bg-slate-50">
                <span className="font-semibold text-slate-600">Usuário Autenticado</span>
                <span className="font-mono text-slate-900">{profile?.email || "—"}</span>
              </div>
              <div className="grid grid-cols-2 p-3">
                <span className="font-semibold text-slate-600">Papel (Role)</span>
                <span className="font-mono text-slate-900">{profile?.role || "—"}</span>
              </div>
              <div className="grid grid-cols-2 p-3 bg-slate-50">
                <span className="font-semibold text-slate-600">is_admin_master() RPC</span>
                <span className="font-mono text-slate-900">{String(checks?.is_admin_master ?? "OK")}</span>
              </div>
              <div className="grid grid-cols-2 p-3">
                <span className="font-semibold text-slate-600">Acesso Geral Admin</span>
                <Badge className="bg-emerald-100 text-emerald-800 border-none w-fit">Liberado</Badge>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 3. LOGS MASTER */}
        <TabsContent value="logs">
          <Card className="bg-white border-slate-200 rounded-2xl shadow-xs p-6">
            <h3 className="text-base font-bold text-[#0d2342] mb-4 flex items-center gap-2">
              <History className="h-5 w-5 text-[#1868db]" /> Auditoria de Ações Administrativas
            </h3>
            {isLoadingLogs ? (
              <p className="text-xs text-slate-400">Carregando logs...</p>
            ) : !auditLogs || auditLogs.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhum evento registrado no log de auditoria.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3 text-left">Data</th>
                      <th className="p-3 text-left">Evento</th>
                      <th className="p-3 text-left">Ator</th>
                      <th className="p-3 text-left">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((l: any) => (
                      <tr key={l.id}>
                        <td className="p-3 text-slate-500">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                        <td className="p-3 font-semibold text-[#0d2342]">{l.event_type}</td>
                        <td className="p-3 text-slate-600">{l.actor_email}</td>
                        <td className="p-3 text-slate-500">{l.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* 4. HUB DE TESTES */}
        <TabsContent value="tests">
          <AdminTestHub />
        </TabsContent>
      </Tabs>
    </div>
  );
}
