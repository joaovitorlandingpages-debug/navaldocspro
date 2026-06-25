import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  FileStack,
  Plus,
  Copy,
  Power,
  History,
  Eye,
  PencilLine,
  GitBranch,
  Loader2,
  X,
  AlertTriangle,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/documentos")({
  component: AdminDocumentos,
  errorComponent: ({ error, reset }) => (
    <div className="p-10 text-center text-red-600">
      <p className="font-bold">Erro: {error.message}</p>
      <button onClick={reset} className="mt-3 px-4 py-2 bg-primary text-white rounded-lg">
        Tentar novamente
      </button>
    </div>
  ),
  notFoundComponent: () => <div className="p-10">Não encontrado</div>,
});

type Template = {
  id: string;
  company_id: string | null;
  code: string | null;
  name: string;
  category: string | null;
  process_type: string | null;
  description: string | null;
  base_content: string | null;
  fields_config: any;
  version: number | null;
  version_number: number | null;
  is_active: boolean;
  is_global: boolean;
  created_at: string;
  updated_at: string;
};

function AdminDocumentos() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const [previewing, setPreviewing] = useState<Template | null>(null);
  const [historyOf, setHistoryOf] = useState<Template | null>(null);
  const [search, setSearch] = useState("");

  const templatesQ = useQuery({
    queryKey: ["admin-documentos-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data as any[] as Template[]) || [];
    },
  });

  const filtered = useMemo(() => {
    const list = templatesQ.data || [];
    if (!search.trim()) return list;
    const s = search.toLowerCase();
    return list.filter(
      (t) =>
        t.name?.toLowerCase().includes(s) ||
        t.code?.toLowerCase().includes(s) ||
        t.category?.toLowerCase().includes(s) ||
        t.process_type?.toLowerCase().includes(s),
    );
  }, [templatesQ.data, search]);

  const toggleActive = useMutation({
    mutationFn: async (t: Template) => {
      const { error } = await supabase
        .from("document_templates")
        .update({ is_active: !t.is_active } as any)
        .eq("id", t.id);
      if (error) throw error;
      await logEvent(
        t.is_active ? "template_deactivated" : "template_activated",
        { template_id: t.id, code: t.code, name: t.name },
      );
    },
    onSuccess: (_d, t) => {
      toast.success(`Template ${t.is_active ? "desativado" : "ativado"}`);
      qc.invalidateQueries({ queryKey: ["admin-documentos-templates"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async (t: Template) => {
      const { data: auth } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", auth.user?.id || "")
        .maybeSingle();
      const payload: any = {
        company_id: t.is_global ? null : profile?.company_id,
        code: t.code ? `${t.code}_COPIA` : null,
        name: `${t.name} (cópia)`,
        category: t.category,
        process_type: t.process_type,
        description: t.description,
        base_content: t.base_content,
        fields_config: t.fields_config,
        version: 1,
        version_number: 1,
        is_active: false,
        is_global: false,
      };
      const { data, error } = await supabase
        .from("document_templates")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      await logEvent("template_created", {
        template_id: (data as any).id,
        source: "duplicate",
        from: t.id,
      });
      return data as any;
    },
    onSuccess: () => {
      toast.success("Template duplicado");
      qc.invalidateQueries({ queryKey: ["admin-documentos-templates"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bumpVersion = useMutation({
    mutationFn: async (t: Template) => {
      const next = (t.version_number || t.version || 1) + 1;
      const { error } = await supabase
        .from("document_templates")
        .update({ version: next, version_number: next } as any)
        .eq("id", t.id);
      if (error) throw error;
      await logEvent("template_versioned", { template_id: t.id, version: next });
    },
    onSuccess: () => {
      toast.success("Versão incrementada");
      qc.invalidateQueries({ queryKey: ["admin-documentos-templates"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-slate-100 rounded-xl"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-navy">
              Motor de Documentos
            </h2>
            <p className="text-xs text-slate-500 italic">
              Templates globais e privados, regras, versões e auditoria
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, código, categoria..."
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-72"
          />
          <button
            onClick={() => setCreating(true)}
            className="bg-primary text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Novo template
          </button>
        </div>
      </div>

      {templatesQ.isLoading ? (
        <div className="py-20 flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm font-medium">Carregando templates...</span>
        </div>
      ) : templatesQ.isError ? (
        <div className="py-20 text-center text-red-600">
          <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
          {(templatesQ.error as any)?.message || "Falha ao carregar"}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed rounded-3xl">
          <FileStack className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            {search
              ? "Nenhum template para o filtro atual."
              : "Nenhum template cadastrado. Crie o primeiro."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 flex items-start justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-navy text-sm truncate">
                    {t.name}
                  </span>
                  {t.code && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {t.code}
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      t.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {t.is_active ? "Ativo" : "Inativo"}
                  </span>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      t.is_global
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {t.is_global ? "Global" : "Privado"}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    v{t.version_number || t.version || 1}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 truncate">
                  {[t.process_type, t.category].filter(Boolean).join(" · ") ||
                    "Sem categoria"}
                </div>
                {t.description && (
                  <div className="text-xs text-slate-600 mt-2 line-clamp-2">
                    {t.description}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 shrink-0">
                <Btn icon={<Eye className="h-3.5 w-3.5" />} onClick={() => setPreviewing(t)}>
                  Prévia
                </Btn>
                <Btn icon={<PencilLine className="h-3.5 w-3.5" />} onClick={() => setEditing(t)}>
                  Editar
                </Btn>
                <Btn icon={<Copy className="h-3.5 w-3.5" />} onClick={() => duplicate.mutate(t)}>
                  Duplicar
                </Btn>
                <Btn icon={<GitBranch className="h-3.5 w-3.5" />} onClick={() => bumpVersion.mutate(t)}>
                  Versionar
                </Btn>
                <Btn icon={<History className="h-3.5 w-3.5" />} onClick={() => setHistoryOf(t)}>
                  Histórico
                </Btn>
                <Btn
                  icon={<Power className="h-3.5 w-3.5" />}
                  onClick={() => toggleActive.mutate(t)}
                  variant={t.is_active ? "warn" : "ok"}
                >
                  {t.is_active ? "Desativar" : "Ativar"}
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <TemplateEditor
          template={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-documentos-templates"] });
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
      {previewing && (
        <PreviewModal template={previewing} onClose={() => setPreviewing(null)} />
      )}
      {historyOf && (
        <HistoryModal template={historyOf} onClose={() => setHistoryOf(null)} />
      )}
    </div>
  );
}

function Btn({
  children,
  icon,
  onClick,
  variant = "default",
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "warn" | "ok";
}) {
  const cls =
    variant === "warn"
      ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
      : variant === "ok"
        ? "bg-green-100 text-green-700 hover:bg-green-200"
        : "bg-slate-100 text-slate-700 hover:bg-slate-200";
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 ${cls}`}
    >
      {icon}
      {children}
    </button>
  );
}

function TemplateEditor({
  template,
  onClose,
  onSaved,
}: {
  template: Template | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !template;
  const [form, setForm] = useState({
    code: template?.code || "",
    name: template?.name || "",
    category: template?.category || "",
    process_type: template?.process_type || "",
    description: template?.description || "",
    base_content: template?.base_content || "",
    is_global: template?.is_global || false,
    is_active: template?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id, role")
        .eq("id", auth.user?.id || "")
        .maybeSingle();
      const payload: any = {
        ...form,
        company_id: form.is_global ? null : profile?.company_id,
      };
      if (isNew) {
        payload.version = 1;
        payload.version_number = 1;
        const { data, error } = await supabase
          .from("document_templates")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        await logEvent("template_created", {
          template_id: (data as any).id,
          code: form.code,
        });
        toast.success("Template criado");
      } else {
        const { error } = await supabase
          .from("document_templates")
          .update(payload)
          .eq("id", template!.id);
        if (error) throw error;
        await logEvent("template_updated", {
          template_id: template!.id,
          changed: Object.keys(form),
        });
        toast.success("Template atualizado");
      }
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title={isNew ? "Novo template" : "Editar template"}>
      <div className="space-y-3">
        <Row label="Nome">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
          />
        </Row>
        <div className="grid grid-cols-2 gap-3">
          <Row label="Código interno">
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="input"
              placeholder="REQ_INSCR_TIE"
            />
          </Row>
          <Row label="Tipo de processo">
            <input
              value={form.process_type}
              onChange={(e) => setForm({ ...form, process_type: e.target.value })}
              className="input"
            />
          </Row>
        </div>
        <Row label="Categoria">
          <input
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="input"
          />
        </Row>
        <Row label="Descrição">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input min-h-[60px]"
          />
        </Row>
        <Row label="Texto base (use {{cliente.nome}}, {{embarcacao.inscricao}}, etc)">
          <textarea
            value={form.base_content}
            onChange={(e) => setForm({ ...form, base_content: e.target.value })}
            className="input font-mono text-xs min-h-[220px]"
          />
        </Row>
        <div className="flex gap-4 text-xs">
          <label className="flex items-center gap-2 font-bold">
            <input
              type="checkbox"
              checked={form.is_global}
              onChange={(e) => setForm({ ...form, is_global: e.target.checked })}
            />
            Template global (compartilhado com todas as empresas)
          </label>
          <label className="flex items-center gap-2 font-bold">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Ativo
          </label>
        </div>
        <style>{`.input{width:100%;border:1px solid rgb(226 232 240);border-radius:0.75rem;padding:0.5rem 0.75rem;font-size:13px}`}</style>
      </div>
      <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
        <button onClick={onClose} className="px-4 py-2 text-xs font-bold hover:bg-slate-100 rounded-lg">
          Cancelar
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin inline" /> : "Salvar"}
        </button>
      </div>
    </Modal>
  );
}

function PreviewModal({
  template,
  onClose,
}: {
  template: Template;
  onClose: () => void;
}) {
  const sampleQ = useQuery({
    queryKey: ["template-test-sample", template.id],
    queryFn: async () => {
      const { data: cust } = await supabase
        .from("customers")
        .select("name, cpf_cnpj, email, phone, address")
        .limit(1)
        .maybeSingle();
      const { data: vessel } = await supabase
        .from("vessels")
        .select("name, registration_number, vessel_type, length, beam, depth")
        .limit(1)
        .maybeSingle();
      const { data: company } = await supabase
        .from("companies")
        .select("name, cnpj")
        .limit(1)
        .maybeSingle();
      return { cust, vessel, company };
    },
  });

  const filled = useMemo(() => {
    const data = sampleQ.data;
    let txt = template.base_content || "";
    const map: Record<string, string> = {
      "cliente.nome": data?.cust?.name || "[cliente]",
      "cliente.cpf": data?.cust?.cpf_cnpj || "[CPF/CNPJ]",
      "cliente.email": data?.cust?.email || "",
      "cliente.telefone": data?.cust?.phone || "",
      "cliente.endereco": data?.cust?.address || "",
      "embarcacao.nome": data?.vessel?.name || "[embarcação]",
      "embarcacao.inscricao": data?.vessel?.registration_number || "",
      "embarcacao.tipo": data?.vessel?.vessel_type || "",
      "embarcacao.comprimento": data?.vessel?.length || "",
      "embarcacao.boca": data?.vessel?.beam || "",
      "embarcacao.pontal": data?.vessel?.depth || "",
      "empresa.nome": data?.company?.name || "",
      "empresa.cnpj": data?.company?.cnpj || "",
    };
    Object.entries(map).forEach(([k, v]) => {
      txt = txt.replaceAll(`{{${k}}}`, String(v));
    });
    return txt;
  }, [sampleQ.data, template.base_content]);

  return (
    <Modal onClose={onClose} title={`Prévia: ${template.name}`}>
      <p className="text-xs text-slate-500 mb-3">
        Preenchido com o primeiro cliente/embarcação/empresa visível por RLS.
        Variáveis sem dados aparecem entre colchetes.
      </p>
      {sampleQ.isLoading ? (
        <div className="py-8 text-center text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
          Carregando dados de teste...
        </div>
      ) : (
        <div className="bg-slate-50 rounded-xl p-6 whitespace-pre-wrap font-mono text-[12px] leading-relaxed max-h-[60vh] overflow-y-auto">
          {filled || (
            <span className="text-slate-400">
              Template sem texto base — adicione conteúdo no editor.
            </span>
          )}
        </div>
      )}
    </Modal>
  );
}

function HistoryModal({
  template,
  onClose,
}: {
  template: Template;
  onClose: () => void;
}) {
  const logsQ = useQuery({
    queryKey: ["template-logs", template.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_generation_logs")
        .select("*")
        .eq("document_template_id", template.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <Modal onClose={onClose} title={`Histórico: ${template.name}`}>
      {logsQ.isLoading ? (
        <div className="py-8 text-center">
          <Loader2 className="h-5 w-5 animate-spin inline" />
        </div>
      ) : (logsQ.data || []).length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center">
          Sem eventos registrados ainda.
        </p>
      ) : (
        <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
          {logsQ.data!.map((l: any) => (
            <li key={l.id} className="border border-slate-100 rounded-lg p-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-black text-navy">{l.event_type}</span>
                <span className="text-[10px] text-slate-400">
                  {new Date(l.created_at).toLocaleString("pt-BR")}
                </span>
              </div>
              {l.message && (
                <div className="text-slate-600 mt-1">{l.message}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-black text-navy">{title}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

// ---- Helper: log events to document_generation_logs ----
async function logEvent(eventType: string, metadata: Record<string, any> = {}) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", auth.user?.id || "")
      .maybeSingle();
    await supabase.from("document_generation_logs").insert({
      event_type: eventType,
      severity: eventType.includes("failed") || eventType.includes("blocked") ? "warning" : "info",
      message: `[admin] ${eventType}`,
      metadata,
      user_id: auth.user?.id,
      company_id: profile?.company_id,
      document_template_id: metadata.template_id || null,
    } as any);
  } catch (e) {
    console.warn("[document_generation_logs insert failed]", e);
  }
}
