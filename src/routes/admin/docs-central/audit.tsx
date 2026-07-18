import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Empty } from "@/components/docs-central/shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/docs-central/audit")({
  component: AuditPage,
});

function AuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dc-audit"],
    queryFn: async () => {
      const { data } = await supabase
        .from("document_audit_logs")
        .select("id,action,document_id,user_id,details,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  return (
    <div>
      <PageTitle title="Auditoria" description="Enterprise Documentation Central v2.0" />
      {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}
      {!isLoading && (data?.length ?? 0) === 0 && <Empty title="Nenhum evento auditável" />}
      <Card className="border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <tr>
              <th className="text-left px-4 py-3">Ação</th>
              <th className="text-left px-4 py-3">Documento</th>
              <th className="text-left px-4 py-3">Usuário</th>
              <th className="text-left px-4 py-3">Quando</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(data ?? []).map((r: any) => (
              <tr key={r.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-2.5"><Badge variant="outline" className="text-[10px]">{r.action}</Badge></td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500 truncate max-w-xs">{r.document_id}</td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500 truncate max-w-xs">{r.user_id ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-500 text-xs">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
