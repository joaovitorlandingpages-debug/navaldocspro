import { supabase } from "@/integrations/supabase/client";

export interface CreateStripeCheckoutParams {
  planSlug: string;
  billingCycle: "monthly" | "annual";
  companyId?: string;
  origin?: string;
}

export interface StripeCheckoutResult {
  success: boolean;
  url?: string;
  sessionId?: string;
  pendingConfiguration?: boolean;
  message?: string;
}

export const stripeCheckoutService = {
  /**
   * Invoca a Edge Function stripe-checkout de forma segura.
   * Não simula IDs e não realiza bypass.
   * Se faltarem credenciais da Stripe, retorna status explícito de 'pendingConfiguration'.
   */
  async createCheckoutSession(params: CreateStripeCheckoutParams): Promise<StripeCheckoutResult> {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "https://navaldocspro.com.br";
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : undefined;

      const response = await supabase.functions.invoke("stripe-checkout", {
        body: {
          planSlug: params.planSlug,
          billingCycle: params.billingCycle,
          companyId: params.companyId,
          origin
        },
        headers
      });

      if (response.error) {
        const errorData = response.data || {};
        if (errorData.error === "stripe_not_configured" || response.error.message?.includes("503")) {
          return {
            success: false,
            pendingConfiguration: true,
            message: "A integração Stripe está com 'Configuração pendente' (STRIPE_SECRET_KEY não configurada no servidor seguro). Checkouts reais estão bloqueados até o preenchimento da chave."
          };
        }
        return {
          success: false,
          message: errorData.message || response.error.message || "Erro ao gerar checkout na Stripe."
        };
      }

      if (response.data?.url) {
        return {
          success: true,
          url: response.data.url,
          sessionId: response.data.sessionId
        };
      }

      return {
        success: false,
        message: "Resposta inesperada do servidor de checkout."
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Falha na comunicação com o backend de checkout."
      };
    }
  }
};
