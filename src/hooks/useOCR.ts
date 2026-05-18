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
          status: 'processing'
        })
        .select()
        .single();

      if (error) throw error;
      
      // Simulate processing for now
      setTimeout(async () => {
        await simulateProcessing(data.id);
      }, 2000);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ocr-jobs"] });
      toast.success("Documento enviado para processamento OCR!");
    },
  });

  const simulateProcessing = async (jobId: string) => {
    // Mock data based on common documents
    const mockData = {
      name: "JOÃO DA SILVA SANTOS",
      doc_number: "123.456.789-00",
      birth_date: "1985-05-20",
      address: "RUA DAS MARINHAS, 100 - RIO DE JANEIRO",
      vessel_name: "MAR AZUL II",
      vessel_id: "201ABC1234"
    };

    const { error } = await supabase
      .from("ocr_jobs")
      .update({
        status: 'completed',
        extracted_data: mockData,
        confidence_score: 0.98,
        processing_time: 1500
      })
      .eq("id", jobId);

    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["ocr-jobs"] });
      toast.info("Processamento OCR concluído!");
    }
  };

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
