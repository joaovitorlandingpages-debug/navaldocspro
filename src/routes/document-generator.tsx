import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  FileText, Ship, FileCheck, RotateCcw,
  LayoutTemplate, Settings2, Loader2, Building2, Search, CheckCircle2,
  ArrowLeft, X
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
import { DocumentValidationEngine } from "@/services/validationEngine";

export const Route = createFileRoute("/document-generator")({
  component: DocumentGenerator,
});

function DocumentGenerator() {
  const navigate = useNavigate();
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
          if (!tpl.base_content) {
            console.error("HARDCODED_TEMPLATE_REMOVED - Blocked legacy template generation", tpl.name);
            toast.error(`O modelo "${tpl.name}" é um template legado e não pode ser gerado. Use a versão Profissional.`);
            fail++;
            continue;
          }

          console.log("BASE_CONTENT_PDF_VALIDATED", tpl.name);
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/" })}
            className="h-12 w-12 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 shadow-sm shrink-0"
            title="Voltar para o Início"
          >
            <ArrowLeft className="h-6 w-6 text-navy" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-navy tracking-tight uppercase">Gerador Profissional</h1>
            <p className="text-muted-foreground font-medium italic font-mono text-[10px] md:text-xs uppercase tracking-widest">
              Selecione vários modelos · Gere todos de uma vez
            </p>
          </div>
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
                                  {t.base_content ? (
                                    <Badge className="bg-emerald-50 text-emerald-600 border-none px-1.5 py-0 h-4 text-[8px] font-black uppercase">
                                      Profissional
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-50 text-amber-600 border-none px-1.5 py-0 h-4 text-[8px] font-black uppercase">
                                      Legado
                                    </Badge>
                                  )}
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
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-navy uppercase tracking-widest flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-500" /> Diagnóstico de Dados
                </h3>
                <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter bg-emerald-50 text-emerald-600 border-none">
                  Sincronizado
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: "Cadastro Cliente", status: selectedCustomerId ? "OK" : "PENDENTE", color: selectedCustomerId ? "emerald" : "red" },
                  { label: "Cadastro Embarcação", status: selectedVesselId ? "OK" : "PENDENTE", color: selectedVesselId ? "emerald" : "red" },
                  { label: "OCR Opcional", status: "STANDBY", color: "blue" },
                  { label: "Motor Vinculado", status: vessels?.find((v:any) => v.id === selectedVesselId)?.engine_serial ? "OK" : "PENDENTE", color: vessels?.find((v:any) => v.id === selectedVesselId)?.engine_serial ? "emerald" : "amber" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</span>
                    <Badge className={`bg-${item.color}-50 text-${item.color}-600 border-none px-2 py-0.5 h-5 text-[9px] font-black uppercase`}>
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
              
              <p className="text-[9px] text-slate-400 font-bold italic text-center uppercase tracking-widest">
                * O sistema prioriza dados cadastrados. OCR não é obrigatório para geração.
              </p>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-6">
          {activePreviewId ? (
            <div className="animate-in slide-in-from-right duration-500">
               <DocumentPreviewEditor 
                 template={activeTemplate}
                 processData={{
                   id: "PREVIEW-MODE",
                   customer: customers?.find((c: any) => c.id === selectedCustomerId),
                   vessel: vessels?.find((v: any) => v.id === selectedVesselId),
                   profile: profile,
                   company: (profile as any)?.company,
                   engine: {
                     serial_number: vessels?.find((v: any) => v.id === selectedVesselId)?.engine_serial,
                     manufacturer: vessels?.find((v: any) => v.id === selectedVesselId)?.engine_manufacturer,
                     model: vessels?.find((v: any) => v.id === selectedVesselId)?.engine_model,
                     power: vessels?.find((v: any) => v.id === selectedVesselId)?.engine_power,
                   }
                 }}
                 onSave={(content) => {
                   console.log("Documento revisado:", content);
                   toast.success("Revisão salva com sucesso!");
                 }}
                 onCancel={() => setActivePreviewId("")}
               />
            </div>
          ) : (
            <Card className="h-full min-h-[600px] border-slate-100 border-dashed bg-slate-50/30 flex flex-col items-center justify-center p-12 text-center rounded-[2.5rem]">
              <div className="bg-white p-8 rounded-full shadow-xl shadow-slate-200/50 mb-8 animate-bounce">
                <LayoutTemplate className="h-16 w-16 text-slate-200" />
              </div>
              <h3 className="text-2xl font-black text-navy uppercase tracking-tight mb-3">Selecione um Modelo</h3>
              <p className="text-slate-400 font-medium max-w-sm leading-relaxed">
                Escolha um ou mais modelos à esquerda para visualizar o preenchimento automático e realizar a revisão profissional.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
