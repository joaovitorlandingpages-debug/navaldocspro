import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  billing_cycle: string;
  customer_limit: number | null;
  document_limit: number | null;
  user_limit: number | null;
  ocr_limit: number | null;
  features: string[];

}

export interface Subscription {
  id: string;
  company_id: string;
  plan_id: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'pending';
  mercado_pago_subscription_id?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  plan?: Plan;
}

export const useSubscription = () => {
  console.log("SUBSCRIPTION_OK");

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (error) throw error;
      return data as Plan[];
    },
    enabled: !!user,
  });

  const { data: subscription, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) return null;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, plan:plans(*)")
        .eq("company_id", profile.company_id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data as (Subscription & { plan: Plan }) | null;
    },
    enabled: !!user,
  });

  const createPreference = useMutation({
    mutationFn: async (planId: string) => {
      // Here we would call a Supabase Edge Function to securely interface with Mercado Pago
      // For now, we simulate the checkout session creation
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ planId, origin: window.location.origin })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar checkout');
      }

      return response.json(); // Should return init_point (Mercado Pago URL)
    },
    onSuccess: (data) => {
      if (data.init_point) {
        window.location.href = data.init_point;
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Não foi possível iniciar o pagamento.");
      
      // Fallback for demo/dev if function doesn't exist yet
      toast.info("Ambiente de homologação: Redirecionando para checkout seguro.");
    }
  });

  return {
    plans,
    subscription,
    isLoadingSubscription,
    createPreference
  };
};
