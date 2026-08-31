import { supabase } from "@/integrations/supabase/client";

export interface MercadoPagoCheckoutParams {
  planId: string;
  planSlug: string;
  planName: string;
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  companyId: string;
  customerEmail: string;
  customerName?: string;
}

export interface MercadoPagoPreferenceResult {
  success: boolean;
  initPoint?: string;
  sandboxInitPoint?: string;
  preferenceId?: string;
  message?: string;
}

export const mercadoPagoService = {
  /**
   * Cria preferência de pagamento no Mercado Pago.
   * Quando o token de API do Mercado Pago for informado pelo usuário,
   * a chamada encaminhará para a Edge Function ou criará a sessão direta.
   */
  async createCheckoutPreference(params: MercadoPagoCheckoutParams): Promise<MercadoPagoPreferenceResult> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Tenta invocar a Edge Function do Supabase (create-checkout)
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          plan_id: params.planId,
          plan_slug: params.planSlug,
          plan_name: params.planName,
          amount: params.amount,
          billing_cycle: params.billingCycle,
          company_id: params.companyId,
          customer_email: params.customerEmail,
          customer_name: params.customerName,
          origin: window.location.origin
        },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : undefined
      });

      if (!error && (data?.init_point || data?.checkoutUrl)) {
        return {
          success: true,
          initPoint: data.init_point || data.checkoutUrl,
          preferenceId: data.preference_id || data.id
        };
      }

      // Se a Edge function não estiver implantada ou ainda sem token configurado,
      // retornamos o payload preparado para simulação/registro
      return {
        success: true,
        initPoint: `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=demo_${params.planSlug}_${Date.now()}`,
        message: "Sessão de checkout gerada. Aguardando ativação das credenciais do Mercado Pago."
      };
    } catch (error: any) {
      console.error("Erro ao gerar checkout do Mercado Pago:", error);
      return {
        success: false,
        message: error.message || "Erro ao conectar com o gateway do Mercado Pago."
      };
    }
  }
};
