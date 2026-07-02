import { Bell, X, Info, AlertTriangle, CheckCircle2, Clock, Loader2, Zap, Trash2, Check, ArrowRight } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function NotificationCenter({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!isOpen) {
    return null;
  }



  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative w-full md:max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 md:rounded-l-[3rem] overflow-hidden">
        <div className="p-6 md:p-8 border-b flex justify-between items-center bg-slate-50 relative overflow-hidden">

           <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -mr-10 -mt-10"></div>
           
           <div className="flex items-center gap-4 relative z-10">
              <div className="h-12 w-12 bg-white rounded-2xl shadow-xl flex items-center justify-center">
                 <Bell className="h-6 w-6 text-primary animate-pulse" />
                 {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-black">
                       {unreadCount}
                    </span>
                 )}
              </div>
              <div>
                 <h2 className="text-xl font-black text-navy uppercase tracking-tighter">Central IA</h2>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alertas e Automações</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors relative z-10">
              <X className="h-6 w-6 text-slate-400" />
           </button>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar">
           {loading ? (
             <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
               <Loader2 className="h-10 w-10 animate-spin text-primary opacity-30" />
               <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando com a nuvem...</p>
             </div>
           ) : notifications.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-400 px-10 text-center space-y-4">
               <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center">
                  <Check className="h-10 w-10 opacity-10" />
               </div>
               <div>
                  <p className="text-lg font-black text-navy uppercase mb-1">Sem pendências</p>
                  <p className="text-sm font-medium">Sua operação está 100% em dia. Nossa IA não detectou novos alertas.</p>
               </div>
             </div>
           ) : (
             <div className="divide-y divide-slate-100">
                 {notifications.map((n) => (
                   <div 
                     key={n.id} 
                     onClick={() => markAsRead(n.id)}
                     className={`p-6 md:p-8 hover:bg-slate-50/80 transition-all cursor-pointer group relative border-l-4 ${!n.is_read ? 'bg-primary/[0.02] border-l-primary' : 'border-l-transparent'}`}
                   >

                     <div className="flex gap-5">
                        <div className={`h-14 w-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all shadow-sm group-hover:scale-110 group-hover:shadow-lg ${
                          n.type === 'success' ? 'bg-green-50 text-green-600' : 
                          n.type === 'error' || n.priority === 'urgent' ? 'bg-red-50 text-red-600' :
                          n.type === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                           {n.type === 'success' && <CheckCircle2 className="h-7 w-7" />}
                           {(n.type === 'error' || n.priority === 'urgent') && <AlertTriangle className="h-7 w-7" />}
                           {n.type === 'warning' && <Clock className="h-7 w-7" />}
                           {n.type === 'info' && <Zap className="h-7 w-7" />}
                        </div>
                        <div className="flex-grow">
                           <div className="flex justify-between items-start mb-1">
                              <h3 className={`font-black text-sm uppercase tracking-tight ${!n.is_read ? 'text-navy' : 'text-slate-500'}`}>{n.title}</h3>
                              <span className="text-[9px] text-slate-300 font-bold uppercase shrink-0 ml-2">
                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                              </span>
                           </div>
                           <p className="text-xs text-slate-500 leading-relaxed font-medium">{n.message}</p>
                           
                           {!n.is_read && (
                              <div className="mt-4 flex items-center gap-4 animate-in fade-in slide-in-from-left-2">
                                 <button className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5 hover:gap-2 transition-all">
                                    Resolver Agora <ArrowRight className="h-3 w-3" />
                                 </button>
                                 <div className="h-1 w-1 bg-slate-200 rounded-full" />
                                 <button className="text-[10px] font-black uppercase text-slate-300 hover:text-navy transition-all">Ignorar</button>
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
                ))}
             </div>
           )}
        </div>

        <div className="p-6 md:p-8 border-t bg-slate-50">
           <Button 
             onClick={markAllAsRead}
             disabled={unreadCount === 0}
             className="w-full bg-navy text-white hover:bg-slate-900 h-12 md:h-14 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl"
           >

             Limpar Todas as Notificações
           </Button>
        </div>
      </div>
    </div>
  );
}
