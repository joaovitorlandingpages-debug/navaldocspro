import React from 'react';
import { XCircle, RefreshCw, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@tanstack/react-router';

const Failure = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle size={48} className="text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Ops! Algo deu errado</h1>
        <p className="text-slate-600 mb-8">
          Não conseguimos processar o seu pagamento. Por favor, tente novamente ou entre em contato com nosso suporte.
        </p>
        <div className="space-y-3">
          <Button 
            className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-semibold"
            onClick={() => navigate({ to: '/billing/plans' })}
          >
            Tentar Novamente
            <RefreshCw size={18} className="ml-2" />
          </Button>
          <Button 
            variant="outline"
            className="w-full h-12 border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={() => window.open('mailto:suporte@navaldocs.pro')}
          >
            Falar com Suporte
            <MessageCircle size={18} className="ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Failure;
