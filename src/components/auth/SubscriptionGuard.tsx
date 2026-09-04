import React from "react";
import { Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, CreditCard, ShieldAlert, ArrowRight } from "lucide-react";

interface SubscriptionGuardProps {
  children?: React.ReactNode;
  allowReadOnly?: boolean;
}

/**
 * Route Guard para proteção de rotas operacionais (/ordens, /orcamentos, /estoque, /processes, etc.).
 * Verifica se a oficina possui uma assinatura ativa, período de trial válido ou bypass de homologação.
 */
export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({
  children,
  allowReadOnly = false,
}) => {
  const { user, loading: authLoading } = useAuth();
  const {
    subscription,
    isLoadingSubscription,
    isTrial,
    isTrialExpired,
    canCreate,
    isInGracePeriod,
  } = useSubscription();

  if (authLoading || isLoadingSubscription) {
    return (
      <div className="min-h-[50vh] w-full flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
          Verificando plano e status da oficina...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" search={{ redirect: window.location.pathname }} />;
  }

  // 1. Acesso liberado se canCreate for verdadeiro (vitalício, homologação, plano ativo ou trial válido)
  if (canCreate || isInGracePeriod) {
    return <>{children}</>;
  }

  // 2. Se permitir somente leitura e não estiver completamente bloqueado
  if (allowReadOnly && !isTrialExpired) {
    return <>{children}</>;
  }

  // 3. Bloqueio operacional: Trial expirado ou assinatura inativa
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-amber-500/30 bg-card shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <Sparkles className="w-7 h-7 text-amber-500" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Assinatura ou Trial Expirado
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            O período de testes da sua oficina foi concluído. Para continuar emitindo ordens de
            serviço, orçamentos e gerando documentos sem limites, ative o seu plano.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Acesso Operacional Protegido
            </p>
            <p>
              Seus dados, clientes e histórico continuam salvos com segurança. Escolha um plano
              mensal ou anual para reativar o acesso imediato.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button asChild className="w-full bg-primary hover:bg-primary/90 text-white font-medium">
              <Link to="/billing/subscription">
                <CreditCard className="w-4 h-4 mr-2" />
                Ver Planos e Ativar
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/dashboard">Voltar ao Painel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
