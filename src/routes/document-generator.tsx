import { createFileRoute } from "@tanstack/react-router";
import {
  FileText, Ship, FileCheck, RotateCcw,
  LayoutTemplate, Settings2, Loader2, Building2, Search, CheckCircle2,
} from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useDocuments } from "@/hooks/useDocuments";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/document-generator")({
  component: DocumentGenerator,
});

function DocumentGenerator() {
  const { user } = useAuth();
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [activePreviewId, setActivePreviewId] = useState<string>("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedVesselId, setSelectedVesselId] = useState<string>("");
  const [selectedProcessId, setSelectedProcessId] = useState<string>("");
  const [search, setSearch] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const { checkLimit } = usePlanLimits();

  const { templates, generateDocument } = useDocuments();
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const { data: customers } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: vessels } = useQuery({
    queryKey: ["vessels-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vessels").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: processes } = useQuery({
    queryKey: ["processes-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processes")
        .select("*, customer:customers(name), vessel:vessels(name)");
      if (error) throw error;
      return data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile-info"],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*, company:companies(*)")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filteredTemplates = useMemo(() => {
    const list = (templates || []) as any[];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.process_type?.toLowerCase().includes(q)
    );
  }, [templates, search]);

  const activeTemplate = useMemo(
    () => (templates as any[])?.find((t) => t.id === activePreviewId),
    [templates, activePreviewId]
  );

  const toggleTemplate = (id: string) => {
    setSelectedTemplateIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (!next.includes(activePreviewId)) setActivePreviewId(next[0] || "");
      else if (!activePreviewId && next.length) setActivePreviewId(next[0]);
      return next;
    });
  };

  // Auto-populate fields when active preview or entities change
  useEffect(() => {
    if (!activeTemplate) return;
    const newValues: Record<string, string> = { ...formValues };
    const customer = customers?.find((c: any) => c.id === selectedCustomerId);
    const vessel = vessels?.find((v: any) => v.id === selectedVesselId);
    const company = (profile as any)?.company;
    const process = processes?.find((p: any) => p.id === selectedProcessId);

    activeTemplate.fields?.forEach((field: any) => {
      if (field.source_type === "customer" && customer) {
        newValues[field.field_name] = customer[field.source_field] || "";
      } else if (field.source_type === "vessel" && vessel) {
        newValues[field.field_name] = vessel[field.source_field] || "";
      } else if (field.source_type === "company" && company) {
        newValues[field.field_name] = company[field.source_field] || "";
      } else if (field.source_type === "process" && process) {
        newValues[field.field_name] = process[field.source_field] || "";
      } else if (!newValues[field.field_name]) {
        newValues[field.field_name] = "";
      }
    });
    setFormValues(newValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePreviewId, selectedCustomerId, selectedVesselId, selectedProcessId]);

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const buildValuesFor = (tpl: any) => {
    const values: Record<string, string> = {};
    const customer = customers?.find((c: any) => c.id === selectedCustomerId);
    const vessel = vessels?.find((v: any) => v.id === selectedVesselId);
    const company = (profile as any)?.company;
    const process = processes?.find((p: any) => p.id === selectedProcessId);

    tpl.fields?.forEach((field: any) => {
      const manual = formValues[field.field_name];
      if (manual) {
        values[field.field_name] = manual;
        return;
      }
      if (field.source_type === "customer" && customer)
        values[field.field_name] = customer[field.source_field] || "";
      else if (field.source_type === "vessel" && vessel)
        values[field.field_name] = vessel[field.source_field] || "";
      else if (field.source_type === "company" && company)
        values[field.field_name] = company[field.source_field] || "";
      else if (field.source_type === "process" && process)
        values[field.field_name] = process[field.source_field] || "";
      else values[field.field_name] = "";
    });
    return values;
  };

  const handleGenerateAll = async () => {
    if (selectedTemplateIds.length === 0 || !profile?.company_id) {
      toast.error("Selecione ao menos um modelo.");
      return;
    }
    const limit = await checkLimit("documents");
    if (limit.reached) {
      toast.error("Limite de documentos mensais atingido.");
      return;
    }

    setIsGenerating(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const id of selectedTemplateIds) {
        const tpl = (templates as any[]).find((t) => t.id === id);
        if (!tpl) continue;
        try {
          await generateDocument.mutateAsync({
            templateId: id,
            companyId: profile.company_id,
            customerId: selectedCustomerId || undefined,
            vesselId: selectedVesselId || undefined,
            processId: selectedProcessId || undefined,
            fieldValues: buildValuesFor(tpl),
          });
          ok++;
        } catch (e) {
          console.error("Erro ao gerar", tpl.name, e);
          fail++;
        }
      }
      if (ok > 0) toast.success(`${ok} documento(s) gerado(s) com sucesso!`);
      if (fail > 0) toast.error(`${fail} documento(s) falharam.`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-navy tracking-tight uppercase">Gerador Profissional</h1>
          <p className="text-muted-foreground font-medium italic font-mono text-xs uppercase tracking-widest">
            Selecione vários modelos · Gere todos de uma vez
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedTemplateIds([]);
              setActivePreviewId("");
              setSelectedCustomerId("");
              setSelectedVesselId("");
              setSelectedProcessId("");
              setFormValues({});
            }}
            className="flex-1 md:flex-none h-12 rounded-xl border-slate-200 font-bold gap-2"
          >
            <RotateCcw className="h-4 w-4" /> Resetar
          </Button>
          <Button
            onClick={handleGenerateAll}
            disabled={selectedTemplateIds.length === 0 || isGenerating}
            className="flex-1 md:flex-none bg-red-500 text-white h-12 rounded-xl font-bold gap-2 hover:bg-red-600 shadow-lg shadow-red-500/20"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
            Gerar {selectedTemplateIds.length > 0 ? `${selectedTemplateIds.length} ` : ""}Documento(s)
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-8">
          <Card className="p-8 rounded-[2.5rem] border-slate-100 shadow-sm space-y-8 bg-white relative">
            <div className="space-y-6 relative z-10">
              <h3 className="text-sm font-black text-navy uppercase tracking-widest flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-red-500" /> Configuração Master
              </h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Modelos Oficiais ({selectedTemplateIds.length} selecionado{selectedTemplateIds.length !== 1 ? "s" : ""})
                    </Label>
                    {selectedTemplateIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => { setSelectedTemplateIds([]); setActivePreviewId(""); }}
                        className="text-[10px] font-bold text-red-500 uppercase tracking-wider hover:underline"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar modelo..."
                      className="h-10 pl-9 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>

                  <ScrollArea className="h-[260px] border border-slate-100 rounded-2xl bg-slate-50/50">
                    <div className="p-2 space-y-1">
                      {filteredTemplates.length === 0 ? (
                        <div className="text-center py-8 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Nenhum modelo encontrado
                        </div>
                      ) : (
                        filteredTemplates.map((t: any) => {
                          const checked = selectedTemplateIds.includes(t.id);
                          const isActive = activePreviewId === t.id;
                          return (
                            <label
                              key={t.id}
                              className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                                checked
                                  ? "bg-white border-primary/30 shadow-sm"
                                  : "border-transparent hover:bg-white hover:border-slate-200"
                              }`}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleTemplate(t.id)}
                                className="mt-0.5"
                              />
                              <div
                                className="flex-1 min-w-0"
                                onClick={(e) => {
                                  if (checked) {
                                    e.preventDefault();
                                    setActivePreviewId(t.id);
                                  }
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <FileText className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span className="text-xs font-bold text-navy truncate">{t.name}</span>
                                  {checked && isActive && (
                                    <Badge className="bg-primary/10 text-primary border-0 px-1.5 py-0 h-4 text-[8px] font-black uppercase">
                                      Preview
                                    </Badge>
                                  )}
                                </div>
                                {t.category && (
                                  <p className="text-[10px] text-slate-400 mt-0.5 ml-5">{t.category}</p>
                                )}
                              </div>
                              {checked && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                            </label>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</Label>
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customers?.map((c: any) => (
                          <SelectItem key={c.id} value={c.id} className="font-bold">{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Embarcação</Label>
                    <Select value={selectedVesselId} onValueChange={setSelectedVesselId}>
                      <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {vessels?.map((v: any) => (
                          <SelectItem key={v.id} value={v.id} className="font-bold">{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Processo Vinculado (Opcional)</Label>
                  <Select value={selectedProcessId} onValueChange={setSelectedProcessId}>
                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold">
                      <SelectValue placeholder="Nenhum processo selecionado" />
                    </SelectTrigger>
                    <SelectContent>
                      {processes?.map((p: any) => (
                        <SelectItem key={p.id} value={p.id} className="font-bold">
                          #{p.id.slice(0, 5)} - {p.customer?.name} ({p.vessel?.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-50 space-y-6 relative z-10">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-navy uppercase tracking-widest flex items-center gap-2">
                  <LayoutTemplate className="h-4 w-4 text-red-500" /> Campos do Modelo em Preview
                </h3>
              </div>

              <ScrollArea className="h-[300px] pr-4">
                {!activeTemplate ? (
                  <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <FileText className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                      Selecione um modelo para editar os campos
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {activeTemplate?.fields?.map((field: any) => (
                      <div key={field.id} className="space-y-1.5 animate-in slide-in-from-left-4 duration-300">
                        <Label className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-2">
                          {field.field_label}
                          {field.source_type !== "manual" && (
                            <Badge className="bg-slate-100 text-slate-500 border-none px-2 py-0 h-4 text-[8px] font-black uppercase">Auto</Badge>
                          )}
                        </Label>
                        <Input
                          value={formValues[field.field_name] || ""}
                          onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                          className="h-10 bg-slate-50 border-slate-200 rounded-lg text-xs font-bold focus:bg-white transition-all"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
              <Badge className="bg-green-100 text-green-700 border-none px-3 py-1 font-black text-[9px] uppercase tracking-widest">
                {selectedTemplateIds.length} na Fila
              </Badge>
              <Badge className="bg-navy/5 text-navy/60 border-none px-3 py-1 font-black text-[9px] uppercase tracking-widest">Preview A4</Badge>
            </div>
            {selectedTemplateIds.length > 1 && (
              <div className="flex gap-1 flex-wrap">
                {selectedTemplateIds.map((id) => {
                  const t = (templates as any[])?.find((x) => x.id === id);
                  if (!t) return null;
                  const active = activePreviewId === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setActivePreviewId(id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                        active ? "bg-navy text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {t.name?.slice(0, 24)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-slate-900 p-12 rounded-[2.5rem] flex justify-center overflow-hidden min-h-[800px] relative shadow-2xl shadow-navy/20">
            {activeTemplate ? (
              <div
                ref={previewRef}
                className="bg-white w-[595px] min-h-[842px] shadow-2xl p-16 flex flex-col relative animate-in zoom-in-95 duration-500 origin-top"
              >
                <div className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-8">
                  <div className="space-y-1">
                    <h2 className="text-xl font-black uppercase tracking-tighter text-navy leading-none">Marinha do Brasil</h2>
                    <h3 className="text-xs font-bold uppercase text-slate-600 tracking-widest">Diretoria de Portos e Costas</h3>
                  </div>
                  <Ship className="h-8 w-8 text-navy opacity-20" />
                </div>

                <div className="text-center mb-12">
                  <h4 className="text-lg font-black uppercase underline decoration-2 underline-offset-8 text-navy">
                    {activeTemplate?.name}
                  </h4>
                </div>

                <div className="space-y-6 text-sm leading-relaxed text-justify flex-grow text-slate-800">
                  <p>
                    Eu, <span className="font-bold underline decoration-slate-300">{formValues["owner_name"] || formValues["clientName"] || "________________________"}</span>,
                    inscrito no CPF/CNPJ sob o nº <span className="font-bold underline decoration-slate-300">{formValues["owner_id"] || formValues["clientId"] || "________________"}</span>,
                    residente em <span className="font-bold underline decoration-slate-300">{formValues["owner_address"] || formValues["clientAddress"] || "________________________"}</span>,
                    venho solicitar o que segue em relação à embarcação <span className="font-bold underline decoration-slate-300">{formValues["vessel_name"] || "________________"}</span>.
                  </p>
                </div>

                <div className="mt-12 space-y-8">
                  <div className="bg-navy/5 p-4 rounded-xl border border-navy/10 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-navy" />
                      <div className="leading-tight">
                        <p className="text-[10px] font-black text-navy uppercase">{(profile as any)?.company?.name || "NavalDocs Pro"}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Responsável: {(profile as any)?.full_name || (profile as any)?.name}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-white/20 gap-6">
                <LayoutTemplate className="h-24 w-24 opacity-20" />
                <p className="text-xl font-black uppercase tracking-widest">Selecione um ou mais modelos</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
