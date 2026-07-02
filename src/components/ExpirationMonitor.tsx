import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Clock, AlertTriangle, CheckCircle2, 
  Calendar, Ship, User, FileText,
  ChevronRight, ArrowRight
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Link } from "@tanstack/react-router";

export function ExpirationMonitor() {
  const { data: expiringDocs, isLoading } = useQuery({
    queryKey: ["expiring-documents"],
    queryFn: async () => {
      const today = new Date().toISOString();
      const in30Days = new Date();
      in30Days.setDate(in30Days.getDate() + 30);
      
      // Fetch from both generated_documents and documents (certificates)
      const { data: generated, error: genError } = await supabase
        .from("generated_documents")
        .select("id, name, expiry_date, vessels(name), customers(name)")
        .lte("expiry_date", in30Days.toISOString())
        .gte("expiry_date", today)
        .order("expiry_date", { ascending: true });

      const { data: certs, error: certError } = await supabase
        .from("documents")
        .select("id, document_type, expiry_date, vessels(name), customers(name)")
        .lte("expiry_date", in30Days.toISOString())
        .gte("expiry_date", today)
        .order("expiry_date", { ascending: true });

      if (genError) throw genError;
      if (certError) throw certError;

      const combined = [
        ...(generated || []).map((d: any) => ({ ...d, type: 'generated' })),
        ...(certs || []).map((d: any) => ({ ...d, name: d.document_type, type: 'certificate' }))
      ];

      return combined.sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
    }
  });

  if (isLoading) return <div className="p-8 text-center animate-pulse">Carregando monitor...</div>;

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h3 className="text-lg font-black text-navy uppercase tracking-tight flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" /> Controle de Vencimentos
           </h3>
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Próximos 30 dias</p>
        </div>
        <Link to="/documents">
          <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-primary gap-1">
            Ver Todos <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {expiringDocs && expiringDocs.length > 0 ? (
          expiringDocs.map((doc: any) => {
            const daysLeft = differenceInDays(new Date(doc.expiry_date), new Date());
            return (
              <div key={doc.id} className="p-4 rounded-2xl border border-slate-50 bg-slate-50/30 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                    daysLeft < 7 ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-500"
                  }`}>
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-navy uppercase truncate max-w-[180px]">{doc.name}</p>
                    <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">
                      {doc.vessels?.name} • Expira em {daysLeft} dias
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="text-right">
                      <p className="text-[10px] font-black text-navy">{format(new Date(doc.expiry_date), "dd/MM")}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Vencimento</p>
                   </div>
                   <button className="p-2 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-primary transition-all">
                      <ArrowRight className="h-4 w-4" />
                   </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 opacity-30">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest">Nenhum vencimento próximo</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-navy text-white rounded-2xl flex items-center justify-between group cursor-pointer hover:opacity-95 transition-all">
         <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest">Sincronizar Agenda</p>
               <p className="text-[9px] opacity-60 font-medium">Exportar para Google/Outlook</p>
            </div>
         </div>
         <ChevronRight className="h-4 w-4 opacity-40 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
}
