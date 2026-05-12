import { User, FileText, CheckCircle2, Zap, Clock } from "lucide-react";

export function ActivityFeed() {
  const activities = [
    { user: "Eng. Ricardo", action: "criou o processo", target: "PR-2024-082", time: "5 min atrás", icon: <FileText className="h-4 w-4" />, color: "blue" },
    { user: "Sistema", action: "validou documento via OCR", target: "CNH - Ricardo A.", time: "12 min atrás", icon: <Zap className="h-4 w-4" />, color: "amber" },
    { user: "Sistema", action: "notificou cliente", target: "WhatsApp - Estaleiro Sul", time: "45 min atrás", icon: <Zap className="h-4 w-4" />, color: "amber" },
    { user: "Dra. Marina", action: "finalizou análise", target: "PR-2024-079", time: "2h atrás", icon: <CheckCircle2 className="h-4 w-4" />, color: "emerald" },
    { user: "Eng. Ricardo", action: "anexou GRU", target: "Petroleiro Phoenix", time: "3h atrás", icon: <FileText className="h-4 w-4" />, color: "blue" },
  ];

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
        <h3 className="font-bold text-navy flex items-center gap-2 uppercase text-xs tracking-widest">
          <Clock className="h-5 w-5 text-primary" /> Centro de Atividades
        </h3>
        <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
      </div>
      
      <div className="divide-y divide-slate-50">
        {activities.map((act, i) => (
          <div key={i} className="p-6 hover:bg-slate-50 transition-colors group cursor-pointer">
            <div className="flex gap-4">
               <div className={`h-10 w-10 rounded-xl bg-${act.color}-50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <div className={`text-${act.color}-600`}>{act.icon}</div>
               </div>
               <div>
                  <p className="text-sm text-slate-600">
                    <span className="font-bold text-navy">{act.user}</span> {act.action} <span className="font-bold text-primary">{act.target}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">{act.time}</p>
               </div>
            </div>
          </div>
        ))}
      </div>
      
      <button className="w-full py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-navy hover:bg-slate-50 transition-all">Ver Histórico Completo</button>
    </div>
  );
}
