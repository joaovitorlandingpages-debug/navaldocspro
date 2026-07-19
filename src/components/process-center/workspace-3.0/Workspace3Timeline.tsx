import { Card } from "@/components/ui/card";
import { 
  PlusCircle, 
  FileText, 
  Signature, 
  Zap, 
  MessageSquare, 
  History, 
  ArrowUpRight,
  Clock,
  User,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Workspace3Timeline() {
  const events = [
    { id: 1, type: 'create', title: 'Processo Criado', user: 'Ricardo Silva', date: 'Hoje', time: '14:20', icon: PlusCircle, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 2, type: 'document', title: 'Documento Enviado', desc: 'RG_FRENTE.pdf', user: 'Ricardo Silva', date: 'Hoje', time: '14:35', icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { id: 3, type: 'ocr', title: 'OCR Concluído', desc: 'Dados técnicos extraídos', user: 'Enterprise IA', date: 'Hoje', time: '14:36', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 4, type: 'signature', title: 'Assinatura Enviada', desc: 'Requerimento DPC', user: 'Ricardo Silva', date: 'Hoje', time: '15:10', icon: Signature, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  return (
    <Card className="p-6 border-slate-200">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center justify-between">
        Timeline do Processo
        <History className="h-3.5 w-3.5" />
      </h3>
      
      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-[19px] before:h-full before:w-px before:bg-slate-100">
        {events.map((event) => (
          <div key={event.id} className="relative pl-10 group">
            <div className={cn(
              "absolute left-0 h-10 w-10 rounded-xl border flex items-center justify-center bg-white z-10 transition-transform group-hover:scale-110",
              event.bg,
              "border-white shadow-sm"
            )}>
              <event.icon className={cn("h-5 w-5", event.color)} />
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 p-4 bg-slate-50/50 rounded-2xl border border-transparent hover:border-slate-200 hover:bg-white hover:shadow-lg transition-all">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{event.title}</h4>
                  <span className="text-[9px] font-bold text-slate-400">•</span>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{event.user}</span>
                </div>
                {event.desc && <p className="text-[10px] text-slate-500 font-medium">{event.desc}</p>}
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <Clock className="h-3 w-3" />
                    {event.time}
                  </div>
                  <div className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">{event.date}</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
