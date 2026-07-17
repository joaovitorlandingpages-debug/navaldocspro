/**
 * Sprint 4D.2.d — Fatia C
 * Detalhe de modelo: ciclo de vida completo + histórico de versões.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Star, StarOff, Archive, RotateCcw, GitBranch, MoreVertical,
  Loader2, AlertTriangle, Globe, Building2, ShieldAlert, History, FileText,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TemplateEditor, type EditorDraft } from "@/components/admin/templates/TemplateEditor";
import { validateTemplate, canPublish } from "@/lib/templates/templateValidator";
import { RestoreVersionDialog } from "@/components/admin/templates/RestoreVersionDialog";
import { invalidateDocsCoverage } from "@/hooks/useDocumentationCoverage";

export const Route = createFileRoute("/admin/templates/$id")({
  component: AdminTemplateDetail,
  head: () => ({ meta: [{ title: "Modelo — Admin" }, { name: "robots", content: "noindex" }] }),
  errorComponent: ({ error, reset }) => (
    <div className="p-10 max-w-md mx-auto text-center">
      <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
      <p className="font-semibold mb-2">Erro ao carregar modelo</p>
      <p className="text-sm text-slate-500 mb-4">{error.message}</p>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-10 text-center text-slate-500">Modelo não encontrado.</div>
  ),
});

function AdminTemplateDetail() {
  const { id } = Route.useParams();
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const role = profile?.role ?? "";
  const isMaster = role === "admin_master" || role === "admin_master_global";

  const [publishOpen, setPublishOpen] = useState(false);
  const [changelog, setChangelog] = useState("");
  const [notes, setNotes] = useState("");
  const [restoreSource, setRestoreSource] = useState<any | null>(null);

  const templateQ = useQuery({
    queryKey: ["admin-template", id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("id, name, code, category, process_type, region_tag, is_global, is_active, company_id, updated_at, created_at, version, version_number, lifecycle_status, is_default_for_scope, description, document_structure, base_content, metadata")
        .eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const versionsQ = useQuery({
    queryKey: ["admin-template-versions", id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("template_versions")
        .select("id, version, version_number, status, changelog, notes, created_by, created_at, released_at, base_content, document_structure, metadata, restored_from_version_id, restore_reason, change_type")
        .eq("template_id", id)
        .order("version_number", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const usageQ = useQuery({
    queryKey: ["admin-template-usage", id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("template_usage_count", { p_template_id: id });
      if (error) throw error;
      return (data as number) ?? 0;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-template", id] });
    qc.invalidateQueries({ queryKey: ["admin-template-versions", id] });
    qc.invalidateQueries({ queryKey: ["admin-templates-canonical"] });
    // Gate 0.1 — toda mutação de template afeta cobertura/saúde documental.
    void invalidateDocsCoverage(qc);
  };

  const rpc = async (fn: string, params: Record<string, unknown>) => {
    const { data, error } = await (supabase.rpc as any)(fn, params);
    if (error) throw new Error(error.message);
    return data;
  };

  const publishMut = useMutation({
    mutationFn: async () => rpc("template_publish_version", {
      p_template_id: id,
      p_changelog: changelog.trim(),
      p_document_structure: templateQ.data?.document_structure ?? {},
      p_base_content: templateQ.data?.base_content ?? null,
      p_metadata: templateQ.data?.metadata ?? {},
      p_notes: notes || null,
    }),
    onSuccess: () => {
      toast.success("Nova versão publicada");
      setPublishOpen(false); setChangelog(""); setNotes("");
      invalidate();
    },
    onError: (e: Error) => toast.error(friendlyError(e.message)),
  });

  const archiveMut = useMutation({
    mutationFn: async () => rpc("template_archive", { p_template_id: id }),
    onSuccess: () => { toast.success("Modelo arquivado"); invalidate(); },
    onError: (e: Error) => toast.error(friendlyError(e.message)),
  });

  const restoreMut = useMutation({
    mutationFn: async () => rpc("template_restore", { p_template_id: id }),
    onSuccess: () => { toast.success("Modelo restaurado como rascunho"); invalidate(); },
    onError: (e: Error) => toast.error(friendlyError(e.message)),
  });

  const setDefaultMut = useMutation({
    mutationFn: async () => rpc("template_set_default", { p_template_id: id }),
    onSuccess: () => { toast.success("Definido como padrão do escopo"); invalidate(); },
    onError: (e: Error) => toast.error(friendlyError(e.message)),
  });

  const unsetDefaultMut = useMutation({
    mutationFn: async () => rpc("template_unset_default", { p_template_id: id }),
    onSuccess: () => { toast.success("Padrão removido"); invalidate(); },
    onError: (e: Error) => toast.error(friendlyError(e.message)),
  });

  const saveDraftMut = useMutation({
    mutationFn: async (draft: EditorDraft) => {
      const { error } = await supabase
        .from("document_templates")
        .update({
          name: draft.name,
          code: draft.code || null,
          category: draft.category || null,
          process_type: draft.process_type || null,
          region_tag: draft.region_tag || null,
          description: draft.description || null,
          base_content: draft.base_content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Rascunho salvo"); invalidate(); },
    onError: (e: Error) => toast.error(friendlyError(e.message)),
  });

  const newDraftMut = useMutation({
    mutationFn: async () => rpc("template_start_new_draft", { p_template_id: id }),
    onSuccess: () => {
      toast.success("Nova versão em rascunho criada — edite e publique quando estiver pronto.");
      invalidate();
    },
    onError: (e: Error) => toast.error(friendlyError(e.message)),
  });

  if (!user) {
    return (
      <div className="p-10 max-w-md mx-auto text-center">
        <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <p className="font-semibold">Autenticação necessária</p>
        <Button className="mt-4" asChild><Link to="/auth">Entrar</Link></Button>
      </div>
    );
  }

  if (templateQ.isLoading) {
    return <div className="p-10 flex flex-col items-center gap-3 text-slate-500"><Loader2 className="h-6 w-6 animate-spin" /><p>Carregando...</p></div>;
  }
  const t = templateQ.data;
  if (!t) return <div className="p-10 text-center text-slate-500">Modelo não encontrado.</div>;

  const lifecycle = t.lifecycle_status ?? "draft";
  const isOwn = t.company_id === profile?.company_id;
  const canEdit = isMaster || (isOwn && !t.is_global);
  const usage = usageQ.data ?? 0;

  const primaryCta = (() => {
    if (!canEdit) return null;
    if (lifecycle === "draft") {
      return <Button className="gap-2" onClick={() => setPublishOpen(true)}><GitBranch className="h-4 w-4" /> Publicar versão</Button>;
    }
    if (lifecycle === "published") {
      return (
        <Button className="gap-2" onClick={() => newDraftMut.mutate()} disabled={newDraftMut.isPending}>
          {newDraftMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
          Criar nova versão
        </Button>
      );
    }
    if (lifecycle === "archived") {
      return <Button variant="outline" className="gap-2" onClick={() => restoreMut.mutate()} disabled={restoreMut.isPending}>
        <RotateCcw className="h-4 w-4" /> Restaurar como rascunho
      </Button>;
    }
    return null;
  })();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        <Link to="/admin/templates" className="text-xs text-slate-500 hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Voltar aos modelos
        </Link>

        <div className="flex flex-col md:flex-row md:items-end gap-4 md:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2 flex-wrap">
              <FileText className="h-6 w-6 text-primary" />
              <span className="truncate">{t.name}</span>
              <StatusBadge status={lifecycle} />
              {t.is_default_for_scope && <Badge variant="outline" className="gap-1 border-primary/40 text-primary"><Star className="h-3 w-3 fill-current" /> Padrão</Badge>}
              {t.is_global
                ? <Badge variant="outline" className="gap-1"><Globe className="h-3 w-3" /> Global</Badge>
                : <Badge variant="outline" className="gap-1"><Building2 className="h-3 w-3" /> Empresa</Badge>}
            </h1>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3">
              {t.code && <span>Código: {t.code}</span>}
              {t.category && <span>Categoria: {t.category}</span>}
              {t.process_type && <span>Processo: {t.process_type}</span>}
              <span>v{t.version_number ?? t.version ?? 1}</span>
              <span>Usado em {usage} documento(s)</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {primaryCta}
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {lifecycle === "published" && !t.is_default_for_scope && (
                    <DropdownMenuItem onClick={() => setDefaultMut.mutate()}>
                      <Star className="h-4 w-4 mr-2" /> Definir como padrão
                    </DropdownMenuItem>
                  )}
                  {t.is_default_for_scope && (
                    <DropdownMenuItem onClick={() => unsetDefaultMut.mutate()}>
                      <StarOff className="h-4 w-4 mr-2" /> Remover padrão
                    </DropdownMenuItem>
                  )}
                  {lifecycle !== "archived" && (
                    <DropdownMenuItem onClick={() => archiveMut.mutate()} className="text-red-600">
                      <Archive className="h-4 w-4 mr-2" /> Arquivar
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {usage > 0 && (
          <Card className="p-4 bg-amber-50 border-amber-200 text-sm text-amber-900">
            Este modelo já foi usado em {usage} documento(s) — a exclusão está bloqueada.
            Use "Arquivar" para retirá-lo de novas gerações; documentos existentes preservam o snapshot da versão usada.
          </Card>
        )}

        <Tabs defaultValue="editor">
          <TabsList>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="mt-4">
            <TemplateEditor
              initial={{
                name: t.name ?? "",
                code: t.code ?? "",
                category: t.category ?? "",
                process_type: t.process_type ?? "",
                region_tag: (t as any).region_tag ?? "",
                description: (t as any).description ?? "",
                base_content: (t as any).base_content ?? "",
              }}
              readOnly={!canEdit || lifecycle !== "draft"}
              saving={saveDraftMut.isPending}
              onSave={(draft) => saveDraftMut.mutate(draft)}
            />
            {canEdit && lifecycle !== "draft" && (
              <p className="text-xs text-amber-700 mt-3">
                Modelo {lifecycle === "published" ? "publicado" : "arquivado"} — edições diretas estão bloqueadas.
                {lifecycle === "published" && " Use \"Criar nova versão\" para promover uma alteração."}
              </p>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card className="p-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <History className="h-4 w-4" /> Histórico de versões
              </h2>
              {versionsQ.isLoading && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
              {!versionsQ.isLoading && (versionsQ.data ?? []).length === 0 && (
                <p className="text-sm text-slate-500 py-6 text-center">
                  Nenhuma versão publicada ainda. {canEdit && "Use \"Publicar versão\" para publicar a v1."}
                </p>
              )}
              <div className="divide-y">
                {(() => {
                  const versions = versionsQ.data ?? [];
                  const currentPublished = versions.find((v: any) => v.status === "published") ?? null;
                  return versions.map((v: any) => (
                    <div key={v.id} className="py-3 flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">v{v.version_number ?? v.version}</span>
                          <VersionStatus status={v.status} />
                          {v.change_type === "restore" && v.restored_from_version_id && (
                            <Badge variant="outline" className="gap-1 text-primary border-primary/40">
                              <RotateCcw className="h-3 w-3" /> Restaurado
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {v.created_at && <>Criada {formatDistanceToNow(new Date(v.created_at), { addSuffix: true, locale: ptBR })}</>}
                        </div>
                        {v.restore_reason && (
                          <p className="text-xs text-primary mt-1">Motivo do rollback: {v.restore_reason}</p>
                        )}
                        {Array.isArray(v.changelog) && v.changelog.length > 0 && (
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                            {v.changelog.map((c: any) => c?.note).filter(Boolean).join(" · ") || v.notes || "—"}
                          </p>
                        )}
                      </div>
                      {canEdit && lifecycle !== "archived" && v.status !== "draft" && (
                        <Button
                          variant="outline" size="sm" className="gap-1 shrink-0"
                          onClick={() => setRestoreSource({ ...v, __currentPublished: currentPublished })}
                        >
                          <RotateCcw className="h-3 w-3" /> Restaurar como rascunho
                        </Button>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <RestoreVersionDialog
        open={!!restoreSource}
        onOpenChange={(v) => { if (!v) setRestoreSource(null); }}
        templateId={id}
        source={restoreSource}
        currentPublished={restoreSource?.__currentPublished ?? null}
      />


      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{lifecycle === "draft" ? "Publicar primeira versão" : "Publicar nova versão"}</DialogTitle>
            <DialogDescription>
              Uma nova versão será publicada como ativa. A versão publicada anterior (se houver) será
              arquivada automaticamente. Documentos existentes mantêm o snapshot da versão original.
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const preflight = validateTemplate({
              name: t.name,
              code: t.code,
              category: t.category,
              process_type: t.process_type,
              base_content: (t as any).base_content ?? "",
            });
            const publishable = canPublish(preflight);
            const errors = preflight.filter((i) => i.level === "error");
            return (
              <>
                <div className="space-y-3">
                  {!publishable && (
                    <div className="border border-red-200 bg-red-50 rounded p-2 text-xs text-red-800 space-y-1">
                      <p className="font-semibold">Publicação bloqueada — corrija antes de continuar:</p>
                      <ul className="list-disc pl-4">
                        {errors.slice(0, 5).map((e, i) => <li key={i}>{e.message}</li>)}
                      </ul>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium text-slate-700">Resumo da alteração (obrigatório)</label>
                    <Input
                      value={changelog}
                      onChange={(e) => setChangelog(e.target.value)}
                      placeholder="Ex.: Ajuste em campos obrigatórios do bloco de identificação"
                      maxLength={200}
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Mínimo 5 caracteres.</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">Notas técnicas (opcional)</label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPublishOpen(false)}>Cancelar</Button>
                  <Button
                    onClick={() => publishMut.mutate()}
                    disabled={publishMut.isPending || changelog.trim().length < 5 || !publishable}
                  >
                    {publishMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Publicar
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    published: { label: "Publicado", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    draft: { label: "Rascunho", cls: "bg-amber-100 text-amber-800 border-amber-200" },
    archived: { label: "Arquivado", cls: "bg-slate-200 text-slate-600 border-slate-300" },
  };
  const s = map[status] ?? map.draft;
  return <Badge variant="outline" className={`border ${s.cls}`}>{s.label}</Badge>;
}

function VersionStatus({ status }: { status: string }) {
  return <StatusBadge status={status} />;
}

function friendlyError(msg: string): string {
  if (msg.includes("changelog_required")) return "Informe um resumo de alteração significativo (mínimo 5 caracteres).";
  if (msg.includes("forbidden_global_template")) return "Apenas admin_master pode alterar modelos globais.";
  if (msg.includes("only_master_can_create_global")) return "Apenas admin_master pode criar modelos globais.";
  if (msg.includes("only_published_can_be_default")) return "Somente modelos publicados podem ser marcados como padrão.";
  if (msg.includes("forbidden")) return "Você não tem permissão para esta ação.";
  if (msg.includes("template_in_use")) return "Este modelo já foi usado e não pode ser excluído. Arquive em vez de excluir.";
  if (msg.includes("template_not_found")) return "Modelo não encontrado.";
  if (msg.includes("only_published_can_branch")) return "Só é possível criar nova versão a partir de um modelo publicado.";
  if (msg.includes("template_not_published")) return "O modelo precisa estar publicado para gerar documentos.";
  if (msg.includes("no_published_version")) return "Nenhuma versão publicada disponível para este modelo.";
  if (msg.includes("template_cross_tenant")) return "Este modelo pertence a outra empresa.";
  if (msg.includes("idempotency_key_required")) return "Chave de idempotência ausente ou inválida.";
  if (msg.includes("snapshot_hash_required")) return "Hash do snapshot ausente — geração bloqueada por segurança.";
  if (msg.includes("rendered_content_required")) return "Conteúdo renderizado ausente — geração bloqueada.";
  return msg;
}
