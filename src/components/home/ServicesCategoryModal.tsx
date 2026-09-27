import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Anchor, Ship, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

interface ServicesCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ServicesCategoryModal({ isOpen, onClose }: ServicesCategoryModalProps) {
  const navigate = useNavigate();

  const handleSelect = (category: "esporte_recreio" | "profissional") => {
    onClose();
    navigate({
      to: "/processes/novo-pedido",
      search: { category },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-6 sm:p-8 rounded-2xl bg-white border border-slate-150 shadow-xl animate-in fade-in-50 zoom-in-95 duration-200">
        <DialogHeader className="text-left pb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#075BFF] uppercase tracking-wider mb-1">
            <Sparkles className="h-4 w-4" />
            <span>Novo Serviço Náutico</span>
          </div>
          <DialogTitle className="text-2xl font-bold text-[#0B1739] tracking-tight">
            Escolha a categoria da embarcação
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 mt-1">
            Selecione a finalidade da embarcação para carregar os serviços e exigências regulatórias correspondentes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {/* Opção 1: Esporte e Recreio */}
          <button
            type="button"
            onClick={() => handleSelect("esporte_recreio")}
            className="flex flex-col justify-between p-5 rounded-2xl border border-slate-200 bg-white hover:border-[#075BFF] hover:bg-[#F8FAFF] hover:shadow-md transition-all text-left group cursor-pointer"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#EEF4FF] text-[#075BFF] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Anchor className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[#0B1739] group-hover:text-[#075BFF] transition-colors">
                Esporte e Recreio
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Lanchas, veleiros, motos aquáticas (jet ski), iates e botes de lazer ou uso particular.
              </p>
            </div>
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs font-semibold text-[#075BFF]">
              <span>Selecionar categoria</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Opção 2: Profissionais */}
          <button
            type="button"
            onClick={() => handleSelect("profissional")}
            className="flex flex-col justify-between p-5 rounded-2xl border border-slate-200 bg-white hover:border-[#075BFF] hover:bg-[#F8FAFF] hover:shadow-md transition-all text-left group cursor-pointer"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#EEF4FF] text-[#075BFF] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Ship className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[#0B1739] group-hover:text-[#075BFF] transition-colors">
                Embarcações Profissionais
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Transporte de passageiros, carga, pesca comercial, apoio portuário, rebocadores e turismo.
              </p>
            </div>
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs font-semibold text-[#075BFF]">
              <span>Selecionar categoria</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
