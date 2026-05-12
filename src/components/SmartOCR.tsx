import { useState, useEffect } from "react";
import { FileText, Search, CheckCircle2, Loader2, Upload, AlertCircle } from "lucide-react";

export function SmartOCR() {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<any>(null);

  const startSimulation = () => {
    setStatus('uploading');
    setProgress(0);
  };

  useEffect(() => {
    if (status === 'uploading') {
      const timer = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            clearInterval(timer);
            setStatus('processing');
            return 100;
          }
          return p + 5;
        });
      }, 50);
      return () => clearInterval(timer);
    }

    if (status === 'processing') {
      const timer = setTimeout(() => {
        setStatus('done');
        setExtractedData({
          name: "RICARDO ALMEIDA FERREIRA",
          docNumber: "029.341.284-90",
          expiry: "15/10/2028",
          category: "ARRAIS AMADOR",
          vessel: "PHOENIX III - PR-2024",
          confidence: "98.4%"
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden max-w-2xl mx-auto">
      <div className="bg-navy p-6 text-white flex justify-between items-center">
        <div>
          <h3 className="font-bold flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" /> OCR Inteligente NavalDocs
          </h3>
          <p className="text-slate-400 text-xs mt-1">Extração automática de dados via Visão Computacional</p>
        </div>
        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
      </div>

      <div className="p-8">
        {status === 'idle' && (
          <div 
            onClick={startSimulation}
            className="border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center hover:border-primary/50 hover:bg-slate-50 transition-all cursor-pointer group"
          >
            <div className="h-20 w-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-primary/10 transition-all">
              <Upload className="h-10 w-10 text-slate-400 group-hover:text-primary" />
            </div>
            <h4 className="font-bold text-navy text-xl mb-2">Arraste seu documento aqui</h4>
            <p className="text-slate-500 text-sm">Suporta PDF, PNG, JPG (CNH, RG, TIE, Documentos de Embarcação)</p>
            <button className="mt-8 bg-primary text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 shadow-lg shadow-primary/20">Selecionar Arquivo</button>
          </div>
        )}

        {(status === 'uploading' || status === 'processing') && (
          <div className="py-12 text-center space-y-6">
            <div className="relative h-32 w-32 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
              <div 
                className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" 
                style={{ animationDuration: status === 'uploading' ? '2s' : '0.5s' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <FileText className="h-10 w-10 text-primary animate-pulse" />
              </div>
            </div>
            <div>
              <h4 className="font-bold text-navy text-xl mb-1">
                {status === 'uploading' ? 'Fazendo Upload...' : 'Analisando Documento...'}
              </h4>
              <p className="text-slate-500 text-sm animate-pulse">
                {status === 'uploading' ? `Processando fragmentos (${progress}%)` : 'Identificando campos e metadados...'}
              </p>
            </div>
            <div className="max-w-xs mx-auto h-2 bg-slate-100 rounded-full overflow-hidden">
               <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {status === 'done' && extractedData && (
          <div className="animate-in zoom-in-95 duration-500">
             <div className="flex items-center gap-4 p-4 bg-green-50 rounded-2xl border border-green-100 mb-8">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                <div>
                   <p className="text-sm font-bold text-green-800">Extração Concluída com Sucesso</p>
                   <p className="text-xs text-green-600">Confiança média: {extractedData.confidence}</p>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-6">
                {Object.entries(extractedData).filter(([k]) => k !== 'confidence').map(([key, value]: any) => (
                  <div key={key} className="space-y-1 group">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        {key === 'name' ? 'Nome Completo' : 
                         key === 'docNumber' ? 'CPF / Identidade' : 
                         key === 'expiry' ? 'Vencimento' : 
                         key === 'category' ? 'Categoria' : 'Embarcação Vinculada'}
                        <CheckCircle2 className="h-3 w-3 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                     </label>
                     <div className="p-3 bg-slate-50 rounded-xl border border-transparent hover:border-primary/20 hover:bg-white transition-all font-bold text-navy">
                        {value}
                     </div>
                  </div>
                ))}
             </div>

             <div className="mt-10 flex gap-3">
                <button 
                  onClick={() => setStatus('idle')}
                  className="flex-grow bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Novo Scan
                </button>
                <button className="flex-grow bg-primary text-white py-3 rounded-xl font-bold hover:opacity-90 shadow-lg shadow-primary/20">
                  Confirmar e Salvar
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
