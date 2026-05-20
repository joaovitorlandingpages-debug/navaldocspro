import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DocumentAutomationEngine } from "@/services/automation/documentAutomationEngine";

export interface OCRJob {
  id: string;
  company_id: string;
  uploaded_file_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reviewed';
  extracted_data: any;
  confidence_score: number;
  processing_time: number;
  document_type: string;
  identified_document_type?: string;
  comparison_data?: any;
  suggested_actions?: any[];
  is_applied?: boolean;
  applied_at?: string;
  error_message?: string;
  created_at: string;
  uploaded_files?: {
    file_name: string;
    file_path: string;
    process_id?: string;
  };
}

export function useOCR(processId?: string) {
  const queryClient = useQueryClient();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["ocr-jobs", processId],
    queryFn: async () => {
      let query = supabase
        .from("ocr_jobs")
        .select(`
          *,
          uploaded_files!inner (
            file_name,
            file_path,
            process_id
          )
        `);
      
      if (processId) {
        query = query.eq('uploaded_files.process_id', processId);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return data as OCRJob[];
    },
  });

  const createBatchJobs = useMutation({
    mutationFn: async ({ 
      files, 
      companyId, 
      docType 
    }: { 
      files: { file: File, id: string }[]; 
      companyId: string; 
      docType: string;
    }) => {
      console.log("OCR_UPLOAD_OK", files.length);
      const results = [];
      
      for (const fileObj of files) {
        const { data, error } = await supabase
          .from("ocr_jobs")
          .insert({
            uploaded_file_id: fileObj.id,
            company_id: companyId,
            document_type: docType,
            status: 'pending'
          })
          .select()
          .single();

        if (error) throw error;
        
        console.log("OCR_PROCESSING_OK", data.id);
        
        // Invoke edge function asynchronously
        supabase.functions.invoke('process-ocr-document', {
          body: { jobId: data.id }
        }).catch((err: any) => console.error("OCR Trigger Error:", err));
        
        results.push(data);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ocr-jobs"] });
      toast.success("Lote enviado para processamento inteligente!");
    },
  });

  const applyOCRData = useMutation({
    mutationFn: async ({ jobId, data, type }: { jobId: string, data: any, type: string }) => {
      console.log("OCR_AUTOFILL_OK", type);
      
      const { error } = await supabase
        .from("ocr_jobs")
        .update({ 
          status: 'reviewed',
          is_applied: true,
          applied_at: new Date().toISOString(),
          extracted_data: data
        })
        .eq("id", jobId);

      if (error) throw error;

      // Auto-trigger re-analysis and checklist update
      await DocumentAutomationEngine.processOCRExtraction(jobId);
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ocr-jobs"] });
      toast.success("Dados sincronizados com sucesso!");
    },
  });

  // Alias for backward compatibility
  const updateJobStatus = useMutation({
    mutationFn: async ({ jobId, status, extractedData }: { jobId: string; status: string; extractedData?: any }) => {
      const updateData: any = { status };
      if (extractedData) updateData.extracted_data = extractedData;
      
      const { error } = await supabase
        .from("ocr_jobs")
        .update(updateData)
        .eq("id", jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ocr-jobs"] });
    },
  });

  return {
    jobs,
    isLoading,
    createBatchJobs,
    applyOCRData,
    updateJobStatus,
  };
}
