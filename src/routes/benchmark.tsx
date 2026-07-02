import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Users, Award, Lock } from "lucide-react";

export const Route = createFileRoute("/benchmark")({
  head: () => ({ meta: [{ title: "Benchmark Setorial — NavalDocs Pro" }] }),
  component: BenchmarkPage,
});

function BenchmarkPage() {
  useEffect(() => { console.log("BENCHMARK_READY"); }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["benchmark-anonymous"],
    queryFn: async () => {
      // Métricas agregadas globais — sem expor empresas individuais
      const [{ count: totalCompanies }, { data: allProc }] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("processes").select("id, status, compliance_score, created_at, company_id").limit(5000),
      ]);

      const processes = allProc || [];
      const myCompanyId = (await supabase.from("profiles").select("company_id").maybeSingle()).data?.company_id;

      const myProc = processes.filter((p: any) => p.company_id === myCompanyId);
      const otherProc = processes.filter((p: any) => p.company_id !== myCompanyId);

      const avg = (arr: any[]) => arr.length ? Math.round(arr.reduce((s, p) => s + (p.compliance_score || 0), 0) / arr.length) : 0;
      const completionRate = (arr: any[]) => {
        if (!arr.length) return 0;
        const done = arr.filter(p => ["completed", "Concluído", "concluido"].includes(p.status)).length;
        return Math.round((done / arr.length) * 100);
      };

      // Distribuição de processos por escritório
      const byCompany: Record<string, number> = {};
      processes.forEach((p: any) => { byCompany[p.company_id] = (byCompany[p.company_id] || 0) + 1; });
      const counts = Object.values(byCompany).sort((a, b) => b - a);
      const myRank = counts.findIndex(c => c === (byCompany[myCompanyId || ""] || 0)) + 1;

      return {
        totalCompanies: totalCompanies || 0,
        sampleSize: processes.length,
        mine: { compliance: avg(myProc), completion: completionRate(myProc), volume: myProc.length },
        market: { compliance: avg(otherProc), completion: completionRate(otherProc), volume: Math.round(otherProc.length / Math.max(counts.length - 1, 1)) },
        rank: myRank,
        total: counts.length,
      };
    },
  });

  const Comparison = ({ label, mine, market, suffix = "" }: any) => {
    const diff = mine - market;
    return (
      <Card className="p-6 border-slate-100 shadow-sm rounded-3xl">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">{label}</p>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-[9px] font-black uppercase text-primary mb-1">Você</p>
            <p className="text-3xl font-black text-navy">{mine}{suffix}</p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Mercado</p>
            <p className="text-3xl font-black text-slate-400">{market}{suffix}</p>
          </div>
        </div>
        <Badge className={`border-none text-[9px] font-black uppercase ${
          diff > 0 ? "bg-emerald-100 text-emerald-700" : diff < 0 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
        }`}>
          {diff > 0 ? `+${diff}${suffix} acima da média` : diff < 0 ? `${diff}${suffix} abaixo da média` : "Na média"}
        </Badge>
      </Card>
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-6 md:p-8 pb-20">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 bg-navy rounded-2xl flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-semibold text-navy">Benchmark Setorial</h1>
          </div>
          <p className="text-slate-500 font-medium">Compare-se com o mercado de engenharia naval brasileira — 100% anônimo.</p>
        </div>
        <Badge className="bg-emerald-50 text-emerald-700 border-none text-[9px] font-black uppercase tracking-widest px-4 py-2">
          <Lock className="h-3 w-3 mr-1 inline" /> Dados agregados • Sem identificação
        </Badge>
      </div>

      {isLoading ? (
        <Card className="p-12 text-center text-slate-400">Calculando benchmarks...</Card>
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-6 bg-[#000B18] text-white border-none rounded-3xl">
              <Users className="h-5 w-5 text-primary mb-3" />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Escritórios na amostra</p>
              <p className="text-4xl font-black">{data?.total}</p>
            </Card>
            <Card className="p-6 bg-[#000B18] text-white border-none rounded-3xl">
              <Award className="h-5 w-5 text-primary mb-3" />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Sua posição</p>
              <p className="text-4xl font-black">#{data?.rank}<span className="text-lg text-white/40">/{data?.total}</span></p>
            </Card>
            <Card className="p-6 bg-[#000B18] text-white border-none rounded-3xl">
              <TrendingUp className="h-5 w-5 text-primary mb-3" />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Processos analisados</p>
              <p className="text-4xl font-black">{data?.sampleSize}</p>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Comparison label="Compliance Médio" mine={data?.mine.compliance} market={data?.market.compliance} suffix="%" />
            <Comparison label="Taxa de Conclusão" mine={data?.mine.completion} market={data?.market.completion} suffix="%" />
            <Comparison label="Volume de Processos" mine={data?.mine.volume} market={data?.market.volume} />
          </div>

          <Card className="p-6 bg-amber-50 border-amber-100 rounded-3xl">
            <p className="text-xs font-bold text-amber-800 leading-relaxed">
              <strong>Privacidade:</strong> Nenhuma empresa, cliente ou processo individual é identificado. Apenas médias agregadas do setor são exibidas.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
