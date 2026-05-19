import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  };
}

export function useOCR() {
  const queryClient = useQueryClient();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["ocr-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ocr_jobs")
        .select(`
          *,
          uploaded_files (
            file_name,
            file_path
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OCRJob[];
    },
  });

  const createJob = useMutation({
    mutationFn: async ({ 
      fileId, 
      companyId, 
      docType 
    }: { 
      fileId: string; 
      companyId: string; 
      docType: string;
    }) => {
      const { data, error } = await supabase
        .from("ocr_jobs")
        .insert({
          uploaded_file_id: fileId,
          company_id: companyId,
          document_type: docType,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      
      // Chamada real para a Edge Function de OCR
      const { error: processError } = await supabase.functions.invoke('process-ocr-document', {
        body: { jobId: data.id }
      });

      if (processError) {
        console.error("Erro ao iniciar OCR:", processError);
        // Atualiza para falha se não conseguir invocar
        await supabase
          .from("ocr_jobs")
          .update({ status: 'failed', error_message: processError.message })
          .eq('id', data.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ocr-jobs"] });
      toast.success("Documento enviado para processamento inteligente!");
    },
  });


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
    createJob,
    updateJobStatus,
  };
}
