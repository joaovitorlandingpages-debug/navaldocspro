import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { validateProcessCompliance, type ComplianceReport } from "@/lib/compliance.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShieldCheck, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  Mic, 
  Sliders, 
  FileCheck2, 
  Anchor,
  Compass,
  LifeBuoy
} from "lucide-react";
import { VistoriaAudioCopilot } from "@/components/vessels/VistoriaAudioCopilot";
import { performCrossValidation, type ExtractedDocumentData } from "@/services/crossValidationEngine";
import { toast } from "sonner";

export const Route = createFileRoute("/compliance-ai")({
  head: () => ({ meta: [{ title: "Validador & Simulador NORMAM (IA) — NavalDocs Pro" }] }),
  component: ComplianceAIPage,
});

function ComplianceAIPage() {
  const [activeTab, setActiveTab] = useState<string>("process-validator");
  const [selectedId, setSelectedId] = useState<string>("");
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const validate = useServerFn(validateProcessCompliance);

  // Estados do Simulador NORMAM
  const [simVesselType, setSimVesselType] = useState<string>("lancha");
  const [simLength, setSimLength] = useState<number>(8.5);
  const [simArea, setSimArea] = useState<string>("mar_aberto_costeira");
  const [simPassengers, setSimPassengers] = useState<number>(8);
  const [simEngineHP, setSimEngineHP] = useState<number>(250);

  // Estados da Validação Cruzada Demo
  const [crossValResult, setCrossValResult] = useState<any>(null);

  const { data: processes = [] } = useQuery({
    queryKey: ["processes-list"],
    queryFn: async () => {
      const { data } = await supabase.from("processes").select("id, process_type, status").limit(50);
      return data || [];
    },
  });

  const mut = useMutation({
    mutationFn: async (id: string) => {
      console.log("COMPLIANCE_AI_VALIDATION_STARTED", id);
      return await validate({ data: { processId: id } });
    },
    onSuccess: (r) => {
      setReport(r);
      console.log("COMPLIANCE_AI_VALIDATION_OK", r.score);
      toast.success("Auditoria NORMAM concluída com sucesso!");
    },
  });

  const runCrossValidationDemo = (scenario: 'match' | 'divergence') => {
    let mockDocs: ExtractedDocumentData[] = [];
    if (scenario === 'divergence') {
      mockDocs = [
        {
          documentType: 'TIE',
          fields: {
            owner_name: 'Carlos Eduardo Silva',
            owner_cpf: '123.456.789-00',
            vessel_name: 'Mar Azul I',
            registration_number: '381-123456-7',
            engine_serial: '2B998877',
            engine_power_hp: 250,
            length: 8.5,
          },
        },
        {
          documentType: 'CNH',
          fields: {
            owner_name: 'Carlos Eduardo Silva',
            owner_cpf: '999.888.777-66', // CPF divergente proposital
          },
        },
        {
          documentType: 'NOTA_FISCAL_MOTOR',
          fields: {
            engine_serial: '2B998800', // Serial divergente proposital
            engine_power_hp: 300,
          },
        },
      ];
    } else {
      mockDocs = [
        {
          documentType: 'TIE',
          fields: {
            owner_name: 'Roberto Andrade Santos',
            owner_cpf: '321.654.987-11',
            vessel_name: 'Vento Forte',
            registration_number: '441-987654-3',
            engine_serial: 'OT654321',
            engine_power_hp: 150,
            length: 6.2,
          },
        },
        {
          documentType: 'CNH',
          fields: {
            owner_name: 'Roberto Andrade Santos',
            owner_cpf: '321.654.987-11',
          },
        },
        {
          documentType: 'PROCURACAO',
          fields: {
            grantor_name: 'Roberto Andrade Santos',
            grantor_cpf: '321.654.987-11',
          },
        },
      ];
    }

    const result = performCrossValidation(mockDocs);
    setCrossValResult(result);
    toast.info("Validação cruzada de documentos processada!");
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-6 md:p-8 pb-24">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 bg-navy rounded-2xl flex items-center justify-center shadow-lg shadow-navy/20">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-navy">Central Regulatória NORMAM</h1>
                <Badge className="bg-primary text-navy font-black text-[9px] uppercase tracking-widest border-none">
                  Gemini 3.7 AI
                </Badge>
              </div>
              <p className="text-xs font-semibold text-slate-400">
                Auditoria, Vistorias e Prevenção de Indeferimentos da Marinha do Brasil
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 text-[10px] font-black uppercase border-slate-200 text-slate-500">
            DPC / NORMAM 2026
          </Badge>
        </div>
      </div>

      {/* Tabs Principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1.5 rounded-2xl gap-1">
          <TabsTrigger value="process-validator" className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm">
            <ShieldCheck className="h-4 w-4 text-primary" /> Auditor de Processos
          </TabsTrigger>
          <TabsTrigger value="audio-vistoria" className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm">
            <Mic className="h-4 w-4 text-primary" /> Vistoria Náutica por Voz
          </TabsTrigger>
          <TabsTrigger value="normam-simulator" className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm">
            <Sliders className="h-4 w-4 text-primary" /> Simulador de Salvatagem
          </TabsTrigger>
          <TabsTrigger value="cross-validator" className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:text-navy data-[state=active]:shadow-sm">
            <FileCheck2 className="h-4 w-4 text-primary" /> Validação Anti-Divergência
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Auditor de Processos Existentes */}
        <TabsContent value="process-validator" className="space-y-6">
          <Card className="p-6 md:p-8 border-slate-100 shadow-md rounded-3xl bg-white space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Selecione o processo naval para auditoria completa
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="">— Selecionar processo ativo —</option>
                {processes.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.process_type} ({p.status})
                  </option>
                ))}
              </select>
              <Button
                onClick={() => selectedId && mut.mutate(selectedId)}
                disabled={!selectedId || mut.isPending}
                className="bg-navy hover:bg-navy/90 text-white font-black text-xs uppercase tracking-wider px-6 h-12 rounded-2xl gap-2 shrink-0"
              >
                {mut.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-primary" /> Auditando Normas...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-primary" /> Auditar com NORMAM IA
                  </>
                )}
              </Button>
            </div>
            {mut.error && <p className="text-rose-600 text-xs font-bold">{(mut.error as Error).message}</p>}
          </Card>

          {report && (
            <Card className="p-8 border-slate-100 shadow-xl rounded-3xl bg-white space-y-6 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Score de Conformidade NORMAM
                  </p>
                  <p className={`text-5xl font-black ${report.score >= 80 ? "text-emerald-500" : report.score >= 50 ? "text-amber-500" : "text-rose-500"}`}>
                    {report.score}
                    <span className="text-2xl text-slate-300">/100</span>
                  </p>
                </div>
                <Badge
                  className={`text-[10px] font-black uppercase border-none px-4 py-2 ${
                    report.approved ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {report.approved ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1 inline" /> Processo Conforme
                    </>
                  ) : (
                    "Exigências Detectadas"
                  )}
                </Badge>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed font-medium">{report.summary}</p>

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Apontamentos Regulatórios ({report.findings?.length || 0})
                </p>
                {report.findings?.map((f, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-2xl border transition-all ${
                      f.severity === "critical"
                        ? "bg-rose-50/70 border-rose-200"
                        : f.severity === "warning"
                        ? "bg-amber-50/70 border-amber-200"
                        : "bg-blue-50/70 border-blue-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {f.severity === "critical" ? (
                        <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
                      ) : (
                        <Info className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-white text-navy font-bold text-[9px] uppercase border-slate-200">
                            {f.norma}
                          </Badge>
                          <span className="text-[10px] font-black uppercase text-slate-500">{f.severity}</span>
                        </div>
                        <p className="text-sm font-bold text-navy">{f.issue}</p>
                        <p className="text-xs text-slate-600 font-medium">➜ {f.recommendation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* TAB 2: Vistoria Náutica por Voz */}
        <TabsContent value="audio-vistoria">
          <VistoriaAudioCopilot vesselName="Embarcação em Auditoria" />
        </TabsContent>

        {/* TAB 3: Simulador de Salvatagem e Equipamentos NORMAM */}
        <TabsContent value="normam-simulator" className="space-y-6">
          <Card className="p-6 md:p-8 border-slate-100 shadow-md rounded-3xl bg-white space-y-6">
            <div>
              <h3 className="text-lg font-bold text-navy flex items-center gap-2">
                <Compass className="h-5 w-5 text-primary" /> Simulador de Requisitos NORMAM-01/02
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Configure as características da embarcação e visualize os equipamentos de salvatagem e vistorias exigidas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Tipo de Embarcação</label>
                <select
                  value={simVesselType}
                  onChange={(e) => setSimVesselType(e.target.value)}
                  className="w-full mt-1.5 p-3 rounded-xl border border-slate-200 text-xs font-semibold"
                >
                  <option value="lancha">Lancha / Esporte e Recreio (NORMAM-01)</option>
                  <option value="moto_aquatica">Moto Aquática / Jet Ski (NORMAM-01)</option>
                  <option value="veleiro">Veleiro / Catamarã</option>
                  <option value="comercial">Embarcação Comercial / Turismo (NORMAM-02)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Comprimento Total (metros)</label>
                <input
                  type="number"
                  step="0.1"
                  value={simLength}
                  onChange={(e) => setSimLength(Number(e.target.value))}
                  className="w-full mt-1.5 p-3 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Área de Navegação</label>
                <select
                  value={simArea}
                  onChange={(e) => setSimArea(e.target.value)}
                  className="w-full mt-1.5 p-3 rounded-xl border border-slate-200 text-xs font-semibold"
                >
                  <option value="interior_1">Interior - Área 1 (Águas Abrigadas)</option>
                  <option value="interior_2">Interior - Área 2 (Lagos e Represas Maiores)</option>
                  <option value="mar_aberto_costeira">Mar Aberto - Costeira (até 20 milhas)</option>
                  <option value="mar_aberto_oceanica">Mar Aberto - Oceânica (sem limites)</option>
                </select>
              </div>
            </div>

            {/* Resultado da Simulação */}
            <div className="p-6 bg-slate-50 rounded-2xl space-y-4 border border-slate-100">
              <h4 className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-emerald-500" /> Dotação de Salvatagem & Laudos Obrigatórios
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <p className="font-bold text-navy">🦺 Coletes Salva-Vidas</p>
                  <p className="text-slate-600">
                    {simArea.includes("mar_aberto")
                      ? "Mínimo 8 coletes Classe II (homologados DPC) com apito e fitas refletivas."
                      : "Mínimo 8 coletes Classe III (Navegação Interior) homologados."}
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <p className="font-bold text-navy">⭕ Boia Circular</p>
                  <p className="text-slate-600">
                    {simLength >= 5
                      ? "1 boia circular Classe II com retinida flutuante de 20 metros."
                      : "Dispensada para embarcações com comprimento inferior a 5 metros."}
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <p className="font-bold text-navy">🎆 Pirotécnicos</p>
                  <p className="text-slate-600">
                    {simArea.includes("mar_aberto")
                      ? "2 foguetes com paraquedas + 2 fachos manuais vermelhos (validade 36 meses)."
                      : "Dispensados para navegação em águas abrigadas (Área 1)."}
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <p className="font-bold text-navy">📋 Laudos & Vistorias Navais</p>
                  <p className="text-slate-600">
                    {simLength >= 12
                      ? "Exige Laudo Pericial de Arqueação e Estabilidade assinado por Engenheiro Naval com ART."
                      : "Embarcação Miúda/Média: Declaração de Conformidade pelo fabricante ou laudo simplificado."}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 4: Validação Cruzada Anti-Divergência */}
        <TabsContent value="cross-validator" className="space-y-6">
          <Card className="p-6 md:p-8 border-slate-100 shadow-md rounded-3xl bg-white space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-navy flex items-center gap-2">
                  <FileCheck2 className="h-5 w-5 text-primary" /> Validador Cruzado de Documentos Náuticos
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Detecte divergências entre TIE/TIEM, CNH, Procuração e Notas Fiscais de Motor antes do envio.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => runCrossValidationDemo('divergence')}
                  variant="outline"
                  className="rounded-xl text-xs font-bold border-rose-200 text-rose-600 hover:bg-rose-50"
                >
                  Simular Divergência (CPF/Motor)
                </Button>
                <Button
                  onClick={() => runCrossValidationDemo('match')}
                  className="bg-navy hover:bg-navy/90 text-white rounded-xl text-xs font-bold"
                >
                  Simular Documentos 100% Coerentes
                </Button>
              </div>
            </div>

            {crossValResult && (
              <div className="space-y-4 pt-4 border-t border-slate-100 animate-in fade-in duration-300">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Score de Consistência Cadastral</p>
                    <p className={`text-4xl font-black ${crossValResult.score >= 80 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {crossValResult.score}%
                    </p>
                  </div>
                  <Badge
                    className={`text-[10px] font-black uppercase border-none px-4 py-2 ${
                      crossValResult.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {crossValResult.passed ? 'Apto para Protocolo' : 'Indeferimento Iminente'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {crossValResult.issues.length === 0 ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      <p className="text-xs font-bold text-emerald-800">
                        Nenhuma discrepância encontrada entre os documentos. Todos os números de série, CPFs e dados do proprietário estão alinhados!
                      </p>
                    </div>
                  ) : (
                    crossValResult.issues.map((issue: any) => (
                      <div
                        key={issue.id}
                        className={`p-4 rounded-xl border text-xs space-y-1 ${
                          issue.severity === 'critical' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-navy">{issue.field}</span>
                          <Badge className="bg-white text-navy font-bold text-[8px] uppercase border-slate-200">
                            {issue.sourceDocA} ⇄ {issue.sourceDocB}
                          </Badge>
                        </div>
                        <p className="text-slate-700 font-medium">{issue.description}</p>
                        <p className="text-slate-500 text-[11px]">💡 <strong>Solução:</strong> {issue.recommendation}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
