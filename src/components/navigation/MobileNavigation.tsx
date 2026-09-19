import React, { useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { 
  Home, 
  Users, 
  Ship, 
  ClipboardList, 
  FileText,
  Calendar,
  MoreHorizontal, 
  Settings, 
  HelpCircle, 
  LogOut, 
  Cpu, 
  Zap, 
  LayoutTemplate, 
  Signature, 
  CreditCard,
  Building2,
  ChevronRight
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export function MobileNavigation() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const { profile, signOut } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const navigate = useNavigate();

  const primaryItems = [
    { name: "Início", icon: <Home className="h-5 w-5" />, path: "/dashboard" },
    { name: "Processos", icon: <ClipboardList className="h-5 w-5" />, path: "/processes" },
    { name: "Clientes", icon: <Users className="h-5 w-5" />, path: "/customers" },
  ];

  const handleLogout = async () => {
    setIsMoreOpen(false);
    await signOut();
  };

  return (
    <>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <nav className="flex items-center justify-around h-14 max-w-md mx-auto">
          {primaryItems.map((item) => {
            const isActive = item.path === "/dashboard" 
              ? (pathname === "/dashboard" || pathname === "/dashboard/")
              : pathname.startsWith(item.path);

            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors active:scale-95",
                  isActive ? "text-[#1868db]" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <div className={cn(
                  "transition-transform",
                  isActive ? "scale-105" : ""
                )}>
                  {item.icon}
                </div>
                <span className={cn(
                  "text-[11px] font-medium leading-none",
                  isActive ? "font-semibold text-[#1868db]" : "text-slate-500"
                )}>
                  {item.name}
                </span>
              </Link>
            );
          })}

          <button
            onClick={() => setIsMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors active:scale-95",
              isMoreOpen ? "text-[#1868db]" : "text-slate-500 hover:text-slate-800"
            )}
            aria-label="Mais opções"
          >
            <div className="transition-transform">
              <MoreHorizontal className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-medium leading-none text-slate-500">
              Mais
            </span>
          </button>
        </nav>
      </div>

      {/* Drawer com os demais módulos */}
      <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <SheetContent side="bottom" className="p-0 rounded-t-3xl max-h-[85vh] overflow-y-auto bg-white border-t border-slate-100">
          <div className="p-6 space-y-6">
            <SheetHeader className="text-left pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1868db] font-bold text-sm">
                  {profile?.name?.substring(0, 2).toUpperCase() || "ND"}
                </div>
                <div className="overflow-hidden">
                  <SheetTitle className="text-base font-bold text-slate-900 truncate">
                    {profile?.name || "Usuário"}
                  </SheetTitle>
                  <p className="text-xs text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                    <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                    <span>{profile?.companies?.name || "Espaço Ativo"}</span>
                  </p>
                </div>
              </div>
            </SheetHeader>

            {/* Módulos Principais Adicionais */}
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
                Navegação
              </p>
              <Link
                to="/vessels"
                onClick={() => setIsMoreOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Ship className="h-4 w-4 text-[#1868db]" />
                  <span>Embarcações</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link
                to="/documents"
                onClick={() => setIsMoreOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-[#1868db]" />
                  <span>Documentos</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link
                to="/dashboard/deadlines"
                onClick={() => setIsMoreOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-[#1868db]" />
                  <span>Prazos e Vencimentos</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
            </div>

            {/* Mais Ferramentas */}
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
                Mais Ferramentas
              </p>
              <Link
                to="/ocr-center"
                onClick={() => setIsMoreOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span>OCR & Validação</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link
                to="/templates"
                onClick={() => setIsMoreOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LayoutTemplate className="h-4 w-4 text-indigo-500" />
                  <span>Modelos Oficiais</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link
                to="/assinaturas"
                onClick={() => setIsMoreOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Signature className="h-4 w-4 text-emerald-500" />
                  <span>Assinaturas Náuticas</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link
                to="/billing/subscription"
                onClick={() => setIsMoreOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-blue-500" />
                  <span>Assinatura & Faturamento</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link
                to="/ai-center"
                onClick={() => setIsMoreOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Cpu className="h-4 w-4 text-purple-500" />
                  <span>Inteligência Naval IA</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
            </div>

            {/* Configurações e Conta */}
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <Link
                to="/settings"
                onClick={() => setIsMoreOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Settings className="h-4 w-4 text-slate-500" />
                  <span>Configurações</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link
                to="/support"
                onClick={() => setIsMoreOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-4 w-4 text-slate-500" />
                  <span>Ajuda & Suporte</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-red-50 text-red-600 font-medium text-sm transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="h-4 w-4 text-red-500" />
                  <span>Sair da conta</span>
                </div>
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
