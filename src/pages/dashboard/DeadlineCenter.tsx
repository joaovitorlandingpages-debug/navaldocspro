import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Clock, AlertTriangle, AlertCircle, 
  CheckCircle2, Search, Filter,
  ChevronRight, ArrowRight, Calendar,
  Bell, History, ShieldCheck, Ship,
  LayoutGrid, List, RotateCcw, Zap,
  FileText
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, differenceInDays, parseISO, isPast, isBefore, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "@tanstack/react-router";

export default function DeadlineCenter() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const { data: documents, isLoading } = useQuery({
    queryKey: ["deadline-documents", profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          vessels(name),
          customers(name)
        `)
        .eq("company_id", profile?.company_id)
        .not("expiry_date", "is", null)
        .order("expiry_date", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id
  });

  const { data: processes } = useQuery({
    queryKey: ["deadline-processes", profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processes")
        .select("*, vessels(name), customers(name)")
        .eq("company_id", profile?.company_id)
        .neq("status", "completed")
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id
  });

  const expiredDocs = documents?.filter((doc: any) => isPast(parseISO(doc.expiry_date))) || [];
  const expiringSoonDocs = documents?.filter((doc: any) => {
    const expiry = parseISO(doc.expiry_date);
    return !isPast(expiry) && isBefore(expiry, addDays(new Date(), 30));
  }) || [];

  const delayedProcesses = processes?.filter((proc: any) => {
    // Simulando atraso se processo tem mais de 15 dias sem conclusão
    return differenceInDays(new Date(), parseISO(proc.created_at)) > 15;
  }) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary" /> Prazos e Vencimentos
          </h1>
          <p className="text-muted-foreground font-medium">Monitoramento proativo de validades e marcos operacionais.</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="flex-grow sm:flex-initial gap-2 border-slate-200 font-black text-[10px] uppercase tracking-widest">
            <RotateCcw className="h-4 w-4" /> Atualizar
          </Button>
          <Button className="flex-grow sm:flex-initial bg-primary text-white gap-2 shadow-lg shadow-primary/20 font-black text-[10px] uppercase tracking-widest px-6">
            <Calendar className="h-4 w-4" /> Exportar Agenda
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-red-50 border-red-100 shadow-sm relative overflow-hidden group">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Vencidos</p>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
            <h3 className="text-3xl font-semibold text-red-900">{expiredDocs.length}</h3>
            <p className="text-[10px] text-red-700 font-bold mt-1 uppercase">Ação Imediata</p>
          </CardContent>
        </Card>
        
        <Card className="bg-amber-50 border-amber-100 shadow-sm relative overflow-hidden group">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Vencendo (30d)</p>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <h3 className="text-3xl font-semibold text-amber-900">{expiringSoonDocs.length}</h3>
            <p className="text-[10px] text-amber-700 font-bold mt-1 uppercase">Planejar Renovação</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-100 shadow-sm relative overflow-hidden group">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Processos Lentos</p>
              <History className="h-4 w-4 text-blue-500" />
            </div>
            <h3 className="text-3xl font-semibold text-blue-900">{delayedProcesses.length}</h3>
            <p className="text-[10px] text-blue-700 font-bold mt-1 uppercase">Verificar Gargalos</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-100 shadow-sm relative overflow-hidden group">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Eficiência</p>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <h3 className="text-3xl font-semibold text-navy">92%</h3>
            <p className="text-[10px] text-emerald-600 font-bold mt-1 uppercase">SLA Cumprido</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl h-auto">
          <TabsTrigger value="all" className="rounded-lg py-2.5 px-6 data-[state=active]:bg-navy data-[state=active]:text-white font-bold text-xs uppercase tracking-widest gap-2">
            Todos os Alertas
          </TabsTrigger>
          <TabsTrigger value="expired" className="rounded-lg py-2.5 px-6 data-[state=active]:bg-red-600 data-[state=active]:text-white font-bold text-xs uppercase tracking-widest gap-2">
            Vencidos
          </TabsTrigger>
          <TabsTrigger value="soon" className="rounded-lg py-2.5 px-6 data-[state=active]:bg-amber-500 data-[state=active]:text-white font-bold text-xs uppercase tracking-widest gap-2">
            Vencendo
          </TabsTrigger>
          <TabsTrigger value="processes" className="rounded-lg py-2.5 px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold text-xs uppercase tracking-widest gap-2">
            Processos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar alertas por embarcação ou documento..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-white border-slate-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            {isLoading ? (
              <div className="py-20 text-center uppercase font-black text-xs text-slate-400 tracking-widest animate-pulse">Analizando prazos operacionais...</div>
            ) : (
              <>
                {expiredDocs.map((doc: any) => (
                  <DeadlineCard key={doc.id} item={doc} type="expired" onAction={() => navigate({ to: `/processes/${doc.process_id}` })} />
                ))}
                {expiringSoonDocs.map((doc: any) => (
                  <DeadlineCard key={doc.id} item={doc} type="warning" onAction={() => navigate({ to: `/processes/${doc.process_id}` })} />
                ))}
                {delayedProcesses.map((proc: any) => (
                  <DeadlineCard key={proc.id} item={proc} type="delayed" onAction={() => navigate({ to: `/processes/${proc.id}` })} />
                ))}
                
                {expiredDocs.length === 0 && expiringSoonDocs.length === 0 && delayedProcesses.length === 0 && (
                  <div className="py-20 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
                    <CheckCircle2 className="h-12 w-12 text-emerald-100 mx-auto mb-4" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhuma pendência de prazo detectada</p>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="expired" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {expiredDocs.map((doc: any) => (
              <DeadlineCard key={doc.id} item={doc} type="expired" onAction={() => navigate({ to: `/processes/${doc.process_id}` })} />
            ))}
            {expiredDocs.length === 0 && (
              <div className="py-20 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
                <CheckCircle2 className="h-12 w-12 text-emerald-100 mx-auto mb-4" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhum documento vencido</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="soon" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {expiringSoonDocs.map((doc: any) => (
              <DeadlineCard key={doc.id} item={doc} type="warning" onAction={() => navigate({ to: `/processes/${doc.process_id}` })} />
            ))}
            {expiringSoonDocs.length === 0 && (
              <div className="py-20 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
                <CheckCircle2 className="h-12 w-12 text-emerald-100 mx-auto mb-4" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhum vencimento próximo</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="processes" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {delayedProcesses.map((proc: any) => (
              <DeadlineCard key={proc.id} item={proc} type="delayed" onAction={() => navigate({ to: `/processes/${proc.id}` })} />
            ))}
            {delayedProcesses.length === 0 && (
              <div className="py-20 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
                <CheckCircle2 className="h-12 w-12 text-emerald-100 mx-auto mb-4" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhum processo atrasado</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DeadlineCard({ item, type, onAction }: { item: any, type: 'expired' | 'warning' | 'delayed', onAction?: () => void }) {
  const isDoc = !!item.document_type;
  const days = isDoc ? differenceInDays(parseISO(item.expiry_date), new Date()) : differenceInDays(new Date(), parseISO(item.created_at));

  return (
    <Card className={`border-slate-100 hover:shadow-md transition-all group overflow-hidden border-l-4 ${
      type === 'expired' ? 'border-l-red-500 bg-red-50/10' : 
      type === 'warning' ? 'border-l-amber-500 bg-amber-50/10' : 
      'border-l-blue-500 bg-blue-50/10'
    }`}>
      <CardContent className="p-4 md:p-6 flex flex-col md:flex-row items-center gap-6">
        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
          type === 'expired' ? 'bg-red-100 text-red-600' : 
          type === 'warning' ? 'bg-amber-100 text-amber-600' : 
          'bg-blue-100 text-blue-600'
        }`}>
          {type === 'expired' ? <AlertCircle className="h-6 w-6" /> : 
           type === 'warning' ? <Clock className="h-6 w-6" /> : 
           <History className="h-6 w-6" />}
        </div>

        <div className="flex-grow text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
            <h4 className="font-semibold text-navy">
              {isDoc ? item.document_type : `Processo #${item.id.substring(0, 8).toUpperCase()}`}
            </h4>
            <Badge variant="outline" className={`text-[8px] font-black uppercase ${
              type === 'expired' ? 'border-red-200 text-red-600' : 
              type === 'warning' ? 'border-amber-200 text-amber-600' : 
              'border-blue-200 text-blue-600'
            }`}>
              {type === 'expired' ? 'Vencido' : type === 'warning' ? 'Expira em breve' : 'Processo Retido'}
            </Badge>
          </div>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
              <Ship className="h-3 w-3" /> {item.vessels?.name || 'Embarcação n/d'}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {isDoc ? `Vencimento: ${format(parseISO(item.expiry_date), "dd/MM/yyyy")}` : `Criado em: ${format(parseISO(item.created_at), "dd/MM/yyyy")}`}
            </span>
          </div>
        </div>

        <div className="text-center md:text-right min-w-[120px]">
          <p className={`text-xl font-black ${
            type === 'expired' ? 'text-red-600' : 
            type === 'warning' ? 'text-amber-600' : 
            'text-blue-600'
          }`}>
            {type === 'expired' ? `${Math.abs(days)}d atrasado` : 
             type === 'warning' ? `${days} dias` : 
             `${days} dias aberto`}
          </p>
          <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 mt-1" onClick={onAction}>
            Resolver Agora <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
