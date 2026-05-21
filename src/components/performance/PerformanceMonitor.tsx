import { useState, useEffect } from "react";
import { Activity, Zap, Cpu, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    ttfb: 0,
    domLoad: 0,
    memory: 0,
  });

  useEffect(() => {
    const updateMetrics = () => {
      if (typeof window !== "undefined" && window.performance) {
        const nav = window.performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
        const mem = (window.performance as any).memory;
        
        setMetrics({
          ttfb: Math.round(nav?.responseStart - nav?.requestStart || 0),
          domLoad: Math.round(nav?.domContentLoadedEventEnd - nav?.startTime || 0),
          memory: mem ? Math.round(mem.usedJSHeapSize / (1024 * 1024)) : 0,
        });
      }
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="p-4 bg-navy text-white border-none rounded-2xl shadow-xl overflow-hidden relative group">
      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
        <Activity className="h-24 w-24" />
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
          <Cpu className="h-3.5 w-3.5" /> Engine Health
        </h4>
        <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[8px] font-black uppercase tracking-widest">
          SaaS Enterprise Ready
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <p className="text-[8px] font-black uppercase text-white/40">TTFB</p>
          <p className="text-sm font-bold flex items-center gap-1">
            <Zap className="h-3 w-3 text-primary" /> {metrics.ttfb}ms
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[8px] font-black uppercase text-white/40">Load</p>
          <p className="text-sm font-bold flex items-center gap-1">
            <Clock className="h-3 w-3 text-blue-400" /> {metrics.domLoad}ms
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[8px] font-black uppercase text-white/40">Heap</p>
          <p className="text-sm font-bold flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-400" /> {metrics.memory}MB
          </p>
        </div>
      </div>
    </Card>
  );
}

function Clock({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
