import React, { useState, useEffect, useMemo } from 'react';
import { useWizardStore, WizardStep } from './Wizard2Store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  Search, User, Ship, Sparkles, ListChecks, 
  FileText, CheckCircle2, Plus, UserPlus, 
  ArrowRight, ShieldCheck, Clock, FileCheck,
  AlertTriangle, Upload, Eye, Trash2, Camera
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { FileUploader } from '@/components/FileUploader';
import { previewProcessBlueprint } from '@/services/processes/blueprintEngine';

// --- Shared Components ---

function StepHeader({ title, description, icon: Icon }: { title: string, description: string, icon: any }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 text-primary mb-1">
        <Icon className="h-5 w-5" />
        <h2 className="text-lg font-black uppercase tracking-tight">{title}</h2>
      </div>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  );
}

// --- Step 1: Client ---

export function StepClient() {
  const { customerId, setData, companyId, clearStepData } = useWizardStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);

  useEffect(() => {
    const loadFavorites = async () => {
      if (!companyId) return;
      // Simulação de favoritos: clientes com processos recentes
      const { data } = await supabase
        .from('processes')
        .select('customer:customers(id, name, cpf_cnpj, phone, city)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (data) {
        const unique = Array.from(new Set(data.map(d => (d as any).customer?.id)))
          .map(id => data.find(d => (d as any).customer?.id === id))
          .filter(Boolean)
          .map(d => (d as any).customer);
        setFavorites(unique);
      }
    };
    loadFavorites();
  }, [companyId]);

  useEffect(() => {
    const search = async () => {
      if (!companyId) return;
      setLoading(true);
      const { data } = await supabase
        .from('customers')
        .select('id, name, cpf_cnpj, phone, city')
        .eq('company_id', companyId)
        .ilike('name', `%${query}%`)
        .limit(6);
      setResults(data || []);
      setLoading(false);
    };
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [query, companyId]);

  const handleCreateNew = async () => {
    const name = window.prompt("Nome do novo cliente:");
    if (!name || !companyId) return;
    const { data, error } = await supabase
      .from('customers')
      .insert({ name, company_id: companyId })
      .select().single();
    if (error) toast.error("Erro ao criar cliente");
    else {
      setData({ customerId: data.id });
      toast.success("Cliente criado e selecionado");
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <StepHeader 
        title="Cliente" 
        description="Quem é o responsável ou solicitante deste processo?" 
        icon={User} 
      />
      
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <Input 
          placeholder="Pesquisar por nome, CPF ou CNPJ..." 
          className="pl-10 py-6 text-base rounded-xl border-slate-200"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {query === '' && favorites.length > 0 && (
          <div className="space-y-3">
             <div className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
               <Star className="h-3 w-3 fill-primary" /> Favoritos & Recentes
             </div>
             {favorites.map(c => (
                <button
                  key={c.id}
                  onClick={() => setData({ customerId: c.id })}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left group ${
                    customerId === c.id ? 'border-primary bg-primary/5 shadow-md' : 'border-slate-100 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{c.name}</div>
                      <div className="text-[10px] text-slate-500 flex gap-2 mt-0.5">
                        <span className="flex items-center gap-1 font-bold"><Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" /> Cliente Frequente</span>
                        {c.city && <span>• {c.city}</span>}
                      </div>
                    </div>
                  </div>
                  {customerId === c.id ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <ArrowRight className="h-4 w-4 text-slate-200 group-hover:text-primary transition-colors" />}
                </button>
             ))}
             <div className="h-px bg-slate-50 my-4" />
          </div>
        )}

        {results.map(c => (
          <button
            key={c.id}
            onClick={() => setData({ customerId: c.id })}
            className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left group ${
              customerId === c.id ? 'border-primary bg-primary/5 shadow-md' : 'border-slate-100 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <User className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900">{c.name}</div>
                <div className="text-xs text-slate-500 flex gap-3 mt-1">
                  <span>{c.cpf_cnpj || 'Sem CPF/CNPJ'}</span>
                  {c.city && <span>• {c.city}</span>}
                </div>
              </div>
            </div>
            {customerId === c.id ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <ArrowRight className="h-4 w-4 text-slate-200 group-hover:text-primary transition-colors" />}
          </button>
        ))}
        
        <button
          onClick={handleCreateNew}
          className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary hover:text-primary transition-all text-slate-500 font-bold text-sm bg-slate-50/30"
        >
          <UserPlus className="h-4 w-4" />
          Novo Cliente
        </button>
      </div>
    </div>
  );
}

// --- Step 2: Vessel ---

export function StepVessel() {
  const { customerId, vesselId, setData, companyId } = useWizardStore();
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (!customerId) return;
    const load = async () => {
      const { data } = await supabase
        .from('vessels')
        .select('*')
        .eq('customer_id', customerId);
      setResults(data || []);
    };
    load();
  }, [customerId]);

  const handleCreateNew = async () => {
    const name = window.prompt("Nome da embarcação:");
    if (!name || !companyId || !customerId) return;
    const { data, error } = await supabase
      .from('vessels')
      .insert({ name, company_id: companyId, customer_id: customerId })
      .select().single();
    if (error) toast.error("Erro ao criar embarcação");
    else {
      setData({ vesselId: data.id });
      toast.success("Embarcação criada e selecionada");
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
      <StepHeader 
        title="Embarcação" 
        description="Selecione a embarcação objeto do processo." 
        icon={Ship} 
      />

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <Input 
          placeholder="Busca Universal de Embarcações..." 
          className="pl-10 py-6 text-base rounded-xl border-slate-200"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {results.map(v => (
          <button
            key={v.id}
            onClick={() => onSelect(v)}
            className={`flex flex-col p-5 rounded-2xl border-2 transition-all text-left relative group ${
              vesselId === v.id ? 'border-primary bg-primary/5 shadow-lg' : 'border-slate-100 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <Ship className="h-5 w-5" />
              </div>
              {vesselId === v.id ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <ArrowUpRight className="h-4 w-4 text-slate-200 opacity-0 group-hover:opacity-100 transition-all" />}
            </div>
            
            <div className="font-black text-slate-900 text-lg mb-1 leading-tight">{v.name}</div>
            <div className="text-[10px] uppercase tracking-wider font-black text-slate-400 flex items-center gap-1.5">
               <ShieldCheck className="h-3 w-3 text-emerald-500" /> {v.vessel_type || 'Lancha'} • {v.registration_number || 'Sem reg.'}
            </div>
            
            {!customerId && v.customer_id && (
              <div className="mt-4 pt-3 border-t border-slate-50 flex items-center gap-2">
                <User className="h-3 w-3 text-slate-300" />
                <span className="text-[10px] font-bold text-slate-400 uppercase truncate">Preencherá Cliente Autom.</span>
              </div>
            )}
          </button>
        ))}
        
        <button
          onClick={handleCreateNew}
          className="flex flex-col items-center justify-center gap-1 p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary hover:text-primary transition-all text-slate-500 font-bold text-sm"
        >
          <Plus className="h-5 w-5" />
          Nova Embarcação
        </button>
      </div>
    </div>
  );
}

// --- Step 3: Process Type ---

const TYPE_CARDS = [
  { id: 'renovacao', name: 'Renovação', icon: '🟦', color: 'bg-blue-500', desc: 'Renovação de TIE/TIEM ou documentos anuais.', docs: '3 docs', time: '5-10 dias' },
  { id: 'inspecao', name: 'Inspeção', icon: '🟩', color: 'bg-emerald-500', desc: 'Vistoria técnica para emissão de certificados.', docs: '5 docs', time: '15 dias' },
  { id: 'registro', name: 'Registro', icon: '🟨', color: 'bg-amber-500', desc: 'Inscrição de nova embarcação ou motores.', docs: '8 docs', time: '30 dias' },
  { id: 'transferencia', name: 'Transferência', icon: '🟪', color: 'bg-purple-500', desc: 'Mudança de propriedade entre vendedores/compradores.', docs: '6 docs', time: '20 dias' },
  { id: 'cancelamento', name: 'Cancelamento', icon: '🟥', color: 'bg-rose-500', desc: 'Baixa definitiva de registro ou motor.', docs: '4 docs', time: '15 dias' },
];

export function StepType() {
  const { processTypeId, setData } = useWizardStore();
  const [types, setTypes] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('process_types').select('*').order('name');
      setTypes(data || []);
    };
    load();
  }, []);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
      <StepHeader 
        title="Tipo de Processo" 
        description="Qual serviço será realizado?" 
        icon={Sparkles} 
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TYPE_CARDS.map(card => {
          const dbType = types.find(t => t.name.toLowerCase().includes(card.name.toLowerCase()));
          const isActive = processTypeId === (dbType?.id || card.id);
          
          return (
            <button
              key={card.id}
              onClick={() => setData({ processTypeId: dbType?.id || card.id, processTypeName: dbType?.name || card.name })}
              className={`flex flex-col p-5 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${
                isActive ? 'border-primary bg-primary/5 shadow-lg' : 'border-slate-100 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${card.color} text-white shadow-sm`}>
                  {card.icon}
                </div>
                {isActive && <CheckCircle2 className="h-5 w-5 text-primary" />}
              </div>
              
              <div className="font-black text-slate-900 text-lg mb-1">{card.name}</div>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">{card.desc}</p>
              
              <div className="flex items-center gap-3 mt-auto">
                <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 border-none px-2 py-0">
                  <FileText className="h-3 w-3 mr-1" /> {card.docs}
                </Badge>
                <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 border-none px-2 py-0">
                  <Clock className="h-3 w-3 mr-1" /> {card.time}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Step 4: Checklist ---

export function StepChecklist() {
  const { processTypeName, docPicks, setData } = useWizardStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!processTypeName) return;
    const load = async () => {
      setLoading(true);
      const blueprint = await previewProcessBlueprint(processTypeName);
      setItems(blueprint || []);
      // Auto-pick mandatory items
      const mandatory = blueprint.filter(i => i.kind === 'mandatory').map(i => i.templateId).filter(Boolean) as string[];
      setData({ docPicks: [...new Set([...docPicks, ...mandatory])] });
      setLoading(false);
    };
    load();
  }, [processTypeName]);

  const toggle = (id: string) => {
    setData({
      docPicks: docPicks.includes(id) 
        ? docPicks.filter(i => i !== id) 
        : [...docPicks, id]
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
      <StepHeader 
        title="Checklist Inteligente" 
        description="Confirme os requisitos automáticos para este processo." 
        icon={ListChecks} 
      />

      <Card className="rounded-2xl border-slate-100 overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Documentos Sugeridos
          </span>
          <span className="text-[10px] font-black text-primary">
            {docPicks.length} selecionados
          </span>
        </div>
        
        <div className="divide-y divide-slate-100">
          {items.map((item, idx) => (
            <div 
              key={item.templateId || idx}
              className="flex items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors cursor-pointer"
              onClick={() => item.templateId && toggle(item.templateId)}
            >
              <Checkbox 
                checked={item.templateId ? docPicks.includes(item.templateId) : false} 
                onCheckedChange={() => item.templateId && toggle(item.templateId)}
              />
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-900">{item.name}</div>
                <div className="flex gap-2 mt-1">
                  {item.kind === 'mandatory' && <Badge className="text-[9px] h-4 px-1.5 bg-rose-50 text-rose-600 border-none">Obrigatório</Badge>}
                  {item.requires_ocr && <Badge className="text-[9px] h-4 px-1.5 bg-blue-50 text-blue-600 border-none">Suporta OCR</Badge>}
                </div>
              </div>
              <div className="flex gap-2">
                {item.requires_photo && <Camera className="h-4 w-4 text-slate-300" />}
                <FileCheck className="h-4 w-4 text-slate-300" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// --- Step 5: Documents ---

export function StepDocuments() {
  const { docPicks, uploadedFiles, setData } = useWizardStore();
  
  const handleUpload = (slot: string, files: any[]) => {
    setData({
      uploadedFiles: { ...uploadedFiles, [slot]: [...(uploadedFiles[slot] || []), ...files] }
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
      <StepHeader 
        title="Documentação Visual" 
        description="Envie as fotos ou PDFs solicitados." 
        icon={FileText} 
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {docPicks.map((pick, idx) => (
          <Card key={pick || idx} className="p-4 rounded-2xl border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black text-slate-900 uppercase tracking-tight truncate pr-2">
                Doc #{idx + 1}
              </span>
              {(uploadedFiles[pick] || []).length > 0 ? (
                <Badge className="bg-emerald-50 text-emerald-600 border-none text-[10px]">Enviado</Badge>
              ) : (
                <Badge variant="outline" className="text-slate-400 border-slate-200 text-[10px]">Pendente</Badge>
              )}
            </div>
            
            <div className="aspect-video rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 group transition-colors hover:border-primary hover:bg-primary/5 cursor-pointer relative overflow-hidden">
               {(uploadedFiles[pick] || []).length > 0 ? (
                 <div className="flex flex-col items-center gap-1">
                   <FileCheck className="h-8 w-8 text-emerald-500" />
                   <span className="text-[10px] text-slate-500 font-medium">Ver / Alterar</span>
                 </div>
               ) : (
                 <div className="flex flex-col items-center gap-1">
                   <Upload className="h-6 w-6 text-slate-300 group-hover:text-primary transition-colors" />
                   <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Enviar</span>
                 </div>
               )}
               
               <div className="absolute inset-0 opacity-0 cursor-pointer">
                  <FileUploader 
                    bucket="process-attachments" 
                    category={pick}
                    onSuccess={(res: any) => handleUpload(pick, [res])}
                  />
               </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// --- Step 6: Review ---

export function StepReview() {
  const state = useWizardStore();
  const [customer, setCustomer] = useState<any>(null);
  const [vessel, setVessel] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      if (state.customerId) {
        const { data } = await supabase.from('customers').select('name').eq('id', state.customerId).single();
        setCustomer(data);
      }
      if (state.vesselId) {
        const { data } = await supabase.from('vessels').select('name').eq('id', state.vesselId).single();
        setVessel(data);
      }
    };
    load();
  }, [state.customerId, state.vesselId]);

  const Item = ({ label, value, icon: Icon }: any) => (
    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-primary shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
        <div className="font-bold text-slate-900">{value || 'Não informado'}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-400">
      <StepHeader 
        title="Revisão Geral" 
        description="Confira todas as informações antes de oficializar o processo." 
        icon={CheckCircle2} 
      />

      <div className="grid gap-3">
        <Item label="Cliente" value={customer?.name} icon={User} />
        <Item label="Embarcação" value={vessel?.name} icon={Ship} />
        <Item label="Processo" value={state.processTypeName} icon={Sparkles} />
        
        <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/20">
          <div className="w-10 h-10 rounded-xl bg-white border border-primary/20 flex items-center justify-center text-primary shadow-sm">
            <ListChecks className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-primary/60">Checklist & Documentos</div>
            <div className="font-bold text-slate-900">{state.docPicks.length} itens configurados</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black text-slate-400">UPLOAD CONCLUÍDO</div>
            <div className="font-black text-emerald-600">{Object.keys(state.uploadedFiles).length} / {state.docPicks.length}</div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-[11px] text-amber-700 leading-relaxed flex gap-3">
        <ShieldCheck className="h-5 w-5 text-amber-500 shrink-0" />
        Ao clicar em "Criar Processo", o sistema iniciará a materialização dos documentos, automações de OCR e notificará os envolvidos.
      </div>
    </div>
  );
}
