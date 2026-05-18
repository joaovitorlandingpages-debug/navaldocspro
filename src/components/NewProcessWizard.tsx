import { useState, useEffect } from "react";
import { 
  X, Check, ChevronRight, ChevronLeft, 
  Ship, User, FileText, ClipboardCheck, 
  Search, Plus, AlertCircle, Clock, FileCheck,
  Save, Copy, Zap
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

import { useProcessRequirements } from "@/hooks/useProcessRequirements";

interface NewProcessWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewProcessWizard({ isOpen, onClose }: NewProcessWizardProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 6;

  const [formData, setFormData] = useState({
    type: "",
    client: "",
    vessel: "",
    documents: [] as any[],
  });

  const { requirements } = useProcessRequirements(formData.type);

  // Auto-save draft logic
  useEffect(() => {
    if (isOpen) {
      const savedDraft = localStorage.getItem("process_wizard_draft");
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setFormData(parsed.formData);
          setStep(parsed.step);
          toast.info("Rascunho recuperado automaticamente");
        } catch (e) {
          console.error("Error loading draft", e);
        }
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      localStorage.setItem("process_wizard_draft", JSON.stringify({ formData, step }));
    }
  }, [formData, step, isOpen]);

  const clearDraft = () => {
    localStorage.removeItem("process_wizard_draft");
  };


  const processTypes = [
    { id: "registro", title: "Registro de embarcação", icon: <Ship className="h-4 w-4" /> },
    { id: "transferencia", title: "Transferência de propriedade", icon: <FileText className="h-4 w-4" /> },
    { id: "renovacao", title: "Renovação", icon: <Clock className="h-4 w-4" /> },
    { id: "alteracao", title: "Alteração de dados", icon: <Settings className="h-4 w-4" /> },
    { id: "segunda_via", title: "Segunda via", icon: <FileText className="h-4 w-4" /> },
    { id: "regularizacao", title: "Regularização", icon: <ClipboardCheck className="h-4 w-4" /> },
    { id: "vistoria", title: "Vistoria", icon: <Search className="h-4 w-4" /> },
    { id: "gru", title: "GRU / Taxas", icon: <FileText className="h-4 w-4" /> },
  ];

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 gap-3">
              {processTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setFormData({ ...formData, type: type.title })}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    formData.type === type.title 
                      ? "border-primary bg-primary/5 shadow-md" 
                      : "border-slate-100 hover:border-slate-200 bg-white"
                  }`}
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${
                    formData.type === type.title ? "bg-primary text-white" : "bg-slate-50 text-slate-400"
                  }`}>
                    {type.icon}
                  </div>
                  <p className="text-xs font-black text-navy uppercase leading-tight">{type.title}</p>
                </button>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar cliente existente..." 
                className="pl-10 h-12 bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sugestões</p>
              <div className="space-y-2">
                {["Marinha Mercante Ltda", "Eng. Pedro Santos", "Estaleiro Navegar"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setFormData({ ...formData, client: c })}
                    className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${
                      formData.client === c ? "border-primary bg-primary/5" : "border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-bold text-navy">{c}</span>
                    </div>
                    {formData.client === c && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
               <Button variant="outline" className="w-full h-12 rounded-xl border-dashed gap-2">
                  <Plus className="h-4 w-4" /> Criar novo cliente rapidamente
               </Button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center gap-4 mb-4">
               <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                  {formData.client.charAt(0)}
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest">Cliente Selecionado</p>
                  <p className="text-sm font-bold text-navy">{formData.client || "Nenhum cliente selecionado"}</p>
               </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar embarcação..." 
                className="pl-10 h-12 bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Embarcações deste cliente</p>
              <div className="space-y-2">
                {["Phoenix (Petroleiro)", "Titan (Rebocador)"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setFormData({ ...formData, vessel: v })}
                    className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${
                      formData.vessel === v ? "border-primary bg-primary/5" : "border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Ship className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-bold text-navy">{v}</span>
                    </div>
                    {formData.vessel === v && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
               <Button variant="outline" className="w-full h-12 rounded-xl border-dashed gap-2">
                  <Plus className="h-4 w-4" /> Vincular nova embarcação
               </Button>
            </div>
          </div>
        );
      case 4:
        const docs = requirements || [
          { template: { name: "Documento pessoal" }, is_mandatory: true, status: "pendente" },
          { template: { name: "Comprovante de residência" }, is_mandatory: true, status: "pendente" },
          { template: { name: "Documento da embarcação" }, is_mandatory: true, status: "pendente" },
        ];
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <p className="text-sm text-slate-500 mb-4">Checklist automático baseado no tipo: <span className="font-bold text-navy">{formData.type}</span></p>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {docs.map((req: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-100 flex items-center justify-between bg-white group hover:border-primary/20 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        req.is_mandatory ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                         <p className="text-xs font-bold text-navy">{req.template?.name}</p>
                         <p className={`text-[10px] font-black uppercase ${
                           req.is_mandatory ? 'text-amber-600' : 'text-slate-400'
                         }`}>{req.is_mandatory ? 'Obrigatório' : 'Opcional'}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full opacity-0 group-hover:opacity-100">
                       <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <p className="text-xs text-amber-700 font-medium">Os campos abaixo foram preenchidos automaticamente com base nos dados do cliente e da embarcação.</p>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <Label className="text-[10px] uppercase font-black text-slate-400">Nome do Requerente</Label>
                   <Input defaultValue="Ricardo Almeida Engenharia" className="bg-slate-50 border-slate-200" />
                </div>
                <div className="space-y-1.5">
                   <Label className="text-[10px] uppercase font-black text-slate-400">Inscrição / IMO</Label>
                   <Input defaultValue="9876543" className="bg-slate-50 border-slate-200" />
                </div>
                <div className="space-y-1.5">
                   <Label className="text-[10px] uppercase font-black text-slate-400">Data de Solicitação</Label>
                   <Input defaultValue="12/05/2026" className="bg-slate-50 border-slate-200" />
                </div>
                <div className="space-y-1.5">
                   <Label className="text-[10px] uppercase font-black text-slate-400">Responsável Técnico</Label>
                   <Input placeholder="Selecione..." className="bg-white border-primary/20 shadow-sm" />
                   <p className="text-[9px] text-red-500 font-bold">* Campo obrigatório</p>
                </div>
                <div className="col-span-2 space-y-1.5">
                   <Label className="text-[10px] uppercase font-black text-slate-400">Objeto da Solicitação</Label>
                   <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm min-h-[80px]" defaultValue="Solicitação de vistoria anual para renovação de certificado de segurança de navegação (CSN) da embarcação Phoenix." />
                </div>
             </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="bg-navy p-6 rounded-3xl text-white">
                <div className="flex justify-between items-start mb-6">
                   <div>
                      <h4 className="text-lg font-bold">Resumo do Processo</h4>
                      <p className="text-xs text-slate-400">Revise os detalhes antes de finalizar.</p>
                   </div>
                   <Badge className="bg-primary text-white border-none">{formData.type}</Badge>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center"><User className="h-5 w-5 text-primary" /></div>
                      <div>
                         <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Cliente</p>
                         <p className="text-sm font-bold">{formData.client}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center"><Ship className="h-5 w-5 text-cyan-400" /></div>
                      <div>
                         <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Embarcação</p>
                         <p className="text-sm font-bold">{formData.vessel}</p>
                      </div>
                   </div>
                </div>
             </div>

             <div className="space-y-3">
                <div className="flex justify-between items-center text-xs px-2">
                   <span className="text-slate-500 font-medium">Documentos vinculados</span>
                   <span className="text-navy font-bold">6 itens</span>
                </div>
                <div className="flex justify-between items-center text-xs px-2">
                   <span className="text-slate-500 font-medium">Prazo estimado</span>
                   <span className="text-navy font-bold">15 dias úteis</span>
                </div>
                <div className="flex justify-between items-center text-xs px-2">
                   <span className="text-slate-500 font-medium">Responsável</span>
                   <span className="text-navy font-bold">Eng. Ricardo Almeida</span>
                </div>
             </div>

             <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                   <Check className="h-4 w-4" />
                </div>
                <p className="text-xs text-green-800 font-medium">Tudo pronto! O processo será criado com status "Novo".</p>
             </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return "Tipo de Processo";
      case 2: return "Selecionar Cliente";
      case 3: return "Vincular Embarcação";
      case 4: return "Documentos";
      case 5: return "Preenchimento";
      case 6: return "Revisão Final";
      default: return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl p-0 overflow-hidden bg-white border-none rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="p-8 pb-0 border-b-0">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-navy text-white rounded-2xl flex items-center justify-center font-black shadow-lg">
                {step}
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-navy uppercase tracking-tight">
                  {getStepTitle()}
                </DialogTitle>
                <div className="flex gap-1 mt-1">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1 rounded-full transition-all ${
                        i + 1 <= step ? "w-4 bg-primary" : "w-1 bg-slate-100"
                      }`} 
                    />
                  ))}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="h-6 w-6 text-slate-300" />
            </button>
          </div>
        </DialogHeader>

        <div className="px-8 py-6">
          {renderStep()}
        </div>

        <div className="p-8 pt-4 bg-slate-50/50 flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1}
              className="rounded-2xl h-14 px-6 font-black uppercase text-xs tracking-widest gap-2"
            >
              <ChevronLeft className="h-4 w-4" /> Voltar
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                clearDraft();
                toast.success("Formulário limpo");
                setFormData({ type: "", client: "", vessel: "", documents: [] });
                setStep(1);
              }}
              className="rounded-2xl h-14 px-4 text-slate-400 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="hidden md:flex rounded-2xl h-14 px-6 font-black uppercase text-xs tracking-widest gap-2 border-slate-200"
              onClick={() => toast.success("Rascunho salvo no navegador")}
            >
              <Save className="h-4 w-4" /> Salvar
            </Button>

            {step === totalSteps ? (
              <Button
                onClick={() => {
                  clearDraft();
                  onClose();
                  setStep(1);
                }}
                className="bg-primary hover:opacity-90 rounded-2xl h-14 px-10 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 gap-2"
              >
                Criar Processo <Check className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!formData.type && step === 1}
                className="bg-navy hover:opacity-90 rounded-2xl h-14 px-10 font-black uppercase text-xs tracking-widest text-white shadow-xl shadow-navy/20 gap-2"
              >
                Próximo <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


function Settings(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
