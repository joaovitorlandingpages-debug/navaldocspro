import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ShieldAlert, 
  ArrowUpCircle, 
  MessageSquare, 
  CheckCircle2, 
  Zap, 
  Users, 
  FileText, 
  Ship,
  TrendingUp
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: "customers" | "vessels" | "processes" | "documents" | "ocr" | "users" | "files";
  limit: number | null;
  current: number;
}

const resourceConfig = {
  customers: {
    label: "Clientes",
    icon: <Users className="h-5 w-5" />,
    description: "Você atingiu o limite de clientes cadastrados no seu plano atual."
  },
  vessels: {
    label: "Embarcações",
    icon: <Ship className="h-5 w-5" />,
    description: "Sua frota atingiu o limite máximo permitido pelo seu plano."
  },
  processes: {
    label: "Processos",
    icon: <TrendingUp className="h-5 w-5" />,
    description: "O limite de processos ativos foi alcançado."
  },
  documents: {
    label: "Documentos Oficiais",
    icon: <FileText className="h-5 w-5" />,
    description: "Sua cota mensal de geração de documentos foi esgotada."
  },
  ocr: {
    label: "Processamento OCR",
    icon: <Zap className="h-5 w-5" />,
    description: "O limite de leituras inteligentes via IA foi atingido este mês."
  },
  users: {
    label: "Usuários / Staff",
    icon: <Users className="h-5 w-5" />,
    description: "Seu plano não permite adicionar mais usuários à equipe."
  },
  files: {
    label: "Armazenamento",
    icon: <FileText className="h-5 w-5" />,
    description: "Seu limite de upload de arquivos foi atingido."
  }
};

export function UpgradeModal({ isOpen, onClose, resource, limit, current }: UpgradeModalProps) {
  const navigate = useNavigate();
  const config = resourceConfig[resource];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none rounded-[2.5rem] shadow-2xl">
        <div className="bg-navy p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-[100%] -mr-10 -mt-10 opacity-50"></div>
          <div className="relative z-10 flex flex-col items-center text-center space-y-4">
            <div className="h-20 w-20 bg-white/10 rounded-[2rem] flex items-center justify-center backdrop-blur-sm border border-white/20">
              <ShieldAlert className="h-10 w-10 text-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Limite Atingido</h2>
            <p className="text-white/60 text-sm font-medium italic">NavalDocs Pro Enterprise Architecture</p>
          </div>
        </div>

        <div className="p-8 bg-white space-y-8">
          <div className="flex items-start gap-5">
            <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center text-navy shadow-sm border border-slate-100 flex-shrink-0">
              {config.icon}
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-navy uppercase tracking-tight text-lg">{config.label}</h4>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                {config.description}
              </p>
            </div>
          </div>

          <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex justify-between items-center">
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Uso Atual</p>
                <p className="text-2xl font-black text-navy mt-1">{current} <span className="text-slate-300 text-lg">/ {limit}</span></p>
             </div>
             <Badge className="bg-navy text-white font-black px-4 py-1.5 rounded-xl uppercase tracking-widest text-[10px]">Upgrade Necessário</Badge>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Benefícios do Upgrade</p>
            <div className="grid grid-cols-2 gap-3">
               <div className="flex items-center gap-2 text-[11px] font-bold text-navy">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Limites Estendidos
               </div>
               <div className="flex items-center gap-2 text-[11px] font-bold text-navy">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Multi-usuário Staff
               </div>
               <div className="flex items-center gap-2 text-[11px] font-bold text-navy">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Suporte Prioritário
               </div>
               <div className="flex items-center gap-2 text-[11px] font-bold text-navy">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> IA / OCR Avançado
               </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 bg-slate-50 border-t flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            className="w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2"
            onClick={() => window.open("mailto:suporte@navaldocs.pro")}
          >
            <MessageSquare className="h-4 w-4" /> Suporte
          </Button>
          <Button 
            className="w-full h-12 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-primary/20 hover:opacity-90"
            onClick={() => {
              onClose();
              navigate({ to: "/billing/plans" });
            }}
          >
            <ArrowUpCircle className="h-4 w-4" /> Fazer Upgrade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
