import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { DigitalSignature } from "@/types/document";

export const useSignatures = (documentId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: signatures, isLoading } = useQuery({
    queryKey: ["digital-signatures", documentId],
    queryFn: async () => {
      let query = supabase
        .from("digital_signatures")
        .select("*")
        .order("signed_at", { ascending: false });

      if (documentId) {
        query = query.eq("document_id", documentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DigitalSignature[];
    },
    enabled: !!user,
  });

  const signDocument = useMutation({
    mutationFn: async (signature: Omit<DigitalSignature, 'id' | 'signed_at' | 'is_valid' | 'verification_hash'>) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Company not found");

      const verificationHash = btoa(JSON.stringify({
        ...signature,
        timestamp: Date.now(),
        salt: Math.random()
      })).substring(0, 32);

      const { data, error } = await supabase
        .from("digital_signatures")
        .insert({
          ...signature,
          company_id: profile.company_id,
          signed_at: new Date().toISOString(),
          is_valid: true,
          verification_hash: verificationHash,
          ip_address: "127.0.0.1", // In real scenario, get from API
          user_agent: window.navigator.userAgent
        })
        .select()
        .single();

      if (error) throw error;

      // Update generated_documents status
      await supabase
        .from("generated_documents")
        .update({ status: 'signed' })
        .eq("id", signature.document_id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["digital-signatures"] });
      queryClient.invalidateQueries({ queryKey: ["generated-documents"] });
      toast.success("Documento assinado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao assinar: ${error.message}`);
    }
  });

  return {
    signatures,
    isLoading,
    signDocument
  };
};