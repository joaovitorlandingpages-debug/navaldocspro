import { createFileRoute } from "@tanstack/react-router";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy">Agenda Operacional</h1>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-xl border">
          <button className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft className="h-5 w-5" /></button>
          <button className="px-4 py-2 font-bold text-sm">Maio 2024</button>
          <button className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight className="h-5 w-5" /></button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 h-full min-h-[500px]">
        {/* Placeholder for calendar grid */}
        <div className="grid grid-cols-7 gap-4 text-center text-xs font-bold text-slate-400 uppercase mb-4">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-4">
          {[...Array(31)].map((_, i) => (
            <div key={i} className="min-h-[100px] border border-slate-50 rounded-xl p-2 hover:bg-slate-50 transition-colors">
               <span className="text-sm font-bold text-navy">{i+1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
