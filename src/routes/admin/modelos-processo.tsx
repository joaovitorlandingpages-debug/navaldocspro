/**
 * Onda D — Admin de Modelos de Processo
 * Configuração no-code de tipos de processo, documentos e regras condicionais.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2, Plus, Trash2, GripVertical, Eye, Save, ArrowLeft, Sparkles,
  ArrowUp, ArrowDown, Signature, ScanLine, AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/admin/modelos-processo")({
  component: ModelsAdmin,
  errorComponent: ({ error, reset }) => (
    <div className="p-10 text-center">
      <p className="font-bold text-red-600">Erro: {error.message}</p>
      <Button onClick={reset} className="mt-3">Tentar novamente</Button>
    </div>
  ),
  notFoundComponent: () => <div className="p-10">Não encontrado</div>,
});

type PackageRow = {
  id: string;
  name: string;
  process_type: string;
  description: string | null;
  category: string | null;
  sort_order: number | null;
  default_deadline_days: number | null;
  default_priority: string | null;
  is_active: boolean | null;
};

type ItemRow = {
  id: string;
  package_id: string;
  document_template_id: string | null;
  document_role: string;
  item_label: string | null;
  responsible_role: string | null;
  is_required: boolean | null;
  requires_ocr: boolean | null;
  requires_signature: boolean | null;
  has_expiration: boolean | null;
  sort_order: number | null;
  conditional_rule: any | null;
};

const CATEGORIES = ["Inscrição","Transferência","Renovação","Alteração","Cancelamento","Certidão","Regularização","Vistoria","Outros"];
const PRIORITIES = [
  { value: "low", label: "Baixa" }, { value: "normal", label: "Normal" },
  { value: "high", label: "Alta" }, { value: "urgent", label: "Urgente" },
];
const RESPONSIBLES = ["cliente","engenheiro","despachante","capitania","outros"];

function ModelsAdmin() {
  const { profile } = useAuth();
  const isAdmin = ["admin","admin_master","admin_master_global"].includes(profile?.role || "");
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newPkgOpen, setNewPkgOpen] = useState(false);

  const { data: packages, isLoading } = useQuery({
    queryKey: ["admin","process-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_process_packages")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data as PackageRow[];
    },
  });

  if (!isAdmin) {
    return (
      <div className="p-10 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
        <p className="mt-3 font-bold">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="text-gray-500 hover:text-gray-900"><ArrowLeft className="h-4 w-4" /></Link>
            <div>
              <h1 className="text-lg font-bold">Modelos de Processo</h1>
              <p className="text-xs text-gray-500">Configure tipos, documentos e regras sem alterar código.</p>
            </div>
          </div>
          <Button onClick={() => setNewPkgOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Novo modelo</Button>
        </div>
      </header>

      <div className="grid gap-4 p-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-xl border bg-white p-3">
          {isLoading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" />Carregando…</div>
          ) : packages && packages.length ? (
            <ul className="space-y-1">
              {packages.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${selectedId === p.id ? "bg-primary/10 font-semibold text-primary" : "hover:bg-gray-100"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{p.name}</span>
                      {!p.is_active && <Badge variant="secondary" className="text-[10px]">off</Badge>}
                    </div>
                    <div className="text-[10px] text-gray-500">{p.category || "—"} · {p.process_type}</div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-sm text-gray-500">Nenhum modelo. Clique em "Novo modelo".</p>
          )}
        </aside>

        <main className="rounded-xl border bg-white p-5">
          {selectedId ? (
            <PackageEditor packageId={selectedId} onDeleted={() => { setSelectedId(null); qc.invalidateQueries({ queryKey: ["admin","process-packages"] }); }} />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-center text-gray-500">
              <Sparkles className="h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm">Selecione um modelo à esquerda ou crie um novo.</p>
            </div>
          )}
        </main>
      </div>

      <NewPackageDialog open={newPkgOpen} onOpenChange={setNewPkgOpen} onCreated={(id) => { setSelectedId(id); qc.invalidateQueries({ queryKey: ["admin","process-packages"] }); }} />
    </div>
  );
}

/* ---------------- New Package Dialog ---------------- */
function NewPackageDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [processType, setProcessType] = useState("");
  const [category, setCategory] = useState("Inscrição");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !processType.trim()) { toast.error("Preencha nome e chave do tipo"); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("document_process_packages")
        .insert({ name: name.trim(), process_type: processType.trim().toLowerCase().replace(/\s+/g,"_"), category, is_active: true })
        .select("id").single();
      if (error) throw error;
      toast.success("Modelo criado");
      onCreated(data.id);
      onOpenChange(false);
      setName(""); setProcessType("");
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo modelo de processo</DialogTitle>
          <DialogDescription>Defina nome, chave e categoria. Você configurará documentos em seguida.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold">Nome</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Inscrição de Embarcação" />
          </div>
          <div>
            <label className="text-xs font-semibold">Chave do tipo (process_type)</label>
            <Input value={processType} onChange={(e) => setProcessType(e.target.value)} placeholder="ex.: inscricao_embarcacao" />
            <p className="mt-1 text-[10px] text-gray-500">Sem espaços; usada internamente.</p>
          </div>
          <div>
            <label className="text-xs font-semibold">Categoria</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Package Editor ---------------- */
function PackageEditor({ packageId, onDeleted }: { packageId: string; onDeleted: () => void }) {
  const qc = useQueryClient();
  const { data: pkg, isLoading } = useQuery({
    queryKey: ["admin","process-package", packageId],
    queryFn: async () => {
      const { data, error } = await supabase.from("document_process_packages").select("*").eq("id", packageId).single();
      if (error) throw error;
      return data as PackageRow;
    },
  });
  const { data: items, refetch: refetchItems } = useQuery({
    queryKey: ["admin","process-package-items", packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_process_package_items")
        .select("*")
        .eq("package_id", packageId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as ItemRow[];
    },
  });
  const { data: templates } = useQuery({
    queryKey: ["admin","templates-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("document_templates").select("id,name").order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const [local, setLocal] = useState<PackageRow | null>(null);
  const current = local || pkg;

  const savePkg = useMutation({
    mutationFn: async (payload: Partial<PackageRow>) => {
      const { error } = await supabase.from("document_process_packages").update(payload).eq("id", packageId);
      if (error) throw error;
      await supabase.from("activity_logs").insert({ action: `Modelo "${pkg?.name}" atualizado`, module: "ADMIN_MODELOS", resource_type: "document_process_packages", resource_id: packageId });
    },
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["admin","process-packages"] }); qc.invalidateQueries({ queryKey: ["admin","process-package", packageId] }); setLocal(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const addItem = async () => {
    const nextOrder = (items?.length || 0) * 10 + 10;
    const { error } = await supabase.from("document_process_package_items").insert({
      package_id: packageId, document_role: "novo_doc", item_label: "Novo documento",
      is_required: true, sort_order: nextOrder,
    });
    if (error) { toast.error(error.message); return; }
    refetchItems();
  };

  if (isLoading || !current) return <div className="flex items-center gap-2 p-6 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" />Carregando…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{current.name}</h2>
          <p className="text-xs text-gray-500">{current.process_type}</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={!!current.is_active} onCheckedChange={(v) => savePkg.mutate({ is_active: v })} />
          <span className="text-xs font-semibold">{current.is_active ? "Ativo" : "Inativo"}</span>
        </div>
      </div>

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados gerais</TabsTrigger>
          <TabsTrigger value="documentos">Documentos ({items?.length || 0})</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="perigo">Zona de perigo</TabsTrigger>
        </TabsList>

        {/* GERAL */}
        <TabsContent value="dados" className="space-y-3 pt-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nome">
              <Input value={current.name} onChange={(e) => setLocal({ ...current, name: e.target.value })} />
            </Field>
            <Field label="Categoria">
              <Select value={current.category || ""} onValueChange={(v) => setLocal({ ...current, category: v })}>
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Ordem de exibição">
              <Input type="number" value={current.sort_order ?? 0} onChange={(e) => setLocal({ ...current, sort_order: Number(e.target.value) })} />
            </Field>
            <Field label="Prazo padrão (dias)">
              <Input type="number" value={current.default_deadline_days ?? ""} onChange={(e) => setLocal({ ...current, default_deadline_days: e.target.value ? Number(e.target.value) : null })} />
            </Field>
            <Field label="Prioridade padrão">
              <Select value={current.default_priority || "normal"} onValueChange={(v) => setLocal({ ...current, default_priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Descrição" className="md:col-span-2">
              <Textarea value={current.description || ""} onChange={(e) => setLocal({ ...current, description: e.target.value })} />
            </Field>
          </div>
          {local && (
            <div className="sticky bottom-4 flex justify-end gap-2 rounded-xl border bg-white p-3 shadow-lg">
              <Button variant="outline" onClick={() => setLocal(null)}>Descartar</Button>
              <Button onClick={() => savePkg.mutate(local!)} className="gap-2"><Save className="h-4 w-4" />Salvar alterações</Button>
            </div>
          )}
        </TabsContent>

        {/* DOCUMENTOS */}
        <TabsContent value="documentos" className="space-y-3 pt-4">
          <div className="flex justify-end">
            <Button onClick={addItem} size="sm" className="gap-2"><Plus className="h-4 w-4" />Adicionar documento</Button>
          </div>
          <div className="space-y-2">
            {(items || []).map((it, idx) => (
              <ItemRowEditor
                key={it.id}
                item={it}
                templates={templates || []}
                canMoveUp={idx > 0}
                canMoveDown={idx < (items!.length - 1)}
                onChange={() => refetchItems()}
                onMove={async (dir) => {
                  const other = items![idx + (dir === "up" ? -1 : 1)];
                  await supabase.from("document_process_package_items").update({ sort_order: other.sort_order }).eq("id", it.id);
                  await supabase.from("document_process_package_items").update({ sort_order: it.sort_order }).eq("id", other.id);
                  refetchItems();
                }}
              />
            ))}
            {!items?.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">Nenhum documento configurado.</p>}
          </div>
        </TabsContent>

        {/* PREVIEW */}
        <TabsContent value="preview" className="pt-4">
          <PreviewPanel pkg={current} items={items || []} />
        </TabsContent>

        {/* PERIGO */}
        <TabsContent value="perigo" className="space-y-3 pt-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-900">Excluir modelo</p>
            <p className="mt-1 text-xs text-red-800">Processos já criados não serão afetados. Novos processos não poderão usar este modelo.</p>
            <Button
              variant="destructive"
              size="sm"
              className="mt-3"
              onClick={async () => {
                if (!confirm(`Excluir modelo "${current.name}"?`)) return;
                const { error } = await supabase.from("document_process_packages").delete().eq("id", packageId);
                if (error) { toast.error(error.message); return; }
                await supabase.from("activity_logs").insert({ action: `Modelo "${current.name}" excluído`, module: "ADMIN_MODELOS", resource_type: "document_process_packages", resource_id: packageId });
                toast.success("Modelo excluído");
                onDeleted();
              }}
            >
              <Trash2 className="mr-1 h-4 w-4" />Excluir
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-semibold text-gray-700">{label}</label>
      {children}
    </div>
  );
}

/* ---------------- Item Editor ---------------- */
function ItemRowEditor({
  item, templates, canMoveUp, canMoveDown, onChange, onMove,
}: {
  item: ItemRow;
  templates: { id: string; name: string }[];
  canMoveUp: boolean; canMoveDown: boolean;
  onChange: () => void;
  onMove: (dir: "up" | "down") => void;
}) {
  const [local, setLocal] = useState<ItemRow>(item);
  const [ruleOpen, setRuleOpen] = useState(false);
  const dirty = useMemo(() => JSON.stringify(local) !== JSON.stringify(item), [local, item]);

  const save = async (patch?: Partial<ItemRow>) => {
    const payload = patch ? { ...local, ...patch } : local;
    const { error } = await supabase.from("document_process_package_items").update({
      document_template_id: payload.document_template_id,
      document_role: payload.document_role,
      item_label: payload.item_label,
      responsible_role: payload.responsible_role,
      is_required: payload.is_required,
      requires_ocr: payload.requires_ocr,
      requires_signature: payload.requires_signature,
      has_expiration: payload.has_expiration,
      conditional_rule: payload.conditional_rule,
    }).eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    if (patch) setLocal({ ...local, ...patch });
    toast.success("Documento atualizado");
    onChange();
  };
  const remove = async () => {
    if (!confirm("Remover este documento do modelo?")) return;
    await supabase.from("document_process_package_items").delete().eq("id", item.id);
    onChange();
  };

  const kind = item.conditional_rule ? "condicional" : (item.is_required ? "obrigatório" : "opcional");
  const kindColor = kind === "obrigatório" ? "bg-red-100 text-red-700" : kind === "condicional" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700";

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-1 pt-1">
          <button disabled={!canMoveUp} onClick={() => onMove("up")} className="text-gray-400 hover:text-gray-900 disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
          <GripVertical className="h-3 w-3 text-gray-300" />
          <button disabled={!canMoveDown} onClick={() => onMove("down")} className="text-gray-400 hover:text-gray-900 disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
        </div>
        <div className="flex-1 space-y-2">
          <div className="grid gap-2 md:grid-cols-2">
            <Field label="Rótulo exibido">
              <Input value={local.item_label || ""} onChange={(e) => setLocal({ ...local, item_label: e.target.value })} placeholder="Ex.: Procuração" />
            </Field>
            <Field label="Papel / Chave">
              <Input value={local.document_role} onChange={(e) => setLocal({ ...local, document_role: e.target.value })} placeholder="ex.: procuracao" />
            </Field>
            <Field label="Template vinculado">
              <Select value={local.document_template_id || "__none__"} onValueChange={(v) => setLocal({ ...local, document_template_id: v === "__none__" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Sem template" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem template</SelectItem>
                  {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Responsável">
              <Select value={local.responsible_role || "cliente"} onValueChange={(v) => setLocal({ ...local, responsible_role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RESPONSIBLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <Toggle checked={!!local.is_required} onChange={(v) => setLocal({ ...local, is_required: v })} label="Obrigatório" />
            <Toggle checked={!!local.requires_signature} onChange={(v) => setLocal({ ...local, requires_signature: v })} label={<span className="flex items-center gap-1"><Signature className="h-3 w-3" />Assinatura</span>} />
            <Toggle checked={!!local.requires_ocr} onChange={(v) => setLocal({ ...local, requires_ocr: v })} label={<span className="flex items-center gap-1"><ScanLine className="h-3 w-3" />OCR</span>} />
            <Toggle checked={!!local.has_expiration} onChange={(v) => setLocal({ ...local, has_expiration: v })} label="Expira" />
            <Badge className={`ml-auto ${kindColor}`}>{kind}</Badge>
          </div>

          {local.conditional_rule && (
            <p className="rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
              Regra: <code>{JSON.stringify(local.conditional_rule)}</code>
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => setRuleOpen(true)}>Regra condicional</Button>
            <Button size="sm" onClick={() => save()} disabled={!dirty} className="gap-1"><Save className="h-3 w-3" />Salvar</Button>
            <Button size="sm" variant="ghost" onClick={remove} className="text-red-600"><Trash2 className="h-3 w-3" /></Button>
          </div>
        </div>
      </div>

      <ConditionalRuleDialog
        open={ruleOpen}
        onOpenChange={setRuleOpen}
        value={local.conditional_rule}
        onSave={(rule) => { save({ conditional_rule: rule }); setRuleOpen(false); }}
      />
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5">
      <Switch checked={checked} onCheckedChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

/* ---------------- Conditional Rule Editor ---------------- */
const RULE_PRESETS = [
  { label: "Cliente não possui comprovante de endereço", rule: { if: { field: "customer.has_proof_of_address", op: "eq", value: false } } },
  { label: "Embarcação possui motor", rule: { if: { field: "vessel.has_engine", op: "eq", value: true } } },
  { label: "Processo exige assinatura", rule: { if: { field: "process.requires_signature", op: "eq", value: true } } },
  { label: "Tipo de embarcação = Reboque", rule: { if: { field: "vessel.type", op: "eq", value: "reboque" } } },
];

function ConditionalRuleDialog({ open, onOpenChange, value, onSave }: {
  open: boolean; onOpenChange: (v: boolean) => void; value: any; onSave: (rule: any) => void;
}) {
  const [field, setField] = useState<string>(value?.if?.field || "");
  const [op, setOp] = useState<string>(value?.if?.op || "eq");
  const [val, setVal] = useState<string>(value?.if?.value != null ? String(value.if.value) : "");

  const apply = (preset: any) => {
    setField(preset.if.field); setOp(preset.if.op); setVal(String(preset.if.value));
  };
  const build = () => {
    if (!field) return null;
    let v: any = val;
    if (val === "true") v = true; else if (val === "false") v = false; else if (!isNaN(Number(val)) && val.trim() !== "") v = Number(val);
    return { if: { field, op, value: v } };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Regra condicional</DialogTitle>
          <DialogDescription>Se a condição for verdadeira, o documento é incluído no processo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-semibold">Modelos prontos</p>
            <div className="flex flex-wrap gap-1">
              {RULE_PRESETS.map((p) => (
                <Button key={p.label} variant="outline" size="sm" onClick={() => apply(p.rule)}>{p.label}</Button>
              ))}
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <Field label="Campo">
              <Input value={field} onChange={(e) => setField(e.target.value)} placeholder="customer.field" />
            </Field>
            <Field label="Operador">
              <Select value={op} onValueChange={setOp}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="eq">igual</SelectItem>
                  <SelectItem value="neq">diferente</SelectItem>
                  <SelectItem value="in">em</SelectItem>
                  <SelectItem value="gt">maior que</SelectItem>
                  <SelectItem value="lt">menor que</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Valor">
              <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder="true, false, texto…" />
            </Field>
          </div>
          <p className="rounded-md bg-gray-100 p-2 text-[11px] text-gray-700">Preview: <code>{JSON.stringify(build())}</code></p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onSave(null); }}>Remover regra</Button>
          <Button onClick={() => onSave(build())}>Aplicar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Preview ---------------- */
function PreviewPanel({ pkg, items }: { pkg: PackageRow; items: ItemRow[] }) {
  const mandatory = items.filter((i) => i.is_required && !i.conditional_rule);
  const conditional = items.filter((i) => i.conditional_rule);
  const optional = items.filter((i) => !i.is_required && !i.conditional_rule);
  const signatures = items.filter((i) => i.requires_signature);
  const ocr = items.filter((i) => i.requires_ocr);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-4">
        <p className="text-xs text-gray-500">Simulação do processo</p>
        <h3 className="text-lg font-bold">{pkg.name}</h3>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-700">
          <span>Categoria: <b>{pkg.category || "—"}</b></span>
          <span>Prazo: <b>{pkg.default_deadline_days ?? "—"} dias</b></span>
          <span>Prioridade: <b>{pkg.default_priority || "normal"}</b></span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <PreviewBlock title={`Obrigatórios (${mandatory.length})`} items={mandatory} tone="red" />
        <PreviewBlock title={`Condicionais (${conditional.length})`} items={conditional} tone="amber" />
        <PreviewBlock title={`Opcionais (${optional.length})`} items={optional} tone="gray" />
        <div className="rounded-xl border bg-white p-4">
          <p className="mb-2 text-sm font-bold">Automação prevista</p>
          <ul className="space-y-1 text-xs text-gray-700">
            <li>• {signatures.length} assinatura(s) exigida(s)</li>
            <li>• {ocr.length} documento(s) com OCR</li>
            <li>• {conditional.length} regra(s) condicional(is) avaliada(s)</li>
            <li>• Checklist total: {items.length} item(ns)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
function PreviewBlock({ title, items, tone }: { title: string; items: ItemRow[]; tone: "red" | "amber" | "gray" }) {
  const bg = tone === "red" ? "border-red-200 bg-red-50" : tone === "amber" ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-gray-50";
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <p className="mb-2 text-sm font-bold">{title}</p>
      {items.length ? (
        <ul className="space-y-1 text-xs">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-2">
              <Eye className="h-3 w-3 opacity-60" />
              <span className="truncate">{i.item_label || i.document_role}</span>
              {i.requires_signature && <Signature className="h-3 w-3 text-blue-600" />}
              {i.requires_ocr && <ScanLine className="h-3 w-3 text-purple-600" />}
            </li>
          ))}
        </ul>
      ) : <p className="text-xs text-gray-500">Nenhum.</p>}
    </div>
  );
}
