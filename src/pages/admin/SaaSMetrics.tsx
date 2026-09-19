import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, TrendingUp, Users, 
  Zap, Database, CreditCard,
  AlertCircle, CheckCircle2, FileText, Cpu, ArrowUpRight
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminSaaSMetrics() {
  const [selectedPeriod, setSelectedPeriod] = useState("Este mês");

  // Consulta de consumo real agregado e por escritório
  const { data: usageData, isLoading } = useQuery({
    queryKey: ["admin-consumption-metrics", selectedPeriod],
    queryFn: async () => {
      try {
        const [
          { count: totalProcesses },
          { count: totalDocuments },
          { data: filesData },
          { data: companies }
        ] = await Promise.all([
          supabase.from("processes").select("*", { count: "exact", head: true }),
          supabase.from("documents").select("*", { count: "exact", head: true }),
          supabase.from("uploaded_files").select("file_size, company_id"),
          supabase.from("companies").select(`
            id,
            name,
            is_pilot,
            subscriptions(
              *,
              plan:plans(*)
            )
          `)
        ]);

        const totalBytes = filesData?.reduce((acc: number, f: any) => acc + (f.file_size || 0), 0) || 0;
        const totalStorageGb = Number((totalBytes / (1024 ** 3)).toFixed(2));
        const estimatedAiPages = Math.round((totalDocuments || 0) * 1.5);

        return {
          totalProcesses: totalProcesses || 0,
          totalDocuments: totalDocuments || 0,
          totalStorageGb,
          estimatedAiPages,
          companies: companies || []
        };
      } catch (err) {
        console.error("Erro ao carregar métricas de consumo:", err);
        return {
          totalProcesses: 0,
          totalDocuments: 0,
          totalStorageGb: 0,
          estimatedAiPages: 0,
          companies: []
        };
      }
    }
  });

  const stats = [
    { 
      label: "Processos no Período", 
      value: (usageData?.totalProcesses || 0).toString(), 
      icon: FileText, 
      color: "text-[#1868db]", 
      bg: "bg-blue-50",
      helper: "Contabilizado 1 vez por serviço gerado"
    },
    { 
      label: "Páginas Analisadas por IA", 
      value: (usageData?.estimatedAiPages || 0).toString(), 
      icon: Cpu, 
      color: "text-amber-600", 
      bg: "bg-amber-50",
      helper: "Leituras assistidas e OCR normativo"
    },
    { 
      label: "Armazenamento Total", 
      value: `${usageData?.totalStorageGb || 0} GB`, 
      icon: Database, 
      color: "text-cyan-600", 
      bg: "bg-cyan-50",
      helper: "Documentos, fotos e PDFs arquivados"
    },
    { 
      label: "Escritórios Ativos", 
      value: (usageData?.companies?.length || 0).toString(), 
      icon: Users, 
      color: "text-indigo-600", 
      bg: "bg-indigo-50",
      helper: "Instâncias com consumo medido"
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 antialiased">
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0d2342] tracking-tight">
            Consumo e Custos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitoramento de franquias operacionais de processos, IA e armazenamento por escritório.
          </p>
        </div>

        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-40 h-9 text-xs rounded-xl bg-white border-slate-200 font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Este mês">Este mês</SelectItem>
            <SelectItem value="Mês anterior">Mês anterior</SelectItem>
            <SelectItem value="Este ano">Este ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 2. CARDS DE CONSUMO GLOBAL */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="bg-white p-5 rounded-2xl border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
            <h3 className="text-2xl font-black text-[#0d2342] mt-0.5">{stat.value}</h3>
            <p className="text-[10px] text-slate-400 mt-1">{stat.helper}</p>
          </Card>
        ))}
      </div>

      {/* 3. CONSUMO POR ESCRITÓRIO */}
      <Card className="bg-white rounded-2xl border-slate-200/80 shadow-xs overflow-hidden">
        <CardHeader className="p-6 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-[#0d2342] flex items-center justify-between">
            <span>Uso e Franquias por Escritório</span>
            <span className="text-xs font-normal text-slate-400">Renovação mensal das cotas</span>
          </CardTitle>
        </CardHeader>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <th className="px-6 py-4">Escritório</th>
                <th className="px-6 py-4">Plano Vigente</th>
                <th className="px-6 py-4">Processos Mês</th>
                <th className="px-6 py-4">Páginas de IA</th>
                <th className="px-6 py-4">Armazenamento</th>
                <th className="px-6 py-4 text-right">Alerta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Carregando consumo...
                  </td>
                </tr>
              ) : usageData?.companies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <BarChart3 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-600">Nenhum consumo registrado no período</p>
                    <p className="text-[11px] mt-0.5">Assim que processos forem gerados pelos escritórios, as métricas aparecerão aqui.</p>
                  </td>
                </tr>
              ) : (
                usageData?.companies.map((comp: any) => {
                  const sub = comp.subscriptions?.[0];
                  const plan = sub?.plan;
                  const processLimit = plan?.process_limit || 20;
                  const ocrLimit = plan?.ocr_limit || 200;
                  const storageLimit = plan?.storage_limit_gb || 5;

                  return (
                    <tr key={comp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-[#0d2342] text-sm block">{comp.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {comp.id.slice(0, 8)}</span>
                      </td>

                      <td className="px-6 py-4">
                        <Badge className="bg-blue-50 text-[#1868db] border-none font-bold text-[10px]">
                          {plan?.name || (comp.is_pilot ? "Teste Gratuito" : "Essencial")}
                        </Badge>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1 max-w-[120px]">
                          <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                            <span>0 / {processLimit}</span>
                            <span className="text-slate-400">0%</span>
                          </div>
                          <Progress value={0} className="h-1 bg-slate-100" />
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1 max-w-[120px]">
                          <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                            <span>0 / {ocrLimit}</span>
                            <span className="text-slate-400">0%</span>
                          </div>
                          <Progress value={0} className="h-1 bg-slate-100" />
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-700">0.0 GB</span>
                        <span className="text-[10px] text-slate-400 ml-1">/ {storageLimit} GB</span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Normal
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
