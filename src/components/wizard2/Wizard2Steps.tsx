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
  AlertTriangle, Upload, Eye, Trash2, Camera,
  Star, ArrowUpRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { FileUploader } from '@/components/FileUploader';
import { previewProcessBlueprint } from '@/services/processes/blueprintEngine';
import { runSmartOcr, detectExistingCustomer, detectExistingVessel } from '@/services/smartOnboardingService';
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

// --- Step 2: Client (Previously Step 1) ---

export function StepClient() {
  const { customerId, setData, companyId, ocrData } = useWizardStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);

  // Auto-populate from OCR if available
  useEffect(() => {
    if (ocrData.extractedFields?.customerName && !customerId && !query) {
      setQuery(ocrData.extractedFields.customerName);
      toast.info(`Busca sugerida pela IA: ${ocrData.extractedFields.customerName}`, {
        description: "Encontramos este nome nos documentos enviados."
      });
    }
  }, [ocrData.extractedFields?.customerName]);

  useEffect(() => {
    const loadFavorites = async () => {
      if (!companyId) return;
      const { data } = await supabase
        .from('processes')
        .select('customer:customers(id, name, cpf_cnpj, phone, city)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (data) {
        const unique = Array.from(new Set(data.map((d: any) => (d as any).customer?.id)))
          .map(id => data.find((d: any) => (d as any).customer?.id === id))
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
    const name = window.prompt("Nome do novo cliente:", ocrData.extractedFields?.customerName || "");
    if (!name || !companyId) return;
    const { data, error } = await supabase
      .from('customers')
      .insert({ 
        name, 
        company_id: companyId,
        cpf_cnpj: ocrData.extractedFields?.customerCpfCnpj || null
      })
      .select().single();
    if (error) toast.error("Erro ao criar cliente");
    else {
      setData({ customerId: data.id });
      toast.success("Cliente criado e selecionado");
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-start">
        <StepHeader 
          title="Revisão de Cliente" 
          description="Confirme o responsável ou solicitante deste processo." 
          icon={User} 
        />
        {ocrData.confidence > 0 && (
          <Badge className="bg-blue-50 text-blue-600 border-none px-3 py-1 flex items-center gap-1 font-black text-[9px] uppercase">
            <Sparkles className="h-3 w-3" /> IA Confiança: {Math.round(ocrData.confidence * 100)}%
          </Badge>
        )}
      </div>
      
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
          {ocrData.extractedFields?.customerName ? `Confirmar Novo: ${ocrData.extractedFields.customerName}` : 'Novo Cliente'}
        </button>
      </div>
    </div>
  );
}


// --- Step 3: Vessel (Previously Step 2) ---

export function StepVessel() {
  const { customerId, vesselId, setData, companyId, ocrData } = useWizardStore();
  const [results, setResults] = useState<any[]>([]);
  const [query, setQuery] = useState('');

  // Auto-populate from OCR if available
  useEffect(() => {
    if (ocrData.extractedFields?.vesselName && !vesselId && !query) {
      setQuery(ocrData.extractedFields.vesselName);
      toast.info(`Busca sugerida pela IA: ${ocrData.extractedFields.vesselName}`, {
        description: "Encontramos este nome nos documentos enviados."
      });
    }
  }, [ocrData.extractedFields?.vesselName]);

  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      let q = supabase
        .from('vessels')
        .select('*')
        .eq('company_id', companyId);
      
      if (customerId) {
        q = q.eq('customer_id', customerId);
      }

      if (query) {
        q = q.ilike('name', `%${query}%`);
      }

      const { data } = await q.limit(10);
      setResults(data || []);
    };
    load();
  }, [customerId, companyId, query]);

  const onSelect = (v: any) => {
    setData({ 
      vesselId: v.id, 
      customerId: v.customer_id || customerId 
    });
  };

  const handleCreateNew = async () => {
    const name = window.prompt("Nome da embarcação:", ocrData.extractedFields?.vesselName || "");
    if (!name || !companyId || !customerId) return;
    const { data, error } = await supabase
      .from('vessels')
      .insert({ 
        name, 
        company_id: companyId, 
        customer_id: customerId,
        registration_number: ocrData.extractedFields?.registrationNumber || null,
        vessel_type: ocrData.extractedFields?.vesselType || null
      })
      .select().single();
    if (error) toast.error("Erro ao criar embarcação");
    else {
      setData({ vesselId: data.id });
      toast.success("Embarcação criada e selecionada");
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
      <div className="flex justify-between items-start">
        <StepHeader 
          title="Revisão de Embarcação" 
          description="Selecione a embarcação objeto do processo." 
          icon={Ship} 
        />
        {ocrData.confidence > 0 && (
          <Badge className="bg-blue-50 text-blue-600 border-none px-3 py-1 flex items-center gap-1 font-black text-[9px] uppercase">
            <Sparkles className="h-3 w-3" /> IA Confiança: {Math.round(ocrData.confidence * 100)}%
          </Badge>
        )}
      </div>

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
          className="flex flex-col items-center justify-center gap-1 p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary hover:text-primary transition-all text-slate-500 font-bold text-sm bg-slate-50/30"
        >
          <Plus className="h-5 w-5" />
          {ocrData.extractedFields?.vesselName ? `Confirmar Nova: ${ocrData.extractedFields.vesselName}` : 'Nova Embarcação'}
        </button>
      </div>
    </div>
  );
}


// --- Step 3: Process Type ---

const TYPE_CARDS = [
  { id: 'registro-inicial', name: 'Registro Inicial', icon: '📝', color: 'bg-blue-600', desc: 'Primeiro registro da embarcação.', docs: '8 docs', time: '20 dias' },
  { id: 'registro-motor', name: 'Registro de Motor', icon: '⚙️', color: 'bg-slate-600', desc: 'Inclusão ou alteração de motor.', docs: '4 docs', time: '10 dias' },
  { id: 'alteracao-cadastral', name: 'Alteração Cadastral', icon: '👤', color: 'bg-indigo-500', desc: 'Atualização de dados do proprietário.', docs: '3 docs', time: '7 dias' },
  { id: 'mudanca-proprietario', name: 'Mudança de Proprietário', icon: '🤝', color: 'bg-purple-600', desc: 'Transferência de titularidade.', docs: '6 docs', time: '15 dias' },
  { id: 'segunda-via', name: 'Segunda Via', icon: '📄', color: 'bg-amber-500', desc: 'Emissão de novo documento por perda.', docs: '2 docs', time: '5 dias' },
  { id: 'emissao-certificados', name: 'Emissão de Certificados', icon: '📜', color: 'bg-emerald-600', desc: 'Solicitação de certificados diversos.', docs: '4 docs', time: '10 dias' },
  { id: 'laudo-tecnico', name: 'Laudo Técnico', icon: '📐', color: 'bg-cyan-600', desc: 'Perícia e laudo de engenharia.', docs: '5 docs', time: '12 dias' },
  { id: 'outros', name: 'Outros', icon: '➕', color: 'bg-slate-400', desc: 'Demais serviços navais.', docs: 'Variável', time: 'Consultar' },
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

// --- Step 1: Documents (Previously Step 5) ---

export function StepDocuments() {
  const { docPicks, uploadedFiles, setData, processTypeName, ocrData } = useWizardStore();
  const [blueprint, setBlueprint] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Start with a default set of documents if none picked yet (since this is now step 1)
    const load = async () => {
      setLoading(true);
      // If we don't have a type yet, show common onboarding docs (ID, Boat Doc)
      const data = await previewProcessBlueprint(processTypeName || "Registro Inicial");
      
      const defaultDocs = ["template-id-card", "template-boat-card"]; 
      const picked = data.filter(item => 
        item.kind === 'mandatory' || (item.templateId && defaultDocs.includes(item.templateId))
      );
      setBlueprint(picked);
      setLoading(false);
    };
    load();
  }, [processTypeName]);

  const handleUpload = async (slot: string, files: any[]) => {
    setData({
      uploadedFiles: { ...uploadedFiles, [slot]: [...(uploadedFiles[slot] || []), ...files] }
    });

    // Simulated AI/OCR Trigger for the new "Step 1" flow
    if (files.length > 0) {
      setData({ ocrData: { ...ocrData, isExtracting: true } });
      toast.promise(
        new Promise((resolve) => setTimeout(() => {
          // Mocking OCR results based on file slot
          const mockData = slot === 'template-id-card' 
            ? { customerName: "ROBERTO NAVAL SILVA", customerCpfCnpj: "123.456.789-00" }
            : { vesselName: "MAR AZUL II", registrationNumber: "PR-12345", vesselType: "Lancha" };
          
          setData({ 
            ocrData: { 
              isExtracting: false, 
              confidence: 0.94, 
              extractedFields: { ...ocrData.extractedFields, ...mockData } 
            } 
          });
          resolve(true);
        }, 2500)),
        {
          loading: 'IA analisando documento...',
          success: 'Dados extraídos com sucesso! Próximas etapas pré-preenchidas.',
          error: 'Falha na leitura automática.',
        }
      );
    }
  };

  const progressCount = blueprint.filter(item => item.templateId && (uploadedFiles[item.templateId] || []).length > 0).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <StepHeader 
          title="Início: Documentação" 
          description="Envie os documentos principais para preenchimento automático via IA." 
          icon={FileText} 
        />
        
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 min-w-[180px]">
          <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 mb-2">
            <span>Extração Ativa</span>
            <span className={ocrData.isExtracting ? "text-primary animate-pulse" : "text-emerald-500"}>
              {ocrData.isExtracting ? "Processando..." : `${progressCount} de ${blueprint.length}`}
            </span>
          </div>
          <Progress value={(progressCount / (blueprint.length || 1)) * 100} className="h-1.5 bg-slate-200" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {blueprint.map((item, idx) => {
          const slot = item.templateId || `temp-${idx}`;
          const files = uploadedFiles[slot] || [];
          const isUploaded = files.length > 0;
          const isMandatory = item.kind === 'mandatory';

          return (
            <Card key={slot} className={`group overflow-hidden border-2 transition-all duration-300 rounded-3xl ${isUploaded ? 'border-emerald-100 bg-emerald-50/20' : 'border-slate-100 bg-white hover:border-primary/20'}`}>
              <div className="flex flex-col md:flex-row">
                <div className="flex-1 p-6 md:p-8">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {isUploaded ? (
                      <Badge className="bg-emerald-500 text-white border-none font-black text-[9px] uppercase px-3 py-1">🟢 Analisado</Badge>
                    ) : (
                      <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] uppercase px-3 py-1">🔵 Documento Mestre</Badge>
                    )}
                    
                    <Badge className="bg-blue-50 text-blue-600 border-none font-black text-[9px] uppercase px-3 py-1 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> IA OCR ATIVO
                    </Badge>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 mb-2 leading-tight uppercase tracking-tight">
                    {item.name}
                  </h3>
                  
                  <p className="text-sm text-slate-500 mb-6 leading-relaxed max-w-lg">
                    Envie este documento para que a IA preencha automaticamente os dados {item.templateId === 'template-id-card' ? 'do cliente' : 'da embarcação'}.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tipos Aceitos</Label>
                      <div className="text-xs font-bold text-slate-700 flex gap-2">
                        {item.fileTypes?.map((t: string) => <span key={t} className="bg-slate-100 px-2 py-0.5 rounded-md">{t}</span>) || 'PDF, JPG, PNG'}
                      </div>
                    </div>
                    {isUploaded && ocrData.confidence > 0 && (
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Confiança IA</Label>
                        <div className="text-xs font-black text-emerald-600 uppercase">Excelente ({Math.round(ocrData.confidence * 100)}%)</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full md:w-80 bg-slate-50/50 border-t md:border-t-0 md:border-l border-slate-100 p-6 md:p-8 flex flex-col justify-center gap-3">
                  {isUploaded ? (
                    <div className="space-y-3 text-center">
                       <div className="h-14 w-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-sm">
                          <CheckCircle2 className="h-8 w-8" />
                       </div>
                       <p className="text-[10px] font-black text-slate-400 uppercase">Leitura Concluída</p>
                       <Button 
                        variant="ghost" 
                        onClick={() => setData({ uploadedFiles: { ...uploadedFiles, [slot]: [] } })}
                        className="w-full text-rose-500 font-bold text-[10px] uppercase hover:bg-rose-50 gap-2"
                       >
                          <Trash2 className="h-4 w-4" /> Substituir
                       </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        <Button className="w-full h-16 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/10 hover:bg-primary/90 gap-3 group/btn overflow-hidden">
                          <Upload className="h-5 w-5 group-hover/btn:-translate-y-1 transition-transform" />
                          📁 Escanear Agora
                          <div className="absolute inset-0 opacity-0 cursor-pointer">
                            <FileUploader 
                              bucket="process-attachments" 
                              category={slot}
                              onSuccess={(res: any) => handleUpload(slot, [res])}
                            />
                          </div>
                        </Button>
                      </div>

                      <Button variant="outline" className="h-14 rounded-2xl bg-white border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-tighter hover:border-primary/30 gap-1 px-2">
                        <Camera className="h-4 w-4 text-primary" /> Tirar Foto
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        
        {!processTypeName && (
           <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-4">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              <p className="text-[11px] font-bold text-blue-700 leading-tight">
                DICA: Você também pode pular esta etapa e preencher manualmente nas próximas telas, mas o uso da IA reduz o tempo de cadastro em 85%.
              </p>
           </div>
        )}
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
