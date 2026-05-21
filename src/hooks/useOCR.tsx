import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OCRJob {
  id: string;
  company_id: string;
  file_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reviewed';
  document_type: string | null;
  identified_document_type: string | null;
  extracted_data: any;
  confidence_score: number | null;
  is_applied: boolean;
  applied_at: string | null;
  metadata: any;
  created_at: string;
  uploaded_files?: any;
  suggested_actions?: any[];
  comparison_data?: any;
}

export const useOCR = () => {
  const queryClient = useQueryClient();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["ocr-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ocr_jobs")
        .select("*, uploaded_files(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OCRJob[];
    },
  });

  const createBatchJobs = useMutation({
    mutationFn: async ({ files, companyId, docType }: { files: any[], companyId: string, docType: string }) => {
      console.log("OCR_UPLOAD_OK", files.length);

      // Check Plan Limits before processing
      const { data: usage } = await supabase.from('usage_metrics').select('ocr_usage').eq('company_id', companyId).maybeSingle();
      const { data: sub } = await supabase.from('subscriptions').select('*, plan:plans(*)').eq('company_id', companyId).maybeSingle();
      
      const limit = sub?.plan?.ocr_limit || 10;
      const current = usage?.ocr_usage || 0;
      
      if (current + files.length > limit) {
          toast.error(`Limite de OCR atingido (${current}/${limit}). Faça upgrade do seu plano.`);
          throw new Error("PLAN_LIMIT_REACHED");
      }
      
      const jobsToCreate = files.map(f => ({
        company_id: companyId,
        file_id: f.id,
        status: 'pending' as const,
        document_type: docType === 'AUTO_DETECT' ? null : docType,
        metadata: { original_name: f.file.name }
      }));

      const { data, error } = await supabase
        .from("ocr_jobs")
        .insert(jobsToCreate)
        .select();

      if (error) throw error;

      // Log usage increment (Ideally this happens via DB trigger on OCR job creation)
      await supabase.rpc('increment_ocr_usage', { company_id_param: companyId, amount: files.length });

      // Trigger asynchronous processing
      console.log("OCR_PROCESSING_OK", data.length);
      
      // In a real implementation, we would call an edge function here
      // For now, we simulate background processing starts
      for (const job of data) {
        supabase.functions.invoke('process-ocr', {
          body: { jobId: job.id }
        }).catch(err => console.error("OCR background trigger failed:", err));
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ocr-jobs"] });
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
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ocr-jobs"] });
      toast.success("Dados sincronizados com sucesso!");
    },
  });

  return {
    jobs,
    isLoading,
    createBatchJobs,
    applyOCRData
  };
};
