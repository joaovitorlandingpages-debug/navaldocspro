import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { uploadToBucket } from "@/lib/storage";
import { toast } from "sonner";

export interface DocumentField {
  id?: string;
  template_id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  source_type: string;
  source_field?: string;
  required: boolean;
  page_number: number;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  font_size?: number;
  field_options?: any;
  alignment?: string;
  created_at?: string;
}

export interface DocumentTemplate {
  id: string;
  company_id: string | null;
  name: string;
  category: string | null;
  category_id?: string | null;
  document_type_io?: 'in' | 'out';
  ocr_enabled?: boolean;
  process_type: string | null;
  description: string | null;
  template_file_url: string | null;
  fields?: DocumentField[];
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
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user?.id)
        .single();

      let query = supabase
        .from("document_templates")
        .select(`
          *,
          fields:document_fields(*),
          category_details:document_categories(*)
        `);

      if (profile?.role !== 'admin_master') {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query.order("name");

      if (error) throw error;
      return data;
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

        await uploadToBucket("generated-documents", filePath, doc.file);
        fileUrl = filePath; // store path; signed URL is generated on read
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

      // Log the activity
      try {
        await supabase.from("activity_logs").insert({
          company_id: profile.company_id,
          user_id: user.id,
          action: "document_generated",
          description: `Documento "${doc.name}" gerado com sucesso para o cliente.`,
          module: "documents",
          resource_type: "document",
          metadata: { document_name: doc.name }
        });
        console.log("ACTIVITY_LOG_MODULE_FIXED");
      } catch (logErr) {
        console.warn("LOG_FAILURE_SAFE", logErr);
      }

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

  /**
   * Sub-fatia F.2.b — C1 migrado.
   * Delegado ao pipeline canônico (resolveTemplate → RPC → Edge modo novo).
   * Idempotência determinística: mesmos parâmetros → mesma linha; nova versão
   * publicada → nova linha; retry NÃO gera UUID aleatório.
   */
  const generateDocument = useMutation({
    mutationFn: async (payload: {
      templateId: string;
      companyId: string;
      customerId?: string;
      vesselId?: string;
      processId?: string;
      fieldValues: Record<string, any>;
      category?: string | null;
      checklistItemId?: string | null;
      actionIntent?: string;
      regenerationRevision?: number;
    }) => {
      if (!payload.processId) {
        throw new Error("Selecione um processo para gerar o documento.");
      }
      const { limitsEngine } = await import("@/services/limitsEngine");
      const allowed = await limitsEngine.enforce("pdf_generation", 1, payload.companyId);
      if (!allowed) throw new Error("Limite de geração de documentos atingido para o plano atual.");

      const { generateDocumentCanonical } = await import(
        "@/services/documents/canonicalDocumentGeneration"
      );
      const result = await generateDocumentCanonical({
        processId: payload.processId,
        templateId: payload.templateId,
        category: payload.category ?? null,
        customerId: payload.customerId ?? null,
        vesselId: payload.vesselId ?? null,
        checklistItemId: payload.checklistItemId ?? null,
        actionIntent: payload.actionIntent ?? "manual_generate",
        regenerationRevision: payload.regenerationRevision ?? 0,
        fieldValues: payload.fieldValues,
      });

      if (!result.ok) {
        const err = new Error(result.message) as Error & { code?: string };
        err.code = result.error;
        throw err;
      }

      // Consume limit apenas quando a linha é nova (evita cobrar em reused).
      if (!result.reused) {
        await limitsEngine.consume(
          "pdf_generation",
          1,
          { template_id: result.templateId, process_id: payload.processId },
          undefined,
          payload.companyId,
        );
      }
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["generated-documents"] });
      if (result && "ok" in result && result.ok && result.reused) {
        toast.success("Documento já existente reutilizado.");
      } else {
        toast.success("Documento oficial gerado com sucesso!");
      }
    },
    onError: async (error: any, variables: any) => {
      const code: string | undefined = error?.code;
      const friendly: Record<string, string> = {
        no_company: "Sem empresa vinculada — faça login novamente.",
        process_finalized: "Processo finalizado — geração bloqueada.",
        template_not_resolved: "Nenhum modelo padrão encontrado para esta categoria.",
        template_not_published: "Este modelo não possui versão publicada.",
        template_not_found: "Modelo não encontrado ou indisponível.",
        cross_tenant: "Sem permissão para este processo.",
        render_failed: "Falha ao montar o conteúdo do documento.",
        rpc_failed: "Falha ao registrar o documento.",
        edge_failed: "Falha ao gerar o PDF do documento.",
      };
      if (code && friendly[code]) {
        toast.error(friendly[code]);
        return;
      }
      const { handleGenerationError } = await import("@/services/documents/generationErrorHandler");
      const handled = await handleGenerationError(error, { processId: variables?.processId });
      if (!handled) toast.error("Erro na geração do documento.");
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

        await uploadToBucket("document-templates", filePath, template.file);
        fileUrl = filePath;
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

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["document-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: templateFields, isLoading: isLoadingFields } = useQuery({
    queryKey: ["document-fields"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_fields")
        .select("*");

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const upsertTemplateFields = useMutation({
    mutationFn: async ({ templateId, fields }: { templateId: string; fields: any[] }) => {
      // Delete existing fields for this template
      const { error: deleteError } = await supabase
        .from("document_fields")
        .delete()
        .eq("template_id", templateId);

      if (deleteError) throw deleteError;

      if (fields.length === 0) return [];

      const { data, error } = await supabase
        .from("document_fields")
        .insert(
          fields.map(f => ({
            ...f,
            template_id: templateId,
            id: undefined, // Let DB generate ID
          }))
        )
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-fields"] });
      toast.success("Campos do template atualizados!");
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("document_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      toast.success("Template excluído com sucesso!");
    },
  });

  const toggleTemplateActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("document_templates")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
    },
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (id: string) => {
      // 1. Fetch original template
      const { data: original, error: fetchError } = await supabase
        .from("document_templates")
        .select(`*, fields:document_fields(*)`)
        .eq("id", id)
        .single();
      
      if (fetchError) throw fetchError;

      // 2. Create copy
      const { data: copy, error: createError } = await supabase
        .from("document_templates")
        .insert({
          ...original,
          id: undefined,
          name: `${original.name} (Cópia)`,
          created_at: undefined,
          fields: undefined,
          version: 1,
        } as any)
        .select()
        .single();
      
      if (createError) throw createError;

      // 3. Copy fields
      if (original.fields && original.fields.length > 0) {
        const fieldsToInsert = original.fields.map((f: any) => ({
          ...f,
          id: undefined,
          template_id: copy.id,
          created_at: undefined,
        }));
        
        const { error: fieldsError } = await supabase
          .from("document_fields")
          .insert(fieldsToInsert);
        
        if (fieldsError) throw fieldsError;
      }

      return copy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      toast.success("Template duplicado com sucesso!");
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async ({ id, table, is_favorite }: { id: string, table: 'documents' | 'processes' | 'document_templates', is_favorite: boolean }) => {
      const { error } = await supabase
        .from(table as any)
        .update({ is_favorite })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [variables.table === 'document_templates' ? "document-templates" : "generated-documents"] });
      toast.success(variables.is_favorite ? "Adicionado aos favoritos" : "Removido dos favoritos");
    },
  });

  const getSignedUrl = async (bucket: string, path: string) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60); // 1 minute
    if (error) throw error;
    return data.signedUrl;
  };

  return {
    templates,
    isLoadingTemplates,
    templateFields,
    isLoadingFields,
    categories,
    isLoadingCategories,
    generatedDocuments,
    isLoadingGenerated,
    saveGeneratedDocument,
    generateDocument,
    createTemplate,
    upsertTemplateFields,
    deleteTemplate,
    toggleTemplateActive,
    duplicateTemplate,
    toggleFavorite,
    getSignedUrl,
  };
};
