/**
 * NewProcessQuickDialog — entry point do Motor Inteligente.
 *
 * Fluxo em 2 etapas:
 *  1. Tipo + Cliente/Embarcação/Prioridade.
 *  2. Documentos do Processo (obrigatórios/opcionais/condicionais) com
 *     seleção manual e adição de extras da Biblioteca Nacional.
 *
 * Ao concluir, cria o processo e chama o Blueprint Engine com os toggles
 * escolhidos (exclusões e extras) — o checklist é materializado
 * automaticamente, sem prender o usuário.
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Sparkles, ArrowRight, ArrowLeft, Search, FileText, Plus, X,
  ShieldCheck, GitBranch, PackageOpen, Signature, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  materializeProcessBlueprint,
  previewProcessBlueprint,
  type BlueprintPreviewItem,
} from "@/services/processes/blueprintEngine";
import { batchGenerate, type BatchReport, type ChecklistLite } from "@/services/processes/batchChecklistActions";
import { Progress } from "@/components/ui/progress";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenAdvanced?: () => void;
}

type ProcessTypeRow = { id: string; name: string; category: string | null };
type CustomerRow = { id: string; name: string };
type VesselRow = { id: string; name: string; customer_id: string | null };
type TemplateRow = { id: string; name: string; category: string | null };

type Step = 1 | 2;

export function NewProcessQuickDialog({ isOpen, onClose, onOpenAdvanced }: Props) {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [step, setStep] = useState<Step>(1);

  const [types, setTypes] = useState<ProcessTypeRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [vessels, setVessels] = useState<VesselRow[]>([]);
  const [typeQuery, setTypeQuery] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [secondaryCustomerId, setSecondaryCustomerId] = useState<string>("");
  const [vesselId, setVesselId] = useState<string>("");
  const [priority, setPriority] = useState<string>("normal");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [allowEmptyPackage, setAllowEmptyPackage] = useState(false);

  // Etapa 2 — documentos
  const [preview, setPreview] = useState<BlueprintPreviewItem[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());   // template_ids desmarcados
  const [extras, setExtras] = useState<TemplateRow[]>([]);            // adicionados da biblioteca
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryResults, setLibraryResults] = useState<TemplateRow[]>([]);

  // Geração automática pós-criação
  const [generateNow, setGenerateNow] = useState(true);
  const [genProgress, setGenProgress] = useState<{ done: number; total: number; current: string } | null>(null);
  const [genReport, setGenReport] = useState<BatchReport | null>(null);
  const [createdProcessId, setCreatedProcessId] = useState<string | null>(null);

  const isTransfer = selectedTypeId
    ? types.find((t) => t.id === selectedTypeId)?.name === "Transferência de Propriedade"
    : false;

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const [{ data: pt }, { data: cs }, { data: vs }] = await Promise.all([
        supabase.from("process_types").select("id,name,category").order("name"),
        supabase.from("customers").select("id,name").order("name").limit(500),
        supabase.from("vessels").select("id,name,customer_id").order("name").limit(500),
      ]);
      setTypes((pt as any) ?? []);
      setCustomers((cs as any) ?? []);
      setVessels((vs as any) ?? []);
    })();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedTypeId("");
      setCustomerId("");
      setSecondaryCustomerId("");
      setVesselId("");
      setPriority("normal");
      setTitle("");
      setTypeQuery("");
      setPreview([]);
      setExcluded(new Set());
      setExtras([]);
      setLibraryOpen(false);
      setLibraryQuery("");
      setLibraryResults([]);
      setAllowEmptyPackage(false);
    }
  }, [isOpen]);

  const filteredTypes = useMemo(() => {
    const q = typeQuery.trim().toLowerCase();
    if (!q) return types;
    return types.filter((t) => t.name.toLowerCase().includes(q) || (t.category ?? "").toLowerCase().includes(q));
  }, [types, typeQuery]);

  const grouped = useMemo(() => {
    const map = new Map<string, ProcessTypeRow[]>();
    for (const t of filteredTypes) {
      const key = t.category || "Outros";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredTypes]);

  const vesselOptions = useMemo(() => {
    if (!customerId) return vessels;
    return vessels.filter((v) => v.customer_id === customerId);
  }, [vessels, customerId]);

  const selectedType = types.find((t) => t.id === selectedTypeId) || null;

  async function goToStep2() {
    if (!selectedType) { toast.error("Selecione o tipo de processo."); return; }
    if (!customerId) { toast.error("Selecione ou crie um cliente para continuar."); return; }
    if (isTransfer && !secondaryCustomerId) {
      toast.error("Selecione ou crie o vendedor (cliente secundário) para transferência.");
      return;
    }
    setLoadingPreview(true);
    try {
      const items = await previewProcessBlueprint(selectedType.name);
      // Bloqueia continuar se package vazio e usuário ainda não confirmou "processo vazio manual".
      if (items.length === 0 && !allowEmptyPackage) {
        const ok = window.confirm(
          `⚠ O tipo "${selectedType.name}" ainda não possui modelo de documentos configurado.\n\n` +
          `Deseja criar um PROCESSO VAZIO MANUALMENTE?\n` +
          `Você terá que anexar/gerar cada documento à mão — sem checklist automático.`
        );
        if (!ok) { setLoadingPreview(false); return; }
        setAllowEmptyPackage(true);
      }
      setPreview(items);
      const initialExcluded = new Set<string>();
      items.forEach((i) => {
        if ((i.kind === "optional" || i.kind === "conditional") && i.templateId) {
          initialExcluded.add(i.templateId);
        }
      });
      setExcluded(initialExcluded);
      setStep(2);
    } catch (e: any) {
      toast.error("Falha ao carregar documentos do modelo: " + (e?.message || e));
    } finally {
      setLoadingPreview(false);
    }
  }

  async function checkCustomerDuplicate(cpf?: string): Promise<boolean> {
    if (!cpf) return true;
    const { data } = await supabase.rpc("check_process_duplicates" as any, {
      p_cpf_cnpj: cpf, p_hull_number: null, p_tie: null, p_vessel_name: null,
    });
    const dup = (data as any)?.customers ?? [];
    if (dup.length > 0) {
      const nomes = dup.map((c: any) => `• ${c.name} (${c.cpf_cnpj || "sem doc"})`).join("\n");
      return window.confirm(
        `⚠ CPF/CNPJ já cadastrado para:\n${nomes}\n\nDeseja mesmo assim criar um NOVO cadastro? (Recomenda-se usar o existente.)`
      );
    }
    return true;
  }

  async function checkVesselDuplicate(name: string): Promise<boolean> {
    const { data } = await supabase.rpc("check_process_duplicates" as any, {
      p_cpf_cnpj: null, p_hull_number: null, p_tie: null, p_vessel_name: name,
    });
    const dup = (data as any)?.vessels ?? [];
    if (dup.length > 0) {
      const nomes = dup.map((v: any) => `• ${v.name} (${v.hull_number || v.tie || "—"})`).join("\n");
      return window.confirm(
        `⚠ Já existem embarcações parecidas:\n${nomes}\n\nCriar mesmo assim?`
      );
    }
    return true;
  }

  async function createCustomerInline(kind: "primary" | "secondary" = "primary") {
    const label = kind === "secondary" ? "vendedor (cliente secundário)" : "cliente";
    const name = window.prompt(`Nome do ${label}:`)?.trim();
    if (!name) return;
    const cpf = window.prompt(`CPF/CNPJ do ${label} (opcional):`)?.trim() || null;
    if (!profile?.company_id) { toast.error("Empresa não vinculada."); return; }
    if (cpf && !(await checkCustomerDuplicate(cpf))) return;
    const { data, error } = await supabase
      .from("customers")
      .insert({ company_id: profile.company_id, name, cpf_cnpj: cpf })
      .select("id,name").single();
    if (error) { toast.error("Erro ao criar cliente: " + error.message); return; }
    setCustomers((prev) => [...prev, data as any].sort((a, b) => a.name.localeCompare(b.name)));
    if (kind === "secondary") setSecondaryCustomerId((data as any).id);
    else setCustomerId((data as any).id);
    toast.success(`Cliente "${name}" criado.`);
  }

  async function createVesselInline() {
    if (!customerId) { toast.error("Selecione o cliente antes."); return; }
    const name = window.prompt("Nome da embarcação:")?.trim();
    if (!name) return;
    if (!profile?.company_id) { toast.error("Empresa não vinculada."); return; }
    if (!(await checkVesselDuplicate(name))) return;
    const { data, error } = await supabase
      .from("vessels")
      .insert({ company_id: profile.company_id, customer_id: customerId, name })
      .select("id,name,customer_id").single();
    if (error) { toast.error("Erro ao criar embarcação: " + error.message); return; }
    setVessels((prev) => [...prev, data as any].sort((a, b) => a.name.localeCompare(b.name)));
    setVesselId((data as any).id);
    toast.success(`Embarcação "${name}" criada.`);
  }

  function toggleTemplate(tplId: string | null) {
    if (!tplId) return;
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(tplId)) next.delete(tplId); else next.add(tplId);
      return next;
    });
  }

  async function searchLibrary(q: string) {
    setLibraryQuery(q);
    if (q.trim().length < 2) { setLibraryResults([]); return; }
    const { data } = await supabase
      .from("document_templates")
      .select("id,name,category")
      .ilike("name", `%${q}%`)
      .limit(15);
    setLibraryResults((data as any) ?? []);
  }

  function addExtra(t: TemplateRow) {
    if (extras.some((e) => e.id === t.id)) return;
    // Se já existir no pacote, apenas desexcluir.
    const inPreview = preview.find((p) => p.templateId === t.id);
    if (inPreview) {
      setExcluded((prev) => { const n = new Set(prev); n.delete(t.id); return n; });
      toast.success(`"${t.name}" marcado no pacote.`);
      return;
    }
    setExtras((prev) => [...prev, t]);
  }
  function removeExtra(id: string) {
    setExtras((prev) => prev.filter((e) => e.id !== id));
  }

  const selectedCount = useMemo(() => {
    const base = preview.filter((p) => p.templateId && !excluded.has(p.templateId)).length;
    return base + extras.length;
  }, [preview, excluded, extras]);

  async function handleCreate() {
    if (!selectedType) return;
    if (!profile?.company_id) {
      toast.error("Sua empresa ainda não foi vinculada. Recarregue e tente novamente.");
      return;
    }
    if (!customerId) {
      toast.error("Selecione ou crie um cliente para continuar.");
      setStep(1);
      return;
    }
    if (selectedCount === 0) {
      const ok = window.confirm(
        "Nenhum documento selecionado. Deseja criar o processo mesmo assim? Você poderá adicionar documentos depois no Blueprint."
      );
      if (!ok) return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("processes")
        .insert({
          company_id: profile.company_id,
          process_type: selectedType.name,
          process_type_id: selectedType.id,
          customer_id: customerId,
          secondary_customer_id: isTransfer && secondaryCustomerId ? secondaryCustomerId : null,
          vessel_id: vesselId || null,
          title: title.trim() || selectedType.name,
          priority,
          status: "pending",
        } as any)
        .select("id").single();
      if (error) throw error;
      const processId = (data as any).id as string;

      try {
        const result = await materializeProcessBlueprint(processId, {
          excludeTemplateIds: Array.from(excluded),
          extraTemplateIds: extras.map((e) => e.id),
        });
        console.log("[BLUEPRINT_MATERIALIZED]", result);
      } catch (e) {
        console.warn("Blueprint materialize falhou (não bloqueia):", e);
      }

      toast.success(`Processo criado com ${selectedCount} documento(s) no checklist.`);
      onClose();
      navigate({ to: "/processes/$id", params: { id: processId }, search: { tab: "overview" } });
    } catch (e: any) {
      toast.error("Erro ao criar processo: " + (e?.message || e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            {step === 1 ? "Novo Processo" : "Documentos do Processo"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Escolha o tipo — o sistema sugere automaticamente todos os documentos, anexos e assinaturas."
              : "Revise a lista sugerida. Você pode marcar opcionais, incluir condicionais e adicionar extras da Biblioteca."}
          </DialogDescription>
          <div className="flex items-center gap-2 pt-2 text-[10px] font-black uppercase tracking-widest">
            <StepPill n={1} label="Tipo" active={step === 1} done={step > 1} />
            <div className="h-px flex-1 bg-slate-200" />
            <StepPill n={2} label="Documentos" active={step === 2} done={false} />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          {step === 1 ? (
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Tipo de processo <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                  <Input
                    value={typeQuery}
                    onChange={(e) => setTypeQuery(e.target.value)}
                    placeholder="Buscar por nome ou categoria..."
                    className="pl-9"
                  />
                </div>
                <div className="max-h-[240px] overflow-y-auto rounded-lg border bg-slate-50/50">
                  {grouped.length === 0 ? (
                    <div className="text-xs text-slate-400 italic p-4 text-center">Nenhum tipo encontrado.</div>
                  ) : grouped.map(([cat, list]) => (
                    <div key={cat}>
                      <div className="sticky top-0 bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {cat}
                      </div>
                      {list.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTypeId(t.id)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-sm border-b last:border-b-0 transition ${
                            selectedTypeId === t.id ? "bg-primary/10 text-primary font-semibold" : "hover:bg-white"
                          }`}
                        >
                          <span>{t.name}</span>
                          {selectedTypeId === t.id && <ArrowRight className="h-4 w-4" />}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      {isTransfer ? "Comprador" : "Cliente"} <span className="text-red-500">*</span>
                    </Label>
                    <button type="button" onClick={() => createCustomerInline("primary")} className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Novo
                    </button>
                  </div>
                  <Select value={customerId || ""} onValueChange={(v) => { setCustomerId(v); setVesselId(""); }}>
                    <SelectTrigger className={!customerId ? "border-red-300" : ""}><SelectValue placeholder={isTransfer ? "Selecione o comprador" : "Selecione um cliente"} /></SelectTrigger>
                    <SelectContent>
                      {customers.filter((c) => c.id !== secondaryCustomerId).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {!customerId && (
                    <p className="text-[11px] text-red-600">Selecione ou crie {isTransfer ? "o comprador" : "um cliente"} para continuar.</p>
                  )}
                </div>
                {isTransfer && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Vendedor <span className="text-red-500">*</span>
                      </Label>
                      <button type="button" onClick={() => createCustomerInline("secondary")} className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1">
                        <Plus className="h-3 w-3" /> Novo
                      </button>
                    </div>
                    <Select value={secondaryCustomerId || ""} onValueChange={setSecondaryCustomerId}>
                      <SelectTrigger className={!secondaryCustomerId ? "border-red-300" : ""}><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger>
                      <SelectContent>
                        {customers.filter((c) => c.id !== customerId).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {!secondaryCustomerId && (
                      <p className="text-[11px] text-red-600">Vendedor obrigatório em transferência.</p>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Embarcação <span className="text-slate-400 normal-case font-medium">(opcional)</span>
                    </Label>
                    <button type="button" onClick={createVesselInline} disabled={!customerId} className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed">
                      <Plus className="h-3 w-3" /> Nova
                    </button>
                  </div>
                  <Select value={vesselId || "none"} onValueChange={(v) => setVesselId(v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Vincular depois" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Vincular depois —</SelectItem>
                      {vesselOptions.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Título interno (opcional)</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={selectedType?.name || "Ex.: Registro embarcação Phoenix"} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Prioridade</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {loadingPreview ? (
                <div className="py-16 flex items-center justify-center text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando modelo…
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <MiniStat icon={ShieldCheck} label="Obrigatórios" value={preview.filter((p) => p.kind === "mandatory").length} tone="emerald" />
                    <MiniStat icon={PackageOpen} label="Opcionais" value={preview.filter((p) => p.kind === "optional").length} tone="slate" />
                    <MiniStat icon={GitBranch} label="Condicionais" value={preview.filter((p) => p.kind === "conditional").length} tone="violet" />
                  </div>

                  <DocSection
                    title="Obrigatórios"
                    icon={ShieldCheck}
                    tone="emerald"
                    items={preview.filter((p) => p.kind === "mandatory")}
                    excluded={excluded}
                    onToggle={toggleTemplate}
                    lockChecked
                  />
                  <DocSection
                    title="Opcionais"
                    icon={PackageOpen}
                    tone="slate"
                    items={preview.filter((p) => p.kind === "optional")}
                    excluded={excluded}
                    onToggle={toggleTemplate}
                    emptyLabel="Sem opcionais neste modelo."
                  />
                  <DocSection
                    title="Condicionais"
                    icon={GitBranch}
                    tone="violet"
                    items={preview.filter((p) => p.kind === "conditional")}
                    excluded={excluded}
                    onToggle={toggleTemplate}
                    emptyLabel="Sem condicionais neste modelo."
                  />

                  {/* Extras da biblioteca */}
                  <div className="rounded-2xl border border-slate-100 p-4 bg-slate-50/40">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm font-black uppercase tracking-widest text-navy">Extras da Biblioteca</span>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={() => setLibraryOpen((v) => !v)}>
                        <Plus className="h-4 w-4 mr-1" /> Adicionar
                      </Button>
                    </div>
                    {libraryOpen && (
                      <div className="mb-3">
                        <div className="relative">
                          <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                          <Input value={libraryQuery} onChange={(e) => searchLibrary(e.target.value)} placeholder="Buscar template por nome..." className="pl-9" />
                        </div>
                        {libraryResults.length > 0 && (
                          <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border bg-white">
                            {libraryResults.map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => addExtra(t)}
                                className="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 border-b last:border-b-0"
                              >
                                <span>{t.name}</span>
                                <span className="text-[10px] text-slate-400 uppercase">{t.category || "geral"}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {extras.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Nenhum extra adicionado.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {extras.map((e) => (
                          <Badge key={e.id} variant="outline" className="gap-1.5 pl-2 pr-1 py-1">
                            {e.name}
                            <button type="button" onClick={() => removeExtra(e.id)} className="hover:bg-slate-100 rounded p-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between border-t pt-3 mt-2">
          {step === 1 ? (
            <>
              {onOpenAdvanced ? (
                <Button variant="ghost" type="button" onClick={() => { onClose(); onOpenAdvanced(); }} disabled={submitting}>
                  Modo avançado (com uploads)
                </Button>
              ) : <div />}
              <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>Cancelar</Button>
                <Button type="button" onClick={goToStep2} disabled={!selectedTypeId || !customerId || (isTransfer && !secondaryCustomerId) || loadingPreview} title={!customerId ? "Selecione um cliente" : (isTransfer && !secondaryCustomerId ? "Selecione o vendedor" : undefined)}>
                  {loadingPreview ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Continuar <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="ghost" type="button" onClick={() => setStep(1)} disabled={submitting}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500">
                  {selectedCount} documento{selectedCount === 1 ? "" : "s"} no checklist
                </span>
                <Button type="button" onClick={handleCreate} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Criar Processo
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepPill({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
      active ? "bg-primary text-primary-foreground border-primary" :
      done ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
      "bg-slate-50 text-slate-400 border-slate-200"
    }`}>
      <span className="h-4 w-4 rounded-full bg-white/20 grid place-content-center text-[9px] font-black">{n}</span>
      {label}
    </span>
  );
}

function MiniStat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "emerald" | "slate" | "violet" }) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    slate: "bg-slate-50 text-slate-600 border-slate-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
  };
  return (
    <div className={`rounded-xl border p-3 ${map[tone]}`}>
      <Icon className="h-4 w-4 mx-auto mb-1" />
      <p className="text-lg font-black">{value}</p>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-80">{label}</p>
    </div>
  );
}

function DocSection({
  title, icon: Icon, tone, items, excluded, onToggle, emptyLabel, lockChecked,
}: {
  title: string;
  icon: any;
  tone: "emerald" | "slate" | "violet";
  items: BlueprintPreviewItem[];
  excluded: Set<string>;
  onToggle: (id: string | null) => void;
  emptyLabel?: string;
  lockChecked?: boolean;
}) {
  const border: Record<string, string> = {
    emerald: "border-emerald-100", slate: "border-slate-100", violet: "border-violet-100",
  };
  return (
    <div className={`rounded-2xl border ${border[tone]} bg-white p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-4 w-4 ${tone === "emerald" ? "text-emerald-600" : tone === "violet" ? "text-violet-600" : "text-slate-500"}`} />
        <span className="text-sm font-black uppercase tracking-widest text-navy">{title}</span>
        <Badge variant="outline" className="text-[10px] font-black">{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-xs italic text-slate-400">{emptyLabel || "—"}</p>
      ) : (
        <div className="space-y-2">
          {items.map((it, idx) => {
            const checked = lockChecked ? true : !(it.templateId && excluded.has(it.templateId));
            return (
              <label
                key={(it.templateId || it.name) + idx}
                className={`flex items-start gap-3 p-2.5 rounded-xl border transition cursor-pointer ${
                  checked ? "bg-slate-50 border-slate-100" : "bg-white border-slate-100 opacity-70"
                } ${lockChecked ? "cursor-default" : "hover:border-primary/30"}`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => !lockChecked && onToggle(it.templateId)}
                  disabled={lockChecked || !it.templateId}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-navy">{it.name}</p>
                  {it.ruleSummary && (
                    <p className="text-[11px] text-violet-600 mt-0.5 line-clamp-2">
                      Só é gerado se: {it.ruleSummary}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {it.requiresSignature && (
                      <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest gap-1 border-amber-200 text-amber-600">
                        <Signature className="h-2.5 w-2.5" /> assina
                      </Badge>
                    )}
                    {it.requiresOcr && (
                      <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest gap-1 border-sky-200 text-sky-600">
                        <Zap className="h-2.5 w-2.5" /> OCR
                      </Badge>
                    )}
                    {!it.templateId && (
                      <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-slate-200 text-slate-500">
                        sem template
                      </Badge>
                    )}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
