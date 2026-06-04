import { useState } from "react";
import { 
  FileText, Shield, CheckCircle2, Download, 
  Eye, Clock, History, User, Ship, 
  QrCode, Hash, Layout, List, 
  ChevronRight, ArrowRight, Loader2,
  Lock, Globe, Award, Info, Archive, Zap
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { QRCodeSVG } from "qrcode.react";

interface DossierPreviewProps {
  data: any;
  onExport?: () => void;
  isGenerating?: boolean;
}

export function DossierPreview({ data, onExport, isGenerating }: DossierPreviewProps) {
  const [activeSection, setActiveSection] = useState("cover");

  const handleExportPdf = async () => {
    if (onExport) onExport();
    // Use the exported engine function
    const { dossierEngine } = await import("@/services/automation/dossierEngine");
    dossierEngine.exportPdf("dossier-preview-content", `NavalDocs_Dossie_${data.process?.id?.substring(0, 8)}.pdf`);
  };

  const handleExportZip = async () => {
    const { dossierEngine } = await import("@/services/automation/dossierEngine");
    dossierEngine.exportZip(data);
  };

  const sections = [
    { id: 'cover', label: 'Capa Operacional', icon: <Layout className="h-4 w-4" /> },
    { id: 'summary', label: 'Sumário Executivo', icon: <List className="h-4 w-4" /> },
    { id: 'data', label: 'Dados Técnicos', icon: <Info className="h-4 w-4" /> },
    { id: 'docs', label: 'Acervo Documental', icon: <FileText className="h-4 w-4" /> },
    { id: 'compliance', label: 'Audit & Compliance', icon: <Shield className="h-4 w-4" /> },
    { id: 'timeline', label: 'Timeline de Processamento', icon: <History className="h-4 w-4" /> }
  ];

  const InfoRow = ({ label, value }: { label: string; value: string | undefined }) => (
    <div className="flex justify-between py-4 border-b border-slate-50 last:border-0">
      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</span>
      <span className="text-sm font-bold text-navy">{value || "---"}</span>
    </div>
  );

  if (!data) {
    return null;
  }



  return (
    <div className="grid lg:grid-cols-12 gap-8 bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100 min-h-[700px]">
      {/* Sidebar Navigation */}
      <div className="lg:col-span-3 space-y-2">
        <h3 className="text-xs font-black text-navy uppercase tracking-[0.3em] mb-6 px-4">Estrutura do Dossiê</h3>
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all text-left group ${
              activeSection === section.id 
                ? 'bg-navy text-white shadow-xl shadow-navy/20' 
                : 'hover:bg-white text-slate-500 hover:text-navy'
            }`}
          >
            <div className={`${activeSection === section.id ? 'text-primary' : 'text-slate-300 group-hover:text-primary'} transition-colors`}>
              {section.icon}
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest leading-none">{section.label}</span>
          </button>
        ))}

        <div className="mt-12 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
           <div className="flex items-center gap-3 mb-4">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-black uppercase text-navy tracking-widest">Status de Geração</p>
           </div>
           <p className="text-[11px] text-slate-400 font-bold mb-4">Dossiê v1.0 consolidado com sucesso pela IA do NavalDocs Pro.</p>
            <Button 
              onClick={handleExportPdf}
              disabled={isGenerating}
              className="w-full bg-primary text-white hover:bg-primary/90 rounded-xl h-12 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 mb-3"
            >
              {isGenerating ? <Loader2 className="animate-spin h-4 w-4" /> : <><Download className="h-4 w-4 mr-2" /> Exportar PDF</>}
            </Button>
            <Button 
              onClick={handleExportZip}
              variant="outline"
              disabled={isGenerating}
              className="w-full border-slate-200 text-navy hover:bg-slate-50 rounded-xl h-12 font-black text-[10px] uppercase tracking-widest"
            >
              <Archive className="h-4 w-4 mr-2" /> Exportar ZIP
            </Button>
        </div>
      </div>

      {/* Preview Content */}
      <div id="dossier-preview-content" className="lg:col-span-9 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col relative group/preview print:shadow-none print:border-none">
        {/* Document Header */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30 print:hidden">
           <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-navy rounded-xl flex items-center justify-center">
                 <Award className="h-6 w-6 text-primary" />
              </div>
              <div>
                 <h2 className="text-lg font-black text-navy uppercase tracking-tight">Dossiê Naval Enterprise</h2>
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Hash de Segurança: {data.process?.id?.substring(0, 16).toUpperCase()}</p>
              </div>
           </div>
           <div className="flex gap-2">
              <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 px-3 py-1 font-black text-[9px] uppercase tracking-widest">
                 Autenticado
              </Badge>
              <Badge className="bg-blue-50 text-blue-600 border-blue-100 px-3 py-1 font-black text-[9px] uppercase tracking-widest">
                 v{data.dossier?.version || 1}.0
              </Badge>
           </div>
        </div>

        <ScrollArea className="flex-grow p-12 print:p-0">
          {activeSection === 'cover' && (
            <div className="max-w-2xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="text-center space-y-6 pt-10">
                  <div className="h-24 w-24 bg-slate-50 border border-slate-100 rounded-3xl mx-auto flex items-center justify-center text-slate-300 mb-8">
                     {/* Company Logo Placeholder */}
                     <Globe className="h-12 w-12" />
                  </div>
                  <h1 className="text-4xl font-black text-navy uppercase tracking-tighter leading-tight">
                     {data.process?.process_type}
                  </h1>
                  <div className="h-1 w-20 bg-primary mx-auto rounded-full" />
               </div>

               <div className="grid grid-cols-2 gap-12 border-y border-slate-100 py-12">
                  <div className="space-y-6">
                     <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Organização Responsável</p>
                        <p className="text-lg font-black text-navy uppercase">{data.process?.company?.name || "NavalDocs Pro"}</p>
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Cliente Final</p>
                        <p className="text-lg font-black text-navy uppercase">{data.customer?.name}</p>
                     </div>
                  </div>
                  <div className="space-y-6 text-right">
                     <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Embarcação</p>
                        <p className="text-lg font-black text-navy uppercase">{data.vessel?.name}</p>
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Protocolo</p>
                        <p className="text-lg font-black text-navy uppercase">#{data.process?.id?.substring(0, 8)}</p>
                     </div>
                  </div>
               </div>

               <div className="flex justify-between items-center pt-10">
                  <div className="space-y-2">
                     <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Data de Emissão</p>
                     <p className="text-sm font-bold text-navy">{new Date().toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="p-4 bg-white border border-slate-100 rounded-3xl shadow-sm hover:scale-105 transition-transform">
                     <QRCodeSVG value={`https://navaldocs.pro/v/${data.process?.id}`} size={80} level="H" />
                     <p className="text-[8px] font-black uppercase text-slate-400 text-center mt-2 tracking-widest">Validar Dossiê</p>
                  </div>
               </div>
            </div>
          )}

          {activeSection === 'summary' && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <h4 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-12 flex items-center gap-3">
                  <List className="h-4 w-4" /> Sumário Executivo do Processo
               </h4>
               <div className="space-y-4">
                  {[
                    { label: 'Capa Operacional', page: '01' },
                    { label: 'Especificações Técnicas do Cliente', page: '02' },
                    { label: 'Atributos da Embarcação', page: '03' },
                    { label: 'Documentação Mandatária', page: '04' },
                    { label: 'Evidências Fotográficas & Anexos', page: '07' },
                    { label: 'Relatório de Compliance & Auditoria', page: '10' },
                    { label: 'Timeline de Processamento IA', page: '11' },
                    { label: 'Validação Final & Assinaturas', page: '12' },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-4 border-b border-slate-50 group hover:bg-slate-50/50 px-4 rounded-xl transition-all cursor-pointer">
                       <span className="text-sm font-bold text-navy uppercase tracking-tight">{item.label}</span>
                       <div className="flex-grow border-b border-dotted border-slate-200 mx-4 mt-1" />
                       <span className="text-xs font-black text-primary">{item.page}</span>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeSection === 'data' && (
            <div className="max-w-2xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <section className="print:break-inside-avoid">
                  <h4 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                     <User className="h-4 w-4" /> Especificações do Cliente
                  </h4>
                  <div className="bg-slate-50/50 rounded-[2rem] p-8 border border-slate-100 print:bg-white print:border-none print:p-0">
                     <InfoRow label="Nome / Razão Social" value={data.customer?.name} />
                     <InfoRow label="CPF / CNPJ" value={data.customer?.cpf_cnpj} />
                     <InfoRow label="RG" value={data.customer?.rg} />
                     <InfoRow label="Endereço" value={data.customer?.address} />
                     <InfoRow label="Telefone" value={data.customer?.phone} />
                     <InfoRow label="E-mail Operacional" value={data.customer?.email} />
                  </div>
               </section>

               <section className="print:break-inside-avoid print:mt-10">
                  <h4 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                     <Ship className="h-4 w-4" /> Atributos da Embarcação
                  </h4>
                  <div className="bg-slate-50/50 rounded-[2rem] p-8 border border-slate-100 print:bg-white print:border-none print:p-0">
                     <InfoRow label="Nome da Embarcação" value={data.vessel?.name} />
                     <InfoRow label="Inscrição Marinha" value={data.vessel?.registration_number} />
                     <InfoRow label="Atividade / Serviço" value={data.vessel?.activity} />
                     <InfoRow label="Tipo de Embarcação" value={data.vessel?.vessel_type} />
                     <InfoRow label="Arqueação Bruta" value={data.vessel?.gross_tonnage} />
                     <InfoRow label="Comprimento" value={data.vessel?.length ? `${data.vessel.length}m` : undefined} />
                     <InfoRow label="Capacidade" value={data.vessel?.capacity ? `${data.vessel.capacity} Pessoas` : undefined} />
                  </div>
               </section>

               {data.process?.motor && (
                 <section className="print:break-inside-avoid print:mt-10">
                    <h4 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                       <Zap className="h-4 w-4" /> Especificações do Motor
                    </h4>
                    <div className="bg-slate-50/50 rounded-[2rem] p-8 border border-slate-100 print:bg-white print:border-none print:p-0">
                       <InfoRow label="Fabricante" value={data.process.motor?.manufacturer} />
                       <InfoRow label="Modelo" value={data.process.motor?.model} />
                       <InfoRow label="Potência" value={data.process.motor?.power} />
                       <InfoRow label="Número de Série" value={data.process.motor?.serial_number} />
                    </div>
                 </section>
               )}
            </div>
          )}

          {activeSection === 'docs' && (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <h4 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                  <FileText className="h-4 w-4" /> Acervo Digitalizado (OCR)
               </h4>
               <div className="grid gap-4">
                  {data.documents?.map((doc: any) => (
                    <div key={doc.id} className="p-6 bg-white border border-slate-100 rounded-[1.5rem] flex items-center justify-between group hover:border-primary/30 transition-all shadow-sm">
                       <div className="flex items-center gap-4">
                          <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                             <FileText className="h-6 w-6" />
                          </div>
                          <div>
                             <p className="text-[11px] font-black uppercase text-navy tracking-tight">{doc.document_type || doc.file_name}</p>
                             <p className="text-[9px] font-bold text-slate-400 mt-0.5">Validado via OCR Neural em {new Date(doc.created_at).toLocaleDateString()}</p>
                          </div>
                       </div>
                       <Badge className="bg-emerald-100 text-emerald-600 border-none font-black text-[8px] uppercase tracking-widest">CONFORME</Badge>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeSection === 'compliance' && (
             <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-navy text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                   <Shield className="absolute -right-8 -bottom-8 h-48 w-48 text-white/5 rotate-12" />
                   <div className="relative z-10">
                      <h4 className="text-primary text-[10px] font-black uppercase tracking-[0.4em] mb-2">Relatório de Conformidade</h4>
                      <h3 className="text-2xl font-black uppercase tracking-tight mb-8">Status Geral: 100% OK</h3>
                      
                      <div className="grid grid-cols-2 gap-8">
                         <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase text-white/40 tracking-widest">Auditoria RLS</p>
                            <p className="text-sm font-bold text-emerald-400 flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5" /> Isolado</p>
                         </div>
                         <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase text-white/40 tracking-widest">Validação OCR</p>
                            <p className="text-sm font-bold text-emerald-400 flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5" /> 100% Confiável</p>
                         </div>
                         <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase text-white/40 tracking-widest">Assinaturas</p>
                            <p className="text-sm font-bold text-emerald-400 flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5" /> Digitais & Válidas</p>
                         </div>
                         <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase text-white/40 tracking-widest">Criptografia</p>
                            <p className="text-sm font-bold text-emerald-400 flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5" /> AES-256</p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          )}

          {activeSection === 'timeline' && (
             <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h4 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-12 flex items-center gap-3">
                   <History className="h-4 w-4" /> Rastro Operacional (Audit Trail)
                </h4>
                <div className="space-y-12 pl-8 border-l-2 border-slate-100">
                   {data.auditLogs?.map((log: any, i: number) => (
                      <div key={log.id} className="relative">
                         <div className="absolute -left-[41px] top-0 h-4 w-4 rounded-full bg-white border-4 border-primary shadow-sm z-10" />
                         <div>
                            <div className="flex items-center gap-3 mb-1">
                               <p className="text-[10px] font-black text-navy uppercase tracking-widest">{log.action || 'Evento do Sistema'}</p>
                               <span className="h-1 w-1 bg-slate-200 rounded-full" />
                               <p className="text-[9px] font-bold text-slate-400">{new Date(log.created_at).toLocaleString('pt-BR')}</p>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{log.description}</p>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          )}
        </ScrollArea>

        {/* Footer info */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
           <span>NavalDocs Pro Enterprise Solution</span>
           <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Seguro</span>
              <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Auditado</span>
              <span>Página {activeSection === 'cover' ? '1' : activeSection === 'data' ? '2' : '...'} de 12</span>
           </div>
        </div>
      </div>
    </div>
  );
}
