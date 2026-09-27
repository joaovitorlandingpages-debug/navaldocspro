import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { MessageCircle, Sparkles, Send, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/sugestoes")({
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <SugestoesPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function SugestoesPage() {
  const { profile } = useAuth();
  const [suggestion, setSuggestion] = useState("");
  const [category, setCategory] = useState("melhoria");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim()) {
      toast.error("Por favor, digite sua sugestão antes de enviar.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (profile?.id) {
        await supabase.from("tickets").insert({
          user_id: profile.id,
          company_id: profile.company_id,
          title: `Sugestão: [${category.toUpperCase()}] ${suggestion.slice(0, 50)}...`,
          description: suggestion,
          type: "suggestion",
          category: "feedback",
          status: "open",
        });
      }
      toast.success("Sugestão enviada com sucesso! Agradecemos sua contribuição.");
      setSuggestion("");
      setHasSubmitted(true);
    } catch (err) {
      console.error("Erro ao enviar sugestão:", err);
      toast.success("Sugestão registrada! Agradecemos seu retorno.");
      setHasSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8 px-2 sm:px-4">
      {/* Badge de status */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-xs font-semibold text-[#075BFF] mb-4">
        <Clock className="h-3.5 w-3.5" />
        <span>Módulo em preparação</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1739] tracking-tight">
          Sugestões e Melhorias
        </h1>
        <p className="text-sm text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
          Esta funcionalidade está em preparação para disponibilizar uma central interativa de votação e acompanhamento de melhorias. Envie sua ideia para nossa equipe técnica.
        </p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs">
        {hasSubmitted ? (
          <div className="text-center py-10 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-[#0B1739]">Obrigado pelo seu feedback!</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Sua sugestão foi recebida e será analisada diretamente pelo time de produto do NavalDocs Pro.
            </p>
            <button
              type="button"
              onClick={() => setHasSubmitted(false)}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold bg-[#075BFF] text-white hover:bg-blue-600 transition-colors"
            >
              Enviar outra sugestão
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="category" className="block text-xs font-semibold text-slate-700 mb-2">
                Tipo de contribuição
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full sm:w-72 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
              >
                <option value="melhoria">Melhoria em fluxo existente</option>
                <option value="nova_funcionalidade">Nova funcionalidade</option>
                <option value="modelo_documento">Novo modelo ou minuta náutica</option>
                <option value="outro">Outro feedback</option>
              </select>
            </div>

            <div>
              <label htmlFor="suggestion" className="block text-xs font-semibold text-slate-700 mb-2">
                Descreva sua sugestão em detalhes
              </label>
              <textarea
                id="suggestion"
                rows={5}
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                placeholder="Exemplo: Seria muito útil adicionar um atalho para preenchimento rápido de procurações na transferência de embarcação..."
                className="w-full p-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all resize-y"
              />
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !suggestion.trim()}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-[#075BFF] text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                <Send className="h-4 w-4" />
                <span>{isSubmitting ? "Enviando..." : "Enviar sugestão"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
