import React from 'react';
import { CheckCircle2, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@tanstack/react-router';

const Success = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={48} className="text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Pagamento Aprovado!</h1>
        <p className="text-slate-600 mb-8">
          Sua assinatura foi ativada com sucesso. Agora você tem acesso total aos recursos do seu novo plano.
        </p>
        <div className="space-y-3">
          <Button 
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            onClick={() => navigate({ to: '/dashboard' })}
          >
            Ir para Dashboard
            <LayoutDashboard size={18} className="ml-2" />
          </Button>
          <Button 
            variant="outline"
            className="w-full h-12 border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={() => navigate({ to: '/billing/subscription' })}
          >
            Ver detalhes da assinatura
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Success;
