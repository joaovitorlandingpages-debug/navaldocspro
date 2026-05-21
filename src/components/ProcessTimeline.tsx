import { Clock, User, Edit3, CheckCircle2, FileText, Anchor, ShieldCheck, AlertCircle, Zap, Cpu, FilePlus, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimelineEvent {
  id: string;
  type: 'creation' | 'update' | 'signature' | 'protocol' | 'completion' | 'validation_passed' | 'error_detected' | 'inconsistency_found' | 'ocr_processed' | 'document_generated' | 'auto_fill';
  user: string;
  description: string;
  date: string;
  metadata?: any;
}

export function ProcessTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
      {events.length === 0 && (
        <div className="space-y-8 opacity-20 grayscale pointer-events-none">
          {[
            { id: 'm1', type: 'ocr_processed', user: 'Sistema IA', description: 'Leitura de documento finalizada com sucesso.', date: new Date().toISOString() },
            { id: 'm2', type: 'creation', user: 'Ricardo Almeida', description: 'Abertura de processo no sistema.', date: new Date().toISOString() },
          ].map((mock, i) => (
            <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-50 text-slate-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                {mock.type === 'creation' ? <Anchor className="w-5 h-5" /> : <Cpu className="w-5 h-5" />}
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                   <span className="font-black text-[10px] text-navy uppercase">{mock.user} • EXEMPLO</span>
                   <span className="text-[10px] text-slate-400 font-bold uppercase">Hoje</span>
                </div>
                <div className="text-slate-600 font-medium text-sm">{mock.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {events.map((event, index) => (
        <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          {/* Icon */}
          <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-50 text-slate-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-all group-hover:scale-110 group-hover:bg-primary group-hover:text-white group-hover:border-primary">
            {event.type === 'creation' && <Anchor className="w-5 h-5" />}
            {event.type === 'update' && <Edit3 className="w-5 h-5" />}
            {event.type === 'signature' && <FileText className="w-5 h-5" />}
            {event.type === 'protocol' && <Clock className="w-5 h-5" />}
            {event.type === 'completion' && <CheckCircle2 className="w-5 h-5" />}
            {event.type === 'validation_passed' && <ShieldCheck className="w-5 h-5 text-emerald-500" />}
            {event.type === 'error_detected' && <AlertCircle className="w-5 h-5 text-red-500" />}
            {event.type === 'inconsistency_found' && <Zap className="w-5 h-5 text-amber-500" />}
            {event.type === 'ocr_processed' && <Cpu className="w-5 h-5 text-primary" />}
            {event.type === 'document_generated' && <FilePlus className="w-5 h-5 text-blue-500" />}
            {event.type === 'auto_fill' && <Sparkles className="w-5 h-5 text-purple-500" />}
          </div>
          {/* Content */}
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm transition-all group-hover:shadow-lg group-hover:border-primary/20">
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
