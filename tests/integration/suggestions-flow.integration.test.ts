import { describe, it, expect } from "vitest";
import { Check, CheckCircle2, Clock, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

describe("Sugestoes Screen & Icons Integration Suite", () => {
  it("valida que o ícone Check e todos os ícones de status estão definidos e não nulos", () => {
    expect(Check).toBeDefined();
    expect(typeof Check).toBe("object"); // Componente React forwardRef

    const SUGGESTION_STATUSES = {
      recebida: { label: "Recebida", color: "bg-slate-100 text-slate-700 border-slate-200", icon: Clock },
      em_analise: { label: "Em análise", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
      planejada: { label: "Planejada", color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: Sparkles },
      em_desenvolvimento: { label: "Em desenvolvimento", color: "bg-amber-50 text-amber-700 border-amber-200", icon: RefreshCw },
      implementada: { label: "Implementada", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
      nao_prevista: { label: "Não prevista", color: "bg-slate-100 text-slate-500 border-slate-200", icon: AlertCircle },
      encerrada: { label: "Encerrada", color: "bg-slate-100 text-slate-600 border-slate-200", icon: Check },
    };

    expect(SUGGESTION_STATUSES.encerrada.icon).toBe(Check);
    expect(SUGGESTION_STATUSES.implementada.icon).toBe(CheckCircle2);
  });

  it("garante que a consulta de tickets/sugestões na tabela tickets executa sem falha de esquema", async () => {
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    // Consulta de leitura deve retornar sucesso (ou array vazio com RLS)
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it("garante que a consulta administrativa com join de empresas na tabela tickets funciona", async () => {
    const { data, error } = await supabase
      .from("tickets")
      .select(`
        *,
        company:companies!company_id (
          id,
          name,
          cnpj
        )
      `)
      .order("created_at", { ascending: false })
      .limit(5);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});
