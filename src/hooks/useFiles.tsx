import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { DocumentAutomationEngine } from "@/services/automation/documentAutomationEngine";
import { uploadToBucket, removeFromBucket, validateUpload } from "@/lib/storage";
import { limitsEngine } from "@/services/limitsEngine";

export interface UploadedFile {
  id: string;
  company_id: string;
  customer_id?: string | null;
  vessel_id?: string | null;
  process_id?: string | null;
  uploaded_by: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  category: string;
  status: 'uploaded' | 'analyzing' | 'validated' | 'needs_correction' | 'expired';
  extracted_data?: any;
  created_at: string;
}

export type FileBucket = 'customer-documents' | 'vessel-documents' | 'process-attachments' | 'generated-documents';

export const useFiles = (filters?: { customerId?: string; vesselId?: string; processId?: string }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: files, isLoading } = useQuery({
    queryKey: ["uploaded-files", filters],
    queryFn: async () => {
      let query = supabase
        .from("uploaded_files")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.customerId) query = query.eq("customer_id", filters.customerId);
      if (filters?.vesselId) query = query.eq("vessel_id", filters.vesselId);
      if (filters?.processId) query = query.eq("process_id", filters.processId);

      const { data, error } = await query;
      if (error) throw error;
      return data as UploadedFile[];
    },
    enabled: !!user,
  });

  const uploadFile = useMutation({
    mutationFn: async ({ 
      file, 
      category, 
      bucket, 
      customerId, 
      vesselId, 
      processId 
    }: { 
      file: File; 
      category: string; 
      bucket: FileBucket;
      customerId?: string;
      vesselId?: string;
      processId?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("Company not found");

      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${profile.company_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      const { data, error } = await supabase
        .from("uploaded_files")
        .insert({
          company_id: profile.company_id,
          uploaded_by: user.id,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_url: publicUrl,
          category,
          customer_id: customerId,
          vessel_id: vesselId,
          process_id: processId,
          status: 'uploaded'
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger automation engine if processId is present
      if (processId) {
        DocumentAutomationEngine.analyzeProcess(processId);
        DocumentAutomationEngine.logEvent(processId, 'upload_complete', `Novo arquivo enviado: ${file.name}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uploaded-files"] });
      toast.success("Arquivo enviado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro no upload: ${error.message}`);
    }
  });

  const deleteFile = useMutation({
    mutationFn: async (fileId: string) => {
      const { data: file } = await supabase
        .from("uploaded_files")
        .select("*")
        .eq("id", fileId)
        .single();

      if (!file) throw new Error("File not found");

      // Extract bucket from file path or logic (simplified here)
      // In a real app, you might want to store the bucket name in the table
      const bucket: FileBucket = file.category === 'cnh' || file.category === 'rg' ? 'customer-documents' : 'process-attachments';

      const path = file.file_url.split('/').slice(-2).join('/'); // company_id/filename

      await supabase.storage.from(bucket).remove([path]);
      
      const { error } = await supabase
        .from("uploaded_files")
        .delete()
        .eq("id", fileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uploaded-files"] });
      toast.success("Arquivo removido.");
    }
  });

  const simulateOCR = useMutation({
    mutationFn: async (fileId: string) => {
      await supabase.from("uploaded_files").update({ status: 'analyzing' }).eq("id", fileId);
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 3000));

      const mockData = {
        name: "NAVIO MERCANTE ESTRELA",
        doc_number: "9876543-2",
        expiry_date: "2026-10-15",
        issue_date: "2021-10-15",
        engines: [
          { brand: "Wärtsilä", model: "6R32", power: "4500HP", serial: "W9821-X" },
          { brand: "Cummins", model: "QSK19", power: "750HP", serial: "C1122-Y" }
        ],
        crew: [
          { name: "João Pereira", role: "Comandante", cir: "RJ-12345/01" },
          { name: "Maria Clara", role: "Chefe de Máquinas", cir: "SP-98765/02" }
        ],
        vessel_details: {
          imo: "9876543",
          callsign: "PW321",
          mmsi: "710123456"
        }
      };

      const { data, error } = await supabase
        .from("uploaded_files")
        .update({ 
          status: 'validated',
          extracted_data: mockData
        })
        .eq("id", fileId)
        .select()
        .single();

      if (error) throw error;

      // Trigger automation engine if processId is present
      if (data.process_id) {
        // We trigger re-analysis here, the actual OCR extraction logic is handled via ocr_jobs
        DocumentAutomationEngine.analyzeProcess(data.process_id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uploaded-files"] });
      toast.success("Análise concluída!");
    }
  });

  return {
    files,
    isLoading,
    uploadFile,
    deleteFile,
    simulateOCR
  };
};
