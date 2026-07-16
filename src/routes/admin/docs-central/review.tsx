import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Empty } from "@/components/docs-central/shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, MessageSquare, AlertTriangle, Clock } from "lucide-react";

export const Route = createFileRoute("/admin/docs-central/review")({
  component: ReviewPage,
});

type ReviewRequest = {
  id: string;
  template_id: string;
  version_id: string | null;
  company_id: string | null;
  requested_by: string;
  status: "pending" | "approved" | "rejected" | "changes_requested" | "cancelled";
  request_note: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  created_at: string;
  template_name?: string;
};

type Comment = { id: string; author_id: string; body: string; created_at: string };

const STATUS_META: Record<string, { label: string; cls: string; icon: any }> = {
  pending: { label: "Pendente", cls: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  approved: { label: "Aprovada", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  rejected: { label: "Rejeitada", cls: "bg-rose-50 text-rose-700 border-rose-200", icon: XCircle },
  changes_requested: { label: "Mudanças", cls: "bg-blue-50 text-blue-700 border-blue-200", icon: AlertTriangle },
  cancelled: { label: "Cancelada", cls: "bg-slate-50 text-slate-500 border-slate-200", icon: XCircle },
};

function ReviewPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<ReviewRequest | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const { data, isLoading } = useQuery({
    queryKey: ["dc-review", filter],
    queryFn: async () => {
      let q = supabase
        .from("template_review_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter === "pending") q = q.eq("status", "pending");
      const [rows, tpl] = await Promise.all([
        q,
        supabase.from("document_templates").select("id,name").limit(5000),
      ]);
      const tplName = new Map((tpl.data ?? []).map((t: any) => [t.id, t.name]));
      return ((rows.data ?? []) as ReviewRequest[]).map((r) => ({
        ...r,
        template_name: (tplName.get(r.template_id) as string) || "—",
      }));
    },
  });

  return (
    <div>
      <PageTitle
        title="Revisão"
        description="Aprovar, rejeitar, solicitar mudanças e comentar em versões de modelos"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>
              Pendentes
            </Button>
            <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
              Todas
            </Button>
          </div>
        }
      />
      {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}
      {!isLoading && (data?.length ?? 0) === 0 && <Empty title="Nenhuma solicitação de revisão" />}
      <div className="space-y-2">
        {(data ?? []).map((r) => {
          const meta = STATUS_META[r.status];
          const Icon = meta.icon;
          return (
            <Card
              key={r.id}
              className="p-4 border-slate-100 hover:border-primary/30 cursor-pointer transition-colors"
              onClick={() => setSelected(r)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-navy truncate">{r.template_name}</p>
                    <Badge variant="outline" className={`text-[10px] ${meta.cls}`}>
                      <Icon className="h-3 w-3 mr-1 inline" />
                      {meta.label}
                    </Badge>
                    {r.version_id && (
                      <Badge variant="outline" className="text-[10px] font-mono">
                        v:{r.version_id.slice(0, 8)}
                      </Badge>
                    )}
                  </div>
                  {r.request_note && <p className="text-xs text-slate-500 mt-1 truncate">{r.request_note}</p>}
                  <p className="text-[10px] text-slate-400 mt-1">
                    Aberta em {new Date(r.created_at).toLocaleString("pt-BR")}
                    {r.decided_at && ` · Decidida em ${new Date(r.decided_at).toLocaleString("pt-BR")}`}
                  </p>
                </div>
                <MessageSquare className="h-4 w-4 text-slate-300" />
              </div>
            </Card>
          );
        })}
      </div>
      {selected && (
        <ReviewDrawer
          request={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            qc.invalidateQueries({ queryKey: ["dc-review"] });
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

function ReviewDrawer({
  request,
  onClose,
  onChanged,
}: {
  request: ReviewRequest;
  onClose: () => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");

  const { data: comments } = useQuery({
    queryKey: ["dc-review-comments", request.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("template_review_comments")
        .select("*")
        .eq("review_request_id", request.id)
        .order("created_at", { ascending: true });
      return (data ?? []) as Comment[];
    },
  });

  const decide = useMutation({
    mutationFn: async (decision: "approved" | "rejected" | "changes_requested" | "cancelled") => {
      const { error } = await supabase.rpc("template_review_decide" as any, {
        p_request_id: request.id,
        p_decision: decision,
        p_reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Decisão registrada");
      onChanged();
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao decidir"),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("template_review_comment" as any, {
        p_request_id: request.id,
        p_body: comment,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["dc-review-comments", request.id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao comentar"),
  });

  const isPending = request.status === "pending";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Revisão · {request.template_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-xs text-slate-500">
            Status: <strong>{STATUS_META[request.status].label}</strong>
            {request.decision_reason && <p className="mt-1">Motivo: {request.decision_reason}</p>}
            {request.request_note && <p className="mt-1">Nota inicial: {request.request_note}</p>}
          </div>

          <div className="border rounded-lg divide-y max-h-56 overflow-auto">
            {(comments ?? []).length === 0 && (
              <p className="text-xs text-slate-400 p-4 text-center">Nenhum comentário ainda</p>
            )}
            {(comments ?? []).map((c) => (
              <div key={c.id} className="p-3">
                <p className="text-xs text-slate-400">{new Date(c.created_at).toLocaleString("pt-BR")}</p>
                <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{c.body}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder="Novo comentário..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
            <Button size="sm" variant="outline" disabled={!comment.trim() || addComment.isPending} onClick={() => addComment.mutate()}>
              Comentar
            </Button>
          </div>

          {isPending && (
            <div className="space-y-2 pt-3 border-t">
              <label className="text-xs font-semibold text-slate-600">
                Motivo (obrigatório para rejeitar ou solicitar mudanças)
              </label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          {isPending && (
            <>
              <Button variant="outline" onClick={() => decide.mutate("cancelled")} disabled={decide.isPending}>
                Cancelar solicitação
              </Button>
              <Button
                variant="outline"
                className="text-blue-700"
                onClick={() => decide.mutate("changes_requested")}
                disabled={decide.isPending || !reason.trim()}
              >
                Solicitar mudanças
              </Button>
              <Button
                variant="outline"
                className="text-rose-700"
                onClick={() => decide.mutate("rejected")}
                disabled={decide.isPending || !reason.trim()}
              >
                Rejeitar
              </Button>
              <Button onClick={() => decide.mutate("approved")} disabled={decide.isPending}>
                Aprovar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
