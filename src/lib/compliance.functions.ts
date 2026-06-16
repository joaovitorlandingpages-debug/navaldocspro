import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({ processId: z.string().uuid() });

export type ComplianceFinding = {
  severity: "critical" | "warning" | "info";
  norma: string;
  issue: string;
  recommendation: string;
};

export type ComplianceReport = {
  score: number;
  summary: string;
  findings: ComplianceFinding[];
  approved: boolean;
};

export const validateProcessCompliance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }): Promise<ComplianceReport> => {
    const { supabase } = context;

    const { data: process } = await supabase
      .from("processes")
      .select("id, process_type, status, priority, due_date, compliance_score, vessel_id, customer_id")
      .eq("id", data.processId)
      .single();

    if (!process) throw new Error("Processo não encontrado");

    const [{ data: vessel }, { data: customer }, { data: documents }] = await Promise.all([
      process.vessel_id ? supabase.from("vessels").select("name, vessel_type, registration_number, gross_tonnage, activity").eq("id", process.vessel_id).single() : Promise.resolve({ data: null }),
      process.customer_id ? supabase.from("customers").select("name, cpf_cnpj").eq("id", process.customer_id).single() : Promise.resolve({ data: null }),
      supabase.from("documents").select("document_type, status, expiry_date").eq("process_id", data.processId),
    ]);

    const { callLovableAIJSON } = await import("./ai-gateway.server");

    const report = await callLovableAIJSON<ComplianceReport>({
      messages: [
        {
          role: "system",
          content: `Você é um auditor especialista em normas NORMAM da Marinha do Brasil para embarcações.
Analise o processo e identifique divergências com normas NORMAM-01, NORMAM-02 e NORMAM-03.
Responda APENAS em JSON válido no formato:
{"score": 0-100, "summary": "texto curto", "approved": boolean, "findings": [{"severity":"critical|warning|info","norma":"NORMAM-XX","issue":"problema","recommendation":"ação corretiva"}]}`,
        },
        {
          role: "user",
          content: `PROCESSO: ${JSON.stringify(process)}
EMBARCAÇÃO: ${JSON.stringify(vessel)}
CLIENTE: ${JSON.stringify(customer)}
DOCUMENTOS: ${JSON.stringify(documents)}`,
        },
      ],
    });

    return report;
  });
