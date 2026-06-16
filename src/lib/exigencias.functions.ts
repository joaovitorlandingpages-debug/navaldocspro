import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  exigenciaText: z.string().min(10).max(5000),
  processId: z.string().uuid().optional(),
});

export type ExigenciaAnalysis = {
  category: string;
  severity: "high" | "medium" | "low";
  required_documents: string[];
  suggested_response: string;
  next_actions: string[];
  estimated_resolution_days: number;
};

export const analyzeExigencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<ExigenciaAnalysis> => {
    let processContext = "";
    if (data.processId) {
      const { data: p } = await context.supabase
        .from("processes")
        .select("process_type, status, priority")
        .eq("id", data.processId)
        .single();
      processContext = p ? `Contexto: ${JSON.stringify(p)}` : "";
    }

    const { callLovableAIJSON } = await import("./ai-gateway.server");

    return await callLovableAIJSON<ExigenciaAnalysis>({
      messages: [
        {
          role: "system",
          content: `Você é um especialista em devolutivas da Capitania dos Portos. Analise a exigência e classifique.
Responda APENAS em JSON:
{"category": "categoria", "severity": "high|medium|low", "required_documents": ["doc1"], "suggested_response": "texto formal de resposta à Capitania", "next_actions": ["ação1"], "estimated_resolution_days": number}`,
        },
        {
          role: "user",
          content: `EXIGÊNCIA RECEBIDA:\n${data.exigenciaText}\n\n${processContext}`,
        },
      ],
    });
  });
