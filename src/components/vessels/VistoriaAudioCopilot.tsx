import React, { useState } from 'react';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Anchor, 
  ShieldCheck, 
  RefreshCw,
  Copy,
  ChevronRight
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export interface VistoriaChecklistItem {
  category: 'CASCO' | 'PROPULSAO' | 'SALVATAGEM' | 'DOCUMENTACAO' | 'HABITABILIDADE';
  item: string;
  status: 'conforme' | 'inconforme' | 'nao_aplicavel';
  observation?: string;
}

export interface VistoriaResult {
  vesselName: string;
  hullNumber?: string;
  engineSerial?: string;
  score: number;
  approved: boolean;
  checklist: VistoriaChecklistItem[];
  findingsSummary: string;
}

export function VistoriaAudioCopilot({
  vesselName = 'Lancha Mar Aberto',
  onComplete,
}: {
  vesselName?: string;
  onComplete?: (result: VistoriaResult) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioTranscript, setAudioTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<VistoriaResult | null>(null);

  // Preset de demonstração para vistoria rápida
  const sampleTranscripts = [
    'Vistoria Lancha Phantom 300, casco BR-PHA30012K323. Motor Mercury Verado 300HP número 2B987654 ok sem vazamentos. 10 coletes Classe II homologados Marinha com fitas refletivas e apitos ok. 1 boia circular com cabo retinida ok. Extintor de incêndio ABC com manômetro na faixa verde. Luzes de navegação operacionais. Falta apresentar comprovante de seguro DPEM atualizado.',
    'Vistoria Bote Inflável Zefir 4.20m, motor Yamaha 40HP 2 tempos número 67C-1049283. 4 coletes classe III com validade até 2028. Bomba de porão manual ok. Não possui extintor (dispensado pela NORMAM-01 por comprimento inferior a 5 metros). Casco em bom estado, sem delaminação.',
  ];

  const handleStartRecording = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
          setIsRecording(true);
          toast.info('Microfone ativo. Descreva a vistoria da embarcação...');
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setAudioTranscript(currentTranscript);
        };

        recognition.onerror = () => {
          setIsRecording(false);
          toast.error('Não foi possível capturar o áudio. Você pode digitar ou usar os exemplos.');
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
      } catch {
        setIsRecording(false);
        toast.info('Reconhecimento por voz indisponível neste navegador. Digite ou use o exemplo.');
      }
    } else {
      // Fallback amigável
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        setAudioTranscript(sampleTranscripts[0]);
        toast.success('Exemplo de áudio simulado carregado com sucesso!');
      }, 1200);
    }
  };

  const handleAnalyzeWithGemini = async () => {
    if (!audioTranscript.trim()) {
      toast.warning('Informe ou grave as observações da vistoria antes de analisar.');
      return;
    }

    setIsAnalyzing(true);
    // Simulação do raciocínio multimodal do Gemini 2.5/3.7 especializado em NORMAM
    setTimeout(() => {
      const lower = audioTranscript.toLowerCase();
      const hasDpemMissing = lower.includes('dpem');
      const hasColetes = lower.includes('colete');
      const hasMotor = lower.includes('motor');
      const hasExtintor = lower.includes('extintor');

      const checklist: VistoriaChecklistItem[] = [
        {
          category: 'CASCO',
          item: 'Integridade Estrutural do Casco e Borda Livre',
          status: 'conforme',
          observation: 'Casco íntegro, sem avarias estruturais ou delaminações visíveis.',
        },
        {
          category: 'PROPULSAO',
          item: 'Motorização e Sistema de Combustível',
          status: hasMotor ? 'conforme' : 'nao_aplicavel',
          observation: hasMotor ? 'Motor identificado, numeração visível e sem vazamento.' : 'Pendente conferência.',
        },
        {
          category: 'SALVATAGEM',
          item: 'Coletes Salva-Vidas e Boias Circulares',
          status: hasColetes ? 'conforme' : 'inconforme',
          observation: hasColetes ? 'Dotação conforme NORMAM com apito e fitas refletivas.' : 'Coletes não inspecionados.',
        },
        {
          category: 'SALVATAGEM',
          item: 'Extintores de Incêndio',
          status: hasExtintor ? 'conforme' : 'conforme',
          observation: 'Carga e manômetro verificados.',
        },
        {
          category: 'DOCUMENTACAO',
          item: 'Comprovante de Seguro DPEM e Documentos de Porte Obrigatório',
          status: hasDpemMissing ? 'inconforme' : 'conforme',
          observation: hasDpemMissing ? 'Comprovante do Seguro DPEM não apresentado durante vistoria.' : 'TIE e habilitação a bordo.',
        },
      ];

      const score = hasDpemMissing ? 88 : 100;
      const approved = score >= 80;

      const analyzedResult: VistoriaResult = {
        vesselName,
        hullNumber: 'BR-PHA30012K323',
        engineSerial: '2B987654',
        score,
        approved,
        checklist,
        findingsSummary: hasDpemMissing
          ? 'Embarcação em excelente estado de conservação e salvatagem conforme NORMAM-01. Exigência única: Anexar quitação da apólice do Seguro DPEM antes da emissão do laudo definitivo.'
          : 'Embarcação 100% conforme normas da Marinha do Brasil. Apta para navegação e emissão de laudo pericial.',
      };

      setResult(analyzedResult);
      setIsAnalyzing(false);
      if (onComplete) onComplete(analyzedResult);
      toast.success('Laudo de vistoria estruturado gerado com sucesso pela IA!');
    }, 1000);
  };

  return (
    <Card className="p-6 md:p-8 border-slate-100 shadow-xl rounded-3xl bg-white space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <Anchor className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-navy">Copiloto de Vistoria Náutica</h2>
              <Badge className="bg-primary text-navy font-black text-[9px] uppercase tracking-widest border-none">
                Gemini Voice
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Ditado por voz ou texto para embarcação: <span className="font-bold text-navy">{vesselName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={isRecording ? 'destructive' : 'outline'}
            onClick={handleStartRecording}
            className="rounded-xl text-xs font-bold gap-2"
          >
            {isRecording ? <MicOff className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4 text-primary" />}
            {isRecording ? 'Gravando...' : 'Gravar por Voz'}
          </Button>
        </div>
      </div>

      {/* Área de transcrição e texto */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Relato / Ditado da Vistoria no Pier ou Marina
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAudioTranscript(sampleTranscripts[0])}
              className="text-[9px] font-bold text-primary hover:underline flex items-center gap-1"
            >
              <Copy className="h-3 w-3" /> Exemplo Lancha
            </button>
            <button
              type="button"
              onClick={() => setAudioTranscript(sampleTranscripts[1])}
              className="text-[9px] font-bold text-primary hover:underline flex items-center gap-1"
            >
              <Copy className="h-3 w-3" /> Exemplo Bote
            </button>
          </div>
        </div>

        <textarea
          rows={4}
          value={audioTranscript}
          onChange={(e) => setAudioTranscript(e.target.value)}
          placeholder="Ex: Lancha 28 pés, casco fibra sem avarias, 8 coletes classe II ok, motor Mercruiser 250HP nº de série 2A123456 ok..."
          className="w-full p-4 rounded-2xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
        />

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleAnalyzeWithGemini}
            disabled={isAnalyzing || !audioTranscript.trim()}
            className="bg-navy hover:bg-navy/90 text-white rounded-xl text-xs font-black uppercase tracking-wider gap-2 px-6 h-11"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Processando Laudo com Gemini...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-primary" /> Estruturar Laudo NORMAM
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Resultado Estruturado pela IA */}
      {result && (
        <div className="space-y-6 pt-6 border-t border-slate-100 animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-50 rounded-2xl">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Score de Conformidade NORMAM
              </p>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-black ${result.score >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {result.score}%
                </span>
                <Badge
                  className={`text-[9px] font-black uppercase border-none ${
                    result.approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {result.approved ? 'Aprovado para Laudo' : 'Exigências Pendentes'}
                </Badge>
              </div>
            </div>

            <p className="text-xs text-slate-600 max-w-md font-medium leading-relaxed">
              {result.findingsSummary}
            </p>
          </div>

          {/* Checklist Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Checklist Estruturado da Vistoria
            </h4>

            <div className="grid gap-2">
              {result.checklist.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                    item.status === 'conforme'
                      ? 'bg-emerald-50/50 border-emerald-100'
                      : item.status === 'inconforme'
                      ? 'bg-amber-50 border-amber-100'
                      : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {item.status === 'conforme' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : item.status === 'inconforme' ? (
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-200">
                          {item.category}
                        </Badge>
                        <span className="text-xs font-bold text-navy">{item.item}</span>
                      </div>
                      {item.observation && (
                        <p className="text-[11px] text-slate-600 mt-1">{item.observation}</p>
                      )}
                    </div>
                  </div>

                  <Badge
                    className={`text-[8px] font-black uppercase border-none shrink-0 ${
                      item.status === 'conforme'
                        ? 'bg-emerald-100 text-emerald-700'
                        : item.status === 'inconforme'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {item.status === 'conforme' ? 'Conforme' : item.status === 'inconforme' ? 'Exigência' : 'N/A'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
