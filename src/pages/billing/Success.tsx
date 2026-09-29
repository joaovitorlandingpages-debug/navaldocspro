import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, LayoutDashboard, Gauge, RefreshCw, 
  ShieldCheck, Clock, FileText, Cpu, HardDrive, Users, 
  ArrowRight, AlertCircle, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function BillingSuccessPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { subscription, refetchSubscription, isLoading: isSubLoading } = useSubscription();

  const [pollCount, setPollCount] = useState(0);
  const [isPolling, setIsPolling] = useState(true);

  // Polling automático para aguardar a confirmação do webhook no banco
  useEffect(() => {
    // Se a assinatura já foi confirmada como ativa ou trialing pelo webhook
    if (subscription?.status === 'active' || subscription?.status === 'trialing') {
      setIsPolling(false);
      return;
    }

    if (pollCount >= 12) {
      // Após ~36 segundos, para o polling automático para não ficar em loop infinito
      setIsPolling(false);
      return;
    }

    const timer = setTimeout(async () => {
      await refetchSubscription();
      setPollCount((prev) => prev + 1);
    }, 3000);

    return () => clearTimeout(timer);
  }, [pollCount, subscription?.status, refetchSubscription]);

  const isConfirmed = subscription?.status === 'active' || subscription?.status === 'trialing';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 antialiased">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-9 text-center space-y-6">
        
        {/* Ícone de Status */}
        {isConfirmed ? (
          <div className="w-20 h-20 bg-emerald-50 border border-emerald-200/80 rounded-3xl flex items-center justify-center mx-auto text-emerald-600 shadow-md">
            <CheckCircle2 size={44} className="stroke-[2.5]" />
          </div>
        ) : (
          <div className="w-20 h-20 bg-blue-50 border border-blue-200/80 rounded-3xl flex items-center justify-center mx-auto text-[#1868db] shadow-md relative">
            <RefreshCw size={38} className="animate-spin text-[#1868db]" />
          </div>
        )}

        {/* Título & Mensagem */}
        <div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge className={`text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full ${
              isConfirmed 
                ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                : "bg-blue-50 text-blue-800 border-blue-200"
            }`}>
              {isConfirmed ? "Assinatura Ativa & Confirmada" : "Aguardando Webhook Seguro"}
            </Badge>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0d2342] tracking-tight">
            {isConfirmed ? "Pagamento Confirmado!" : "Validando seu Pagamento..."}
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            {isConfirmed 
              ? "Sua assinatura foi confirmada pela operadora Stripe e ativada no sistema. Todas as suas franquias já estão disponíveis."
              : "Recebemos o retorno da Stripe e estamos aguardando a confirmação oficial via webhook criptografado para liberar seu plano com total segurança."}
          </p>
        </div>

        {/* Detalhes do Plano Confirmado */}
        {isConfirmed && subscription?.plan && (
          <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl text-left space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Plano Contratado
                </span>
                <span className="text-base font-extrabold text-[#0d2342]">
                  {subscription.plan.name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Cobrança
                </span>
                <span className="text-xs font-bold text-[#1868db]">
                  {subscription.plan.billing_cycle === 'yearly' || subscription.plan.billing_cycle === 'annual'
                    ? "Anual (12 Meses)" 
                    : "Mensal Recorrente"}
                </span>
              </div>
            </div>

            {/* Franquias do Ciclo */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-slate-700">
              <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-100">
                <FileText className="h-4 w-4 text-[#1868db] shrink-0" />
                <div>
                  <span className="font-extrabold block text-[#0d2342]">{subscription.plan.process_limit || 20}</span>
                  <span className="text-[10px] text-slate-400">Processos/mês</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-100">
                <Cpu className="h-4 w-4 text-[#1868db] shrink-0" />
                <div>
                  <span className="font-extrabold block text-[#0d2342]">{subscription.plan.ocr_limit || 200}</span>
                  <span className="text-[10px] text-slate-400">Leituras OCR/mês</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-100">
                <HardDrive className="h-4 w-4 text-[#1868db] shrink-0" />
                <div>
                  <span className="font-extrabold block text-[#0d2342]">{subscription.plan.storage_gb || (subscription.plan as any).storage_limit_gb || 5} GB</span>
                  <span className="text-[10px] text-slate-400">Armazenamento</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center pt-1">
              💡 As franquias renovam todo mês automaticamente e a geração de documentos finais é ilimitada.
            </p>
          </div>
        )}

        {/* Estado de Espera (Aguardando Webhook) */}
        {!isConfirmed && (
          <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs text-blue-900 space-y-2">
            <div className="flex items-center justify-center gap-2 font-bold">
              <Clock className="h-4 w-4 text-[#1868db]" />
              <span>Verificação de Segurança em Andamento</span>
            </div>
            <p className="text-[11px] leading-relaxed text-blue-800">
              Por regra de segurança, a liberação de novos limites ocorre exclusivamente após a confirmação da transação pelo servidor. 
              {isPolling ? " Atualizando automaticamente..." : " Você pode verificar agora ou prosseguir para o painel."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await refetchSubscription();
              }}
              className="mt-1 text-xs font-bold text-blue-700 border-blue-300 hover:bg-blue-100/80 h-8"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Verificar status agora
            </Button>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="space-y-2.5 pt-2">
          <Button 
            className="w-full h-12 bg-[#1868db] hover:bg-[#1557b8] text-white font-bold rounded-xl shadow-md gap-2"
            onClick={() => navigate({ to: '/dashboard' })}
          >
            <span>Ir para o Painel Principal</span>
            <LayoutDashboard size={18} />
          </Button>

          <Button 
            variant="outline"
            className="w-full h-11 border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl gap-2 text-xs"
            onClick={() => navigate({ to: '/consumo' })}
          >
            <Gauge size={16} className="text-[#1868db]" />
            <span>Consultar Consumo e Franquias</span>
          </Button>
        </div>

      </div>
    </div>
  );
}
