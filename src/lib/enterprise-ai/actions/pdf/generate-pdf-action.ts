import { AIAction, ActionResult, ActionStatus, ConfirmationPolicy } from "../action-types";
import { AIPermission } from "../security/permission-types";
import { supabase } from "@/integrations/supabase/client";
import { generateAndUploadPdf } from "@/utils/pdf-export";
import { renderTemplate } from "@/lib/templates/templateRenderer";

export interface GeneratePdfInput {
  processId: string;
  templateId?: string;
  options?: {
    customContent?: string;
    branding?: "none" | "company" | "client" | "exclusive";
  };
}

export class GeneratePdfAction implements AIAction {
  id = "generate-pdf";
  metadata = {
    actionId: "generate-pdf",
    displayName: "Generate PDF",
    description: "Generate PDF for an existing process.",
    category: "document",
    riskLevel: "LOW" as const,
    requiredPermissions: [AIPermission.PROCESS_READ, AIPermission.DOCUMENT_GENERATE],
    confirmationPolicy: ConfirmationPolicy.LOW,
    dependencies: ["create-process"],
    retryPolicy: {
      maxRetries: 3,
      backoff: "exponential" as const
    },
    estimatedDuration: 5,
    enabled: true,
    supportsRetry: true,
    supportsPlanner: true
  };


  async validate(context: GeneratePdfInput & { companyId: string }): Promise<{ valid: boolean; errors?: string[] }> {
    const { processId, companyId } = context;


    if (!processId) {
      return { valid: false, errors: ["processId is required"] };
    }

    // Validação de existência e tenant via Supabase
    const { data: process, error } = await supabase
      .from("processes")
      .select("id, company_id, status")
      .eq("id", processId)
      .single();

    if (error || !process) {
      return { valid: false, errors: ["Process not found"] };
    }

    if (process.company_id !== companyId) {
      return { valid: false, errors: ["Access denied: Process belongs to another tenant"] };
    }

    return { valid: true };
  }

  async execute(context: GeneratePdfInput & { 
    companyId: string; 
    userId: string; 
    executionId: string;
  }): Promise<ActionResult> {
    const startTime = Date.now();
    const { processId, templateId, options, companyId, userId, executionId } = context;


    try {
      // 1. Buscar dados do processo e cliente para o branding
      const { data: processData, error: processError } = await supabase
        .from("processes")
        .select(`
          id, 
          title,
          customer_id,
          vessel_id,
          customers (name, logo_url),
          companies (name, logo_url)
        `)
        .eq("id", processId)
        .single();

      if (processError || !processData) {
        throw new Error("Failed to fetch process data");
      }

      // 2. Resolver conteúdo (template ou custom)
      let documentName = processData.title || "Documento de Processo";
      let content = options?.customContent || `Relatório de Processo: ${documentName}`;


      if (templateId) {
        const { data: template, error: tplError } = await supabase
          .from("document_templates")
          .select("name, base_content")
          .eq("id", templateId)
          .single();

        if (tplError || !template) {
          throw new Error("Template not found");
        }

        documentName = template.name;
        // Simplificação: no futuro poderíamos buscar variáveis reais do processo aqui
        const rendered = renderTemplate(template.base_content || "", {}, "sample");
        content = rendered.html;
      }

      if (!content) {
        throw new Error("No content provided for PDF generation");
      }

      // 3. Preparar branding
      const brandingMode = options?.branding || "company";
      const branding = {
        mode: brandingMode,
        logoUrl: brandingMode === "company" ? processData.companies?.logo_url : processData.customers?.logo_url,
        companyName: brandingMode === "company" ? processData.companies?.name : processData.customers?.name,
      };

      // 4. Criar registro em generated_documents primeiro para obter o ID
      const { data: genDoc, error: genError } = await supabase
        .from("generated_documents")
        .insert({
          process_id: processId,
          company_id: companyId,
          customer_id: processData.customer_id,
          vessel_id: processData.vessel_id,
          name: documentName,
          content: content,
          status: "draft",
          generated_by: userId,
          metadata: { 
            executionId,
            ai_generated: true 
          }
        })
        .select("id")
        .single();

      if (genError || !genDoc) {
        throw genError || new Error("Failed to create document record");
      }

      // 5. Gerar e fazer upload do PDF
      const { path, signedUrl } = await generateAndUploadPdf({
        name: documentName,
        content: content.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' '), // Stripping HTML for jsPDF basic text support
        processId,
        companyId,
        generatedDocumentId: genDoc.id,
        branding
      });

      // 6. Atualizar URL do arquivo
      await supabase
        .from("generated_documents")
        .update({ 
          generated_file_url: path,
          status: "completed"
        })
        .eq("id", genDoc.id);

      return {
        success: true,
        status: ActionStatus.SUCCESS,
        message: "PDF generated successfully",
        executionId,
        duration: (Date.now() - startTime) / 1000,
        metadata: {
          processId,
          documentId: genDoc.id,
          pdfUrl: signedUrl,
          path,
          userId,
          companyId
        }
      };
    } catch (error: any) {
      return {
        success: false,
        status: ActionStatus.FAILED,
        message: error.message || "Unknown error during PDF generation",
        executionId,
        duration: (Date.now() - startTime) / 1000,
        errors: [error.message]
      };
    }
  }

  async rollback(context: any): Promise<void> {
    // No futuro, deletar o arquivo do storage e o registro do banco
    console.log("Rollback for GeneratePdfAction not yet implemented");
  }
}
