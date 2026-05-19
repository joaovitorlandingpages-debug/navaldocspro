import { Bell, X, Info, AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function NotificationCenter({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-navy/20 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
           <div className="flex items-center gap-3">
              <div className="relative">
                 <Bell className="h-6 w-6 text-navy" />
                 <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white" />
              </div>
              <h2 className="text-xl font-black text-navy uppercase tracking-tighter">Notificações</h2>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X className="h-6 w-6 text-slate-400" />
           </button>
        </div>

        <div className="flex-grow overflow-y-auto">
           {loading ? (
             <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-400">
               <Loader2 className="h-8 w-8 animate-spin" />
               <p className="text-xs font-bold uppercase tracking-widest">Carregando...</p>
             </div>
           ) : notifications.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 text-slate-400 px-10 text-center">
               <Bell className="h-12 w-12 mb-4 opacity-10" />
               <p className="text-sm font-bold text-navy uppercase mb-1">Tudo limpo!</p>
               <p className="text-xs">Você não tem novas notificações no momento.</p>
             </div>
           ) : (
             <div className="divide-y divide-slate-100">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    onClick={() => markAsRead(n.id)}
                    className={`p-6 hover:bg-slate-50 transition-colors cursor-pointer group ${!n.is_read ? 'bg-primary/5' : ''}`}
                  >
                     <div className="flex gap-4">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${
                          n.type === 'success' ? 'bg-green-100 text-green-600' : 
                          n.type === 'error' || n.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                          n.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                           {n.type === 'success' && <CheckCircle2 className="h-6 w-6" />}
                           {(n.type === 'error' || n.priority === 'urgent') && <AlertTriangle className="h-6 w-6" />}
                           {n.type === 'warning' && <Clock className="h-6 w-6" />}
                           {n.type === 'info' && <Info className="h-6 w-6" />}
                        </div>
                        <div className="flex-grow">
                           <div className="flex justify-between items-start">
                              <h3 className={`font-bold text-sm ${!n.is_read ? 'text-navy' : 'text-slate-600'}`}>{n.title}</h3>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                              </span>
                           </div>
                           <p className="text-xs text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                           <div className="flex gap-3 mt-4">
                              <button className="text-[10px] font-black uppercase text-primary tracking-widest hover:underline">Ver Detalhes</button>
                              <button className="text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-navy">Arquivar</button>
                           </div>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
           )}
        </div>

        <div className="p-6 border-t bg-slate-50">
           <button 
             onClick={markAllAsRead}
             className="w-full bg-navy text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 transition-all"
           >
             Marcar todas como lidas
           </button>
        </div>
      </div>
    </div>
  );
}
