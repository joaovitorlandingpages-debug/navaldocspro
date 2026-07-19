import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Ship, 
  Zap, 
  ChevronRight,
  FileText,
  Signature,
  Share2,
  Upload,
  ZapOff,
  Star,
  Printer,
  Settings,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Workspace3Header({ process, timeInProgress }: any) {
  if (!process) return null;

  const progress = 72; // Mock progress

  return (
    <div className="bg-white border-b sticky top-0 z-50 px-6 py-4 backdrop-blur-md bg-white/90">
      {/* Upper bar: Stats & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-3 rounded-2xl shadow-lg shadow-slate-200 group cursor-pointer hover:rotate-12 transition-transform">
            <Ship className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-2">
                {process.vessel?.name || "Sem embarcação"}
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-black text-[10px] tracking-widest px-3 ml-2">
                  {process.process_number || `#${process.id.slice(0,8)}`}
                </Badge>
              </h1>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <span className="flex items-center gap-1.5 text-primary">
                <User className="h-3.5 w-3.5" />
                {process.customer?.name}
              </span>
              <div className="h-3 w-px bg-slate-200" />
              <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px] tracking-widest px-2 uppercase">
                {process.status}
              </Badge>
              <div className="h-3 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
                 <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
                 </div>
                 <span className="text-[10px] font-black text-emerald-600">{progress}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Fix Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {[
            { label: "PDFs", icon: FileText, onClick: () => {} },
            { label: "Assinaturas", icon: Signature, onClick: () => {} },
            { label: "Compartilhar", icon: Share2, onClick: () => {} },
            { label: "Upload", icon: Upload, onClick: () => {} },
            { label: "OCR", icon: Zap, onClick: () => {}, primary: true },
            { label: "Favoritar", icon: Star, onClick: () => {} },
            { label: "Imprimir", icon: Printer, onClick: () => {} },
            { label: "Config", icon: Settings, onClick: () => {} },
          ].map((action) => (
            <Button 
              key={action.label}
              variant={action.primary ? "default" : "outline"}
              size="sm" 
              className={cn(
                "h-9 px-3 gap-2 font-black uppercase text-[9px] tracking-widest rounded-xl transition-all",
                action.primary 
                  ? "bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-200 border-none" 
                  : "border-slate-200 hover:bg-slate-50 text-slate-600"
              )}
            >
              <action.icon className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">{action.label}</span>
            </Button>
          ))}
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl border border-dashed border-slate-200">
             <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
