import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Ship, 
  Calendar, 
  Shield, 
  UserCheck, 
  Hash, 
  Share2, 
  Copy, 
  Star, 
  Edit3,
  ExternalLink
} from "lucide-react";

export function Workspace3Left({ process, timeInProgress }: any) {
  if (!process) return null;

  const metadata = [
    { label: "Número", value: process.process_number || `#${process.id.slice(0,8)}`, icon: Hash },
    { label: "Tipo", value: process.process_type?.name || "Registro Inicial", icon: Shield },
    { label: "Prioridade", value: "ALTA", icon: Zap, color: "text-amber-500" },
    { label: "Responsável", value: "Eng. Ricardo Silva", icon: UserCheck },
    { label: "Data Abertura", value: new Date(process.created_at).toLocaleDateString(), icon: Calendar },
  ];

  function Zap({ className }: { className?: string }) {
    return <Star className={cn("h-3.5 w-3.5 fill-amber-500", className)} />;
  }
  
  const cn = (...args: any[]) => args.filter(Boolean).join(' ');

  return (
    <div className="space-y-6 animate-in slide-in-from-left-4 duration-700">
      {/* Resumo do Processo */}
      <Card className="p-6 border-slate-200 overflow-hidden relative group">
        <div className="flex items-center gap-4 mb-8">
           <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
              <Ship className="h-6 w-6 text-white" />
           </div>
           <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none mb-1 group-hover:text-primary transition-colors">
                 {process.vessel?.name || "Embarcação"}
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{process.customer?.name}</p>
           </div>
        </div>

        <div className="space-y-4">
           {metadata.map((item) => (
             <div key={item.label} className="flex items-center justify-between group/item">
                <div className="flex items-center gap-2">
                   <item.icon className={cn("h-3.5 w-3.5 text-slate-400", item.color)} />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                </div>
                <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight text-right">{item.value}</span>
             </div>
           ))}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-2">
           <Button variant="outline" size="sm" className="h-9 text-[9px] font-black uppercase tracking-widest border-slate-200 rounded-xl hover:bg-slate-50 gap-2">
              <Edit3 className="h-3.5 w-3.5" />
              Editar
           </Button>
           <Button variant="outline" size="sm" className="h-9 text-[9px] font-black uppercase tracking-widest border-slate-200 rounded-xl hover:bg-slate-50 gap-2">
              <Share2 className="h-3.5 w-3.5" />
              Compartilhar
           </Button>
           <Button variant="outline" size="sm" className="h-9 text-[9px] font-black uppercase tracking-widest border-slate-200 rounded-xl hover:bg-slate-50 gap-2">
              <Copy className="h-3.5 w-3.5" />
              Duplicar
           </Button>
           <Button variant="outline" size="sm" className="h-9 text-[9px] font-black uppercase tracking-widest border-slate-200 rounded-xl hover:bg-slate-50 gap-2 text-amber-500 border-amber-100 hover:bg-amber-50">
              <Star className="h-3.5 w-3.5" />
              Favoritar
           </Button>
        </div>
      </Card>

      {/* Cliente Info Card */}
      <Card className="p-5 border-slate-200 bg-slate-50/50">
         <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
            Dados do Cliente
            <ExternalLink className="h-3 w-3" />
         </h3>
         <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center">
               <User className="h-5 w-5 text-slate-400" />
            </div>
            <div>
               <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{process.customer?.name}</p>
               <p className="text-[9px] font-bold text-slate-400 mt-0.5">{process.customer?.cpf_cnpj || "000.000.000-00"}</p>
            </div>
         </div>
      </Card>
    </div>
  );
}
