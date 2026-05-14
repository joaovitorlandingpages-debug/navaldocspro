import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface DocumentTemplate {
  id: string;
  company_id: string | null;
  name: string;
  category: string;
  process_type: string | null;
  description: string | null;
  template_file_url: string | null;
  fields_config: any[];
  version: number;
  is_active: boolean;
  created_at: string;
}

export interface GeneratedDocument {
  id: string;
  company_id: string;
  process_id: string | null;
  customer_id: string | null;
  vessel_id: string | null;
  template_id: string | null;
  name: string;
  generated_file_url: string | null;
  status: string;
  generated_by: string;
  metadata: any;
  created_at: string;
}

export const useDocuments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ["document-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as DocumentTemplate[];
    },
    enabled: !!user,
  });

  const { data: generatedDocuments, isLoading: isLoadingGenerated } = useQuery({
    queryKey: ["generated-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_documents")
        .select(`
          *,
          customer:customers(name),
          vessel:vessels(name),
          template:document_templates(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const saveGeneratedDocument = useMutation({
    mutationFn: async (doc: Partial<GeneratedDocument> & { file?: File }) => {
      if (!user) throw new Error("Not authenticated");

      // Get user's profile to get company_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("Company not found");

      let fileUrl = doc.generated_file_url;

      if (doc.file) {
        const fileExt = doc.file.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${profile.company_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("generated-documents")
          .upload(filePath, doc.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("generated-documents")
          .getPublicUrl(filePath);
        
        fileUrl = publicUrl;
      }

      const { data, error } = await supabase
        .from("generated_documents")
        .insert({
          ...doc,
          company_id: profile.company_id,
          generated_by: user.id,
          generated_file_url: fileUrl,
          file: undefined, // Remove file object before DB insert
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generated-documents"] });
      toast.success("Documento salvo com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao salvar documento: ${error.message}`);
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Partial<DocumentTemplate> & { file?: File }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("Company not found");

      let fileUrl = template.template_file_url;

      if (template.file) {
        const fileExt = template.file.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${profile.company_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("document-templates")
          .upload(filePath, template.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("document-templates")
          .getPublicUrl(filePath);
        
        fileUrl = publicUrl;
      }

      const { data, error } = await supabase
        .from("document_templates")
        .insert({
          ...template,
          company_id: profile.company_id,
          template_file_url: fileUrl,
          file: undefined,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      toast.success("Template criado com sucesso!");
    },
  });

  return {
    templates,
    isLoadingTemplates,
    generatedDocuments,
    isLoadingGenerated,
    saveGeneratedDocument,
    createTemplate,
  };
};
