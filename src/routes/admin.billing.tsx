import { createFileRoute } from "@tanstack/react-router";
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Search, 
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Zap
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/billing")({
  component: AdminOCRBillingPage,
});

function AdminOCRBillingPage() {
  const { data: usage, isLoading } = useQuery({
    queryKey: ["admin-ocr-usage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ocr_usage")
        .select(`
          *,
          companies (
            name,
            plan_type
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const stats = [
    { label: "Custo Estimado Total", value: "R$ 1.250,40", icon: <DollarSign className="text-green-600" />, trend: "+12%" },
    { label: "Leituras Concluídas", value: usage?.reduce((acc, curr) => acc + (curr.successful_jobs || 0), 0) || "0", icon: <Zap className="text-primary" />, trend: "+18%" },
    { label: "Taxa de Erro Global", value: "0.8%", icon: <AlertTriangle className="text-red-600" />, trend: "-2%" },
    { label: "Empresas Ativas", value: new Set(usage?.map(u => u.company_id)).size || "0", icon: <Users className="text-blue-600" />, trend: "+5%" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h1 className="text-3xl font-black text-navy tracking-tight uppercase">Dashboard Financeiro & OCR</h1>
        <p className="text-slate-500 font-medium">Controle master de custos, consumos e performance da IA.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} className="p-6 border-none shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-slate-50 rounded-xl">
                {stat.icon}
              </div>
              <Badge variant="outline" className="text-[10px] font-bold">
                {stat.trend} {stat.trend.startsWith('+') ? <ArrowUpRight className="h-3 w-3 text-green-500 inline" /> : <ArrowDownRight className="h-3 w-3 text-red-500 inline" />}
              </Badge>
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-2xl font-black text-navy mt-1">{stat.value}</h3>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-navy uppercase text-sm tracking-tight">Consumo por Empresa</h3>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                placeholder="Filtrar empresa..." 
                className="pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs focus:ring-1 focus:ring-primary/20 outline-none w-48"
              />
            </div>
            <Button variant="outline" size="sm" className="rounded-xl h-9 text-[10px] font-black uppercase gap-2">
              <Filter className="h-3.5 w-3.5" /> Mês Atual
            </Button>
          </div>
        </div>
        
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow className="border-none">
              <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest h-12">Empresa</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest h-12">Plano</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest h-12">Período</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest h-12">Total Jobs</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest h-12">Sucesso</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest h-12">Falhas</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest h-12 text-right">Custo Est.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usage?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-400 font-medium italic text-sm">
                  Nenhum dado de consumo registrado.
                </TableCell>
              </TableRow>
            )}
            {usage?.map((u) => (
              <TableRow key={u.id} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                <TableCell className="font-bold text-navy text-xs">{(u as any).companies?.name || "N/A"}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-[9px] font-black uppercase">
                    {(u as any).companies?.plan_type || "N/A"}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-500 text-xs font-medium">{u.month}/{u.year}</TableCell>
                <TableCell className="font-bold text-xs">{u.total_jobs}</TableCell>
                <TableCell className="text-green-600 font-bold text-xs">{u.successful_jobs}</TableCell>
                <TableCell className="text-red-600 font-bold text-xs">{u.failed_jobs}</TableCell>
                <TableCell className="text-right font-black text-navy text-xs">R$ {u.estimated_cost?.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
