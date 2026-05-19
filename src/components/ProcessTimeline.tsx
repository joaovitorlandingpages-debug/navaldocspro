import { Clock, User, Edit3, CheckCircle2, FileText, Anchor, ShieldCheck, AlertCircle, Zap } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimelineEvent {
  id: string;
  type: 'creation' | 'update' | 'signature' | 'protocol' | 'completion' | 'validation_passed' | 'error_detected' | 'inconsistency_found';
  user: string;
  description: string;
  date: string;
}

export function ProcessTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
      {events.map((event, index) => (
        <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          {/* Icon */}
          <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-50 text-slate-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-all group-hover:scale-110 group-hover:bg-primary group-hover:text-white group-hover:border-primary">
            {event.type === 'creation' && <Anchor className="w-5 h-5" />}
            {event.type === 'update' && <Edit3 className="w-5 h-5" />}
            {event.type === 'signature' && <FileText className="w-5 h-5" />}
            {event.type === 'protocol' && <Clock className="w-5 h-5" />}
            {event.type === 'completion' && <CheckCircle2 className="w-5 h-5" />}
          </div>
          {/* Content */}
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm transition-all group-hover:shadow-md group-hover:border-primary/20">
            <div className="flex items-center justify-between space-x-2 mb-2">
              <div className="flex items-center gap-2">
                 <User className="w-4 h-4 text-slate-400" />
                 <span className="font-black text-[10px] text-navy uppercase tracking-widest">{event.user}</span>
              </div>
              <time className="font-bold text-[10px] text-slate-400 uppercase">
                {format(new Date(event.date), "dd MMM, HH:mm", { locale: ptBR })}
              </time>
            </div>
            <div className="text-slate-600 font-medium text-sm">
              {event.description}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
