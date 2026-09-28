import React from 'react';
import { XCircle, RefreshCw, MessageCircle, ArrowLeft, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from '@tanstack/react-router';

export default function BillingFailurePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 antialiased">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-9 text-center space-y-6">
        
        <div className="w-20 h-20 bg-rose-50 border border-rose-200/80 rounded-3xl flex items-center justify-center mx-auto text-rose-600 shadow-md">
          <XCircle size={44} className="stroke-[2.5]" />
        </div>

        <div>
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full mb-2">
            Pagamento não concluído
          </Badge>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0d2342] tracking-tight">
            Checkout Cancelado ou Recusado
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
            A transação no Stripe Checkout foi cancelada ou a operadora do cartão não autorizou a cobrança. 
            Nenhum valor foi debitado da sua conta.
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-600 text-left space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <span>O que você pode fazer:</span>
          </div>
          <ul className="text-[11px] text-slate-500 space-y-1 list-disc pl-4">
            <li>Tentar novamente com o mesmo ou outro cartão de crédito;</li>
            <li>Escolher outro ciclo de cobrança ou plano;</li>
            <li>Verificar se o cartão possui limite ou liberação para compras online.</li>
          </ul>
        </div>

        <div className="space-y-2.5 pt-2">
          <Button 
            className="w-full h-12 bg-[#1868db] hover:bg-[#1557b8] text-white font-bold rounded-xl shadow-md gap-2"
            onClick={() => navigate({ to: '/plans' })}
          >
            <span>Escolher Plano / Tentar Novamente</span>
            <RefreshCw size={16} />
          </Button>

          <Button 
            variant="outline"
            className="w-full h-11 border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl gap-2 text-xs"
            onClick={() => navigate({ to: '/dashboard' })}
          >
            <ArrowLeft size={16} />
            <span>Voltar ao Painel</span>
          </Button>
        </div>

      </div>
    </div>
  );
}
