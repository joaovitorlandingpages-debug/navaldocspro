/**
 * Sprint 4D.4 — Fatia 2
 * Diálogo de rollback: cria uma nova versão draft copiando o conteúdo da versão selecionada.
 * NÃO altera a versão publicada atual nem os documentos já gerados.
 */
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, GitBranch, Loader2, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type VersionLike = {
  id: string;
  version_number: number | null;
  version: string | null;
  created_at: string | null;
  base_content: string | null;
  document_structure: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  changelog?: unknown;
  notes?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  templateId: string;
  source: VersionLike | null;
  currentPublished: VersionLike | null;
  onRestored?: (newVersionId: string) => void;
};

export function RestoreVersionDialog({
  open, onOpenChange, templateId, source, currentPublished, onRestored,
}: Props) {
  const [reason, setReason] = useState("");
  const [changelog, setChangelog] = useState("");
  const qc = useQueryClient();

  const diff = useMemo(() => computeDiff(source, currentPublished), [source, currentPublished]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!source) throw new Error("source_required");
      const { data, error } = await (supabase.rpc as any)("template_restore_version_as_draft", {
        p_template_id: templateId,
        p_source_version_id: source.id,
        p_restore_reason: reason.trim(),
        p_optional_changelog: changelog.trim() || null,
      });
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: (newId) => {
      toast.success("Nova versão de rascunho criada a partir da versão selecionada.");
      qc.invalidateQueries({ queryKey: ["admin-template", templateId] });
      qc.invalidateQueries({ queryKey: ["admin-template-versions", templateId] });
      onOpenChange(false);
      setReason(""); setChangelog("");
      onRestored?.(newId);
    },
    onError: (e: Error) => toast.error(friendly(e.message)),
  });

  if (!source) return null;
  const label = `v${source.version_number ?? source.version}`;
  const canSubmit = reason.trim().length >= 5 && !mut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" /> Restaurar como novo rascunho
          </DialogTitle>
          <DialogDescription>
            Um novo rascunho será criado a partir de <strong>{label}</strong>. A versão publicada
            atual continuará ativa até você publicar este novo rascunho.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-slate-50 p-3 text-xs space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="gap-1"><GitBranch className="h-3 w-3" />{label}</Badge>
              {source.created_at && (
                <span className="text-slate-500">
                  criada {formatDistanceToNow(new Date(source.created_at), { addSuffix: true, locale: ptBR })}
                </span>
              )}
            </div>
            {source.notes && <p className="text-slate-600">{source.notes}</p>}
          </div>

          {currentPublished && currentPublished.id !== source.id && (
            <div className="rounded-md border p-3 text-xs">
              <p className="font-semibold text-slate-700 mb-2">
                Comparação com a versão publicada atual (v{currentPublished.version_number ?? currentPublished.version})
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <DiffStat label="Conteúdo" value={diff.contentChanged ? "alterado" : "igual"} tone={diff.contentChanged ? "warn" : "ok"} />
                <DiffStat label="Chaves +/-" value={`+${diff.structAdded} / −${diff.structRemoved}`} tone={diff.structAdded + diff.structRemoved > 0 ? "warn" : "ok"} />
                <DiffStat label="Metadata" value={diff.metadataChanged ? "alterada" : "igual"} tone={diff.metadataChanged ? "warn" : "ok"} />
              </div>
            </div>
          )}

          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Escopo do rollback</p>
              <p>
                Apenas <strong>conteúdo, estrutura e metadata</strong> são restaurados. Campos,
                regras e âncoras de assinatura ainda não são versionados — permanecerão como
                estão hoje.
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700">Motivo (obrigatório)</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: reverter alteração de cláusula X que causou rejeição no cartório"
              maxLength={300}
            />
            <p className="text-[10px] text-slate-500 mt-1">Mínimo 5 caracteres.</p>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700">Nota adicional (opcional)</label>
            <Textarea rows={2} value={changelog} onChange={(e) => setChangelog(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={!canSubmit}>
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Criar rascunho a partir de {label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DiffStat({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" }) {
  return (
    <div className={`rounded p-2 ${tone === "warn" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-xs font-semibold">{value}</div>
    </div>
  );
}

function computeDiff(a: VersionLike | null, b: VersionLike | null) {
  if (!a || !b) return { contentChanged: false, structAdded: 0, structRemoved: 0, metadataChanged: false };
  const aKeys = new Set(Object.keys((a.document_structure as object) ?? {}));
  const bKeys = new Set(Object.keys((b.document_structure as object) ?? {}));
  let added = 0, removed = 0;
  aKeys.forEach((k) => { if (!bKeys.has(k)) added += 1; });
  bKeys.forEach((k) => { if (!aKeys.has(k)) removed += 1; });
  return {
    contentChanged: (a.base_content ?? "") !== (b.base_content ?? ""),
    structAdded: added,
    structRemoved: removed,
    metadataChanged: JSON.stringify(a.metadata ?? {}) !== JSON.stringify(b.metadata ?? {}),
  };
}

function friendly(msg: string): string {
  if (msg.includes("restore_reason_required")) return "Informe um motivo com pelo menos 5 caracteres.";
  if (msg.includes("template_not_found")) return "Modelo não encontrado.";
  if (msg.includes("template_archived")) return "Restaure o modelo antes de fazer rollback de versões.";
  if (msg.includes("source_version_not_found")) return "Versão de origem não encontrada.";
  if (msg.includes("source_version_mismatch")) return "A versão selecionada não pertence a este modelo.";
  if (msg.includes("forbidden")) return "Você não tem permissão para restaurar esta versão.";
  if (msg.includes("unauthenticated")) return "Sessão expirada — faça login novamente.";
  return msg;
}
