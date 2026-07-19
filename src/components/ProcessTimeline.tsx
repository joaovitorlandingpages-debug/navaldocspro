import { Clock, User, Edit3, CheckCircle2, FileText, Anchor, ShieldCheck, AlertCircle, Zap, Cpu, FilePlus, Sparkles, Filter, Search, History as HistoryIcon } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface TimelineEvent {
  id: string;
  type: 'creation' | 'update' | 'signature' | 'protocol' | 'completion' | 'validation_passed' | 'error_detected' | 'inconsistency_found' | 'ocr_processed' | 'document_generated' | 'auto_fill' | 'audit_log';
  user: string;
  description: string;
  date: string;
  category?: string;
  metadata?: any;
}


export function ProcessTimeline({ events }: { events: TimelineEvent[] }) {
  const [filter, setFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchesText = e.description.toLowerCase().includes(filter.toLowerCase()) || 
                          e.user.toLowerCase().includes(filter.toLowerCase());
      const matchesType = typeFilter === "all" || e.type === typeFilter;
      return matchesText && matchesType;
    });
  }, [events, filter, typeFilter]);

  const groupedEvents = useMemo(() => {
    const groups: { date: Date; events: TimelineEvent[] }[] = [];
    filteredEvents.forEach(event => {
      const eventDate = new Date(event.date);
      const existingGroup = groups.find(g => isSameDay(g.date, eventDate));
      if (existingGroup) {
        existingGroup.events.push(event);
      } else {
        groups.push({ date: eventDate, events: [event] });
      }
    });
    return groups.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [filteredEvents]);

  return (
    <div className="space-y-8">
      {/* Timeline Controls */}
      <div className="flex flex-col md:flex-row gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Filtrar eventos..." 
            className="pl-10 h-9 text-xs font-bold uppercase tracking-widest bg-white"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['all', 'creation', 'ocr_processed', 'signature', 'audit_log'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all",
                typeFilter === t 
                  ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-200" 
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              )}
            >
              {t === 'all' ? 'Tudo' : t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-px before:bg-slate-200">
        {groupedEvents.length === 0 && (
          <div className="p-20 text-center border-2 border-dashed border-slate-100 rounded-[3rem]">
            <History className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <p className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">Nenhum registro operacional encontrado</p>
          </div>
        )}

        {groupedEvents.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-8">
            <div className="relative flex justify-center z-10">
              <span className="bg-slate-100 text-slate-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white shadow-sm">
                {format(group.date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>

            {group.events.map((event) => (
              <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                {/* Icon */}
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-all group-hover:scale-110",
                  event.type === 'error_detected' ? "bg-rose-50 text-rose-500 border-rose-100" :
                  event.type === 'validation_passed' ? "bg-emerald-50 text-emerald-500 border-emerald-100" :
                  event.type === 'ocr_processed' ? "bg-blue-50 text-blue-500 border-blue-100" :
                  "bg-slate-50 text-slate-400 border-slate-100"
                )}>
                  {event.type === 'creation' && <Anchor className="w-5 h-5" />}
                  {event.type === 'update' && <Edit3 className="w-5 h-5" />}
                  {event.type === 'signature' && <FileText className="w-5 h-5" />}
                  {event.type === 'protocol' && <Clock className="w-5 h-5" />}
                  {event.type === 'completion' && <CheckCircle2 className="w-5 h-5" />}
                  {event.type === 'validation_passed' && <ShieldCheck className="w-5 h-5" />}
                  {event.type === 'error_detected' && <AlertCircle className="w-5 h-5" />}
                  {event.type === 'inconsistency_found' && <Zap className="w-5 h-5" />}
                  {event.type === 'ocr_processed' && <Cpu className="w-5 h-5" />}
                  {event.type === 'document_generated' && <FilePlus className="w-5 h-5" />}
                  {event.type === 'auto_fill' && <Sparkles className="w-5 h-5" />}
                  {event.type === 'audit_log' && <ShieldCheck className="w-5 h-5" />}
                </div>

                {/* Content */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all group-hover:shadow-xl group-hover:border-primary/20 relative overflow-hidden">
                  <div className="flex items-center justify-between space-x-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[10px] text-slate-900 uppercase tracking-widest">{event.user}</span>
                    </div>
                    <time className="font-bold text-[10px] text-slate-400 uppercase">
                      {format(new Date(event.date), "HH:mm", { locale: ptBR })}
                    </time>
                  </div>
                  <div className="text-slate-600 font-medium text-sm">
                    {event.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

