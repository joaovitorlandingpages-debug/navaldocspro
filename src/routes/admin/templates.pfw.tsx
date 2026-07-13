/**
 * Sprint 4D F.2.d.b — Matriz "Modelos do Processo Guiado" (PFW).
 * Cada linha = (ServiceKind, documento exigido). Admin escolhe qual template
 * publicado atende cada célula e ativa o mapeamento.
 * Não publica templates automaticamente.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { SERVICES } from "@/types/service-requirements";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle, ArrowLeft, CheckCircle2, ShieldAlert, Settings, FileWarning, Loader2,
} from "lucide-react";

export const Route = createFileRoute("/admin/templates/pfw")({
  component: PfwMatrixPage,
  head: () => ({
    meta: [
      { title: "Modelos do Processo Guiado — Admin" },
      { name: "description", content: "Configuração dos modelos obrigatórios por tipo de serviço do Processo Guiado." },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: ({ error, reset }) => {
    const navigate = useNavigate();
    return (
      <div className="p-10 max-w-md mx-auto text-center">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <p className="font-semibold mb-2">Erro ao carregar a matriz</p>
        <p className="text-sm text-slate-500 mb-4">{error.message}</p>
        <Button onClick={() => { reset(); navigate({ to: "/admin/templates/pfw" }); }}>
          Tentar novamente
        </Button>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="p-10 text-center text-slate-500">Página não encontrada.</div>
  ),
});

type Cell = {
  serviceKind: string;
  serviceName: string;
  processType: string;
  documentLabel: string;
  required: boolean;
};

const CELLS: Cell[] = SERVICES.flatMap((s) =>
  s.generatedDocs.map((doc) => ({
    serviceKind: s.kind,
    serviceName: s.name,
    processType: s.processType,
    documentLabel: doc,
    required: true,
  })),
);

// Candidatos "inequívocos" pré-mapeados (Seção C do plano).
const UNAMBIGUOUS_HINTS: Record<string, string> = {
  "renovacao|Requerimento": "Requerimento Renovação",
  "transferencia|Requerimento": "Requerimento de Transferência",
  "registro_inicial|Requerimento": "Requerimento de Registro Inicial de Embarcação",
  "alteracao_motor|Requerimento": "Requerimento de Alteração de Motor",
  "segunda_via|Requerimento": "Requerimento de Segunda Via TIE/TIEM",
  "regularizacao|Requerimento": "Requerimento de Regularização de Embarcação",
};

// Documentos com decisão humana pendente (Seção D).
const AMBIGUOUS_LABELS = new Set(["Memorial", "Declaração", "Contrato", "GRU"]);

function PfwMatrixPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const role = profile?.role ?? "";
  const isMaster = role === "admin_master" || role === "admin_master_global";
  const canAdmin = isMaster || ["company_admin", "admin", "manager", "owner"].includes(role);
  const companyId = profile?.company_id ?? null;
  const [dialogCell, setDialogCell] = useState<Cell | null>(null);

  const templatesQ = useQuery({
    queryKey: ["pfw-published-templates"],
    enabled: !!user && canAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("id, name, category, process_type, is_global, company_id, lifecycle_status")
        .eq("lifecycle_status", "published")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const mappingsQ = useQuery({
    queryKey: ["pfw-mappings"],
    enabled: !!user && canAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("process_document_template_mappings" as any)
        .select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const templates = templatesQ.data ?? [];
  const mappings = (mappingsQ.data ?? []) as any[];

  const findMapping = (cell: Cell) => {
    // Prioridade: empresa ativo > global ativo > empresa inativo > global inativo.
    const list = mappings.filter(
      (m) => m.service_kind === cell.serviceKind && m.document_label === cell.documentLabel,
    );
    const cActive = list.find((m) => m.is_active && m.company_id === companyId);
    if (cActive) return cActive;
    const gActive = list.find((m) => m.is_active && m.company_id === null);
    if (gActive) return gActive;
    const cAny = list.find((m) => m.company_id === companyId);
    if (cAny) return cAny;
    const gAny = list.find((m) => m.company_id === null);
    if (gAny) return gAny;
    return null;
  };

  const stateFor = (cell: Cell, m: any | null) => {
    if (!m) {
      if (AMBIGUOUS_LABELS.has(cell.documentLabel)) {
        return { label: "Modelo pendente de definição administrativa", tone: "warn" as const };
      }
      return { label: "Sem modelo", tone: "warn" as const };
    }
    if (m.is_active) return { label: "Configurado e ativo", tone: "ok" as const };
    return { label: "Rascunho pendente", tone: "muted" as const };
  };

  if (!user) {
    return (
      <div className="p-10 max-w-md mx-auto text-center">
        <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <p className="font-semibold">Autenticação necessária</p>
      </div>
    );
  }
  if (!canAdmin) {
    return (
      <div className="p-10 max-w-md mx-auto text-center">
        <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <p className="font-semibold">Sem permissão</p>
      </div>
    );
  }

  const loading = templatesQ.isLoading || mappingsQ.isLoading;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        <div>
          <Link to="/admin/templates" className="text-xs text-slate-500 hover:underline inline-flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3 w-3" /> Voltar aos modelos
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Modelos do Processo Guiado
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Vincule cada documento exigido pelo Processo Guiado a um modelo publicado.
            Somente modelos publicados podem ser ativados. Nenhuma minuta jurídica é
            promovida automaticamente.
          </p>
        </div>

        <Card className="p-4 border-amber-200 bg-amber-50 text-amber-900 text-sm flex gap-3">
          <FileWarning className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            Enquanto um serviço tiver documento sem modelo ativo, o Processo Guiado
            continua funcionando no fluxo legado (PDFs gerados sem template canônico) e
            registra telemetria de uso. A migração para o pipeline canônico será feita
            serviço por serviço, apenas quando todos os modelos obrigatórios estiverem
            configurados.
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-600 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Serviço</th>
                    <th className="text-left px-4 py-3">Documento</th>
                    <th className="text-left px-4 py-3">Modelo configurado</th>
                    <th className="text-left px-4 py-3">Escopo</th>
                    <th className="text-left px-4 py-3">Estado</th>
                    <th className="text-right px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {CELLS.map((cell, i) => {
                    const m = findMapping(cell);
                    const t = m ? templates.find((x: any) => x.id === m.template_id) : null;
                    const st = stateFor(cell, m);
                    const hint = UNAMBIGUOUS_HINTS[`${cell.serviceKind}|${cell.documentLabel}`];
                    return (
                      <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-medium">{cell.serviceName}</div>
                          <div className="text-xs text-slate-500">{cell.serviceKind}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{cell.documentLabel}</div>
                          {hint && !m && (
                            <div className="text-xs text-emerald-700 mt-0.5">
                              Sugestão: {hint}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {t ? (
                            <>
                              <div className="font-medium">{t.name}</div>
                              <div className="text-xs text-slate-500">{t.category ?? "—"}</div>
                            </>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {m ? (
                            <Badge variant={m.company_id ? "secondary" : "outline"}>
                              {m.company_id ? "Empresa" : "Global"}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {st.tone === "ok" && (
                            <span className="inline-flex items-center gap-1 text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" /> {st.label}
                            </span>
                          )}
                          {st.tone === "warn" && (
                            <span className="inline-flex items-center gap-1 text-amber-700">
                              <AlertTriangle className="h-4 w-4" /> {st.label}
                            </span>
                          )}
                          {st.tone === "muted" && (
                            <span className="text-slate-500">{st.label}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => setDialogCell(cell)}>
                            Configurar
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <ConfigureDialog
        open={!!dialogCell}
        onOpenChange={(o) => !o && setDialogCell(null)}
        cell={dialogCell}
        templates={templates}
        currentMapping={dialogCell ? findMapping(dialogCell) : null}
        companyId={companyId}
        isMaster={isMaster}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["pfw-mappings"] });
          setDialogCell(null);
        }}
      />
    </div>
  );
}

function ConfigureDialog({
  open, onOpenChange, cell, templates, currentMapping, companyId, isMaster, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cell: Cell | null;
  templates: any[];
  currentMapping: any | null;
  companyId: string | null;
  isMaster: boolean;
  onSaved: () => void;
}) {
  const [templateId, setTemplateId] = useState<string>("");
  const [scope, setScope] = useState<"company" | "global">("company");
  const [activate, setActivate] = useState(true);

  useMemo(() => {
    if (open && cell) {
      setTemplateId(currentMapping?.template_id ?? "");
      setScope(currentMapping?.company_id ? "company" : (isMaster ? "global" : "company"));
      setActivate(currentMapping?.is_active ?? true);
    }
  }, [open, cell, currentMapping, isMaster]);

  // Candidatos: filtra templates que "cheiram" a esse documento (categoria/nome).
  const candidates = useMemo(() => {
    if (!cell) return [];
    const label = cell.documentLabel.toLowerCase();
    return templates.filter((t) => {
      const name = (t.name ?? "").toLowerCase();
      const cat = (t.category ?? "").toLowerCase();
      if (name.includes(label)) return true;
      if (cat.includes(label)) return true;
      // Casos especiais
      if (label === "requerimento" && cat === "requerimento") return true;
      if (label === "gru" && (name.includes("gru") || cat.includes("gru"))) return true;
      if (label === "memorial" && cat.includes("engenh")) return true;
      if (label === "declaração" && cat.includes("declara")) return true;
      if (label === "contrato" && (name.includes("contrato") || name.includes("transfer"))) return true;
      return false;
    });
  }, [templates, cell]);

  const save = useMutation({
    mutationFn: async () => {
      if (!cell || !templateId) throw new Error("Selecione um modelo.");
      const targetCompany = scope === "global" ? null : companyId;
      if (scope === "global" && !isMaster) throw new Error("Somente admin master pode salvar mapeamento global.");
      if (scope === "company" && !companyId) throw new Error("Sem empresa vinculada ao usuário.");

      const payload: any = {
        company_id: targetCompany,
        service_kind: cell.serviceKind,
        document_label: cell.documentLabel,
        process_type: cell.processType,
        template_id: templateId,
        is_active: activate,
        required: true,
      };
      if (currentMapping && (currentMapping.company_id ?? null) === (targetCompany ?? null)) {
        const { error } = await supabase
          .from("process_document_template_mappings" as any)
          .update(payload)
          .eq("id", currentMapping.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("process_document_template_mappings" as any)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Mapeamento salvo."); onSaved(); },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  if (!cell) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurar modelo</DialogTitle>
          <DialogDescription>
            {cell.serviceName} — {cell.documentLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Modelo publicado</label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder="Escolha um modelo publicado" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {candidates.length === 0 && (
                  <div className="px-3 py-2 text-xs text-slate-500">
                    Nenhum modelo publicado corresponde a este documento. Publique um modelo em "Modelos de Documentação".
                  </div>
                )}
                {candidates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} {t.is_global ? "(global)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Escopo</label>
            <Select value={scope} onValueChange={(v) => setScope(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="company">Empresa (somente minha empresa)</SelectItem>
                {isMaster && <SelectItem value="global">Global (todas as empresas)</SelectItem>}
              </SelectContent>
            </Select>
            {scope === "global" && !isMaster && (
              <p className="text-xs text-amber-700 mt-1">Somente admin master.</p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={activate} onChange={(e) => setActivate(e.target.checked)} />
            Ativar mapeamento agora
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !templateId}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
