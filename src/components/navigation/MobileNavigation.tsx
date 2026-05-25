import React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { 
  LayoutGrid, 
  Users, 
  Ship, 
  ClipboardList, 
  PlusCircle,
  Zap
} from "lucide-react";
import { useNewProcess } from "@/hooks/useNewProcess";
import { cn } from "@/lib/utils";

export function MobileNavigation() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const { setIsNewProcessOpen } = useNewProcess();

  const navItems = [
    { name: "Início", icon: <LayoutGrid className="h-5 w-5" />, path: "/dashboard" },
    { name: "Clientes", icon: <Users className="h-5 w-5" />, path: "/customers" },
    { name: "Ação", icon: <PlusCircle className="h-7 w-7 text-white" />, isAction: true },
    { name: "Processos", icon: <ClipboardList className="h-5 w-5" />, path: "/processes" },
    { name: "Frotas", icon: <Ship className="h-5 w-5" />, path: "/vessels" },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 pb-safe-area-inset-bottom pt-2 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
      <nav className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          if (item.isAction) {
            return (
              <button
                key={item.name}
                onClick={() => setIsNewProcessOpen(true)}
                className="flex flex-col items-center justify-center -mt-8"
              >
                <div className="h-14 w-14 bg-navy rounded-full flex items-center justify-center shadow-lg shadow-navy/30 border-4 border-white transition-transform active:scale-90">
                  {item.icon}
                </div>
              </button>
            );
          }

          const isActive = pathname === item.path || (item.path !== "/dashboard" && pathname.startsWith(item.path!));

          return (
            <Link
              key={item.name}
              to={item.path!}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 transition-all active:scale-95",
                isActive ? "text-primary" : "text-slate-400"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all",
                isActive ? "bg-primary/10" : "bg-transparent"
              )}>
                {item.icon}
              </div>
              <span className={cn(
                "text-[8px] font-black uppercase tracking-widest",
                isActive ? "opacity-100" : "opacity-60"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
