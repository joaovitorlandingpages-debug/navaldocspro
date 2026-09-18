import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  LayoutGrid, 
  User, 
  Info, 
  ArrowRight, 
  Loader2, 
  Headset, 
  AlertCircle 
} from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  component: WorkspaceOnboardingPage,
});

function WorkspaceOnboardingPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [workspaceName, setWorkspaceName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  // 1. Redirecionamentos de segurança baseados no estado do usuário
  useEffect(() => {
    if (loading) return;

    // Permite visualização e testes visuais com ?preview=true
    const isPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "true";

    // Usuário não autenticado vai para login
    if (!user && !isPreview) {
      navigate({ to: "/auth/login", search: { redirect: "/onboarding" } });
      return;
    }

    if (profile && !isPreview) {
      // Clientes ou membros de portal externo vão para seu portal
      if (profile.role === "customer" || profile.role === "client") {
        navigate({ to: "/client-portal" });
        return;
      }

      // Usuário convidado ou membro de empresa cujo onboarding já está concluído
      if (profile.companies?.onboarding_status === "completed") {
        navigate({ to: "/dashboard" });
        return;
      }

      // Usuário convidado como membro comum (não criador) deve seguir direto se a empresa estiver pronta
      if (
        profile.role === "member" &&
        profile.companies &&
        profile.companies.onboarding_status !== "pending"
      ) {
        navigate({ to: "/dashboard" });
        return;
      }

      // Preenche o nome se já houver um registro provisório no perfil
      if (profile.companies?.name && !workspaceName) {
        // Se for um placeholder genérico, permitimos ao usuário digitar livremente
        setWorkspaceName(profile.companies.name);
      }
    }
  }, [user, profile, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    const cleanName = workspaceName.trim();

    if (!cleanName) {
      setErrorMessage("Por favor, informe o nome do seu espaço de trabalho.");
      return;
    }

    if (cleanName.length < 2) {
      setErrorMessage("O nome do espaço deve conter pelo menos 2 caracteres.");
      return;
    }

    if (cleanName.length > 100) {
      setErrorMessage("O nome do espaço não pode exceder 100 caracteres.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (!user) {
        throw new Error("Sessão expirada. Por favor, faça login novamente.");
      }

      const existingCompanyId = profile?.company_id;

      if (existingCompanyId) {
        // Atualiza a empresa já vinculada ao perfil
        const { error: updateError } = await supabase
          .from("companies")
          .update({
            name: cleanName,
            onboarding_status: "completed",
            onboarding_step: 8,
          })
          .eq("id", existingCompanyId);

        if (updateError) throw updateError;
      } else {
        // Caso ainda não haja empresa vinculada, busca se já criou alguma
        const { data: userCompany } = await supabase
          .from("companies")
          .select("id")
          .eq("created_by", user.id)
          .maybeSingle();

        if (userCompany) {
          const { error: updateError } = await supabase
            .from("companies")
            .update({
              name: cleanName,
              onboarding_status: "completed",
              onboarding_step: 8,
            })
            .eq("id", userCompany.id);

          if (updateError) throw updateError;

          // Vincula a empresa ao perfil
          await supabase
            .from("profiles")
            .update({ company_id: userCompany.id })
            .eq("id", user.id);
        } else {
          // Cria uma nova empresa e vincula
          const { data: newCompany, error: createError } = await supabase
            .from("companies")
            .insert({
              name: cleanName,
              plan: "starter",
              is_active: true,
              created_by: user.id,
              onboarding_status: "completed",
              onboarding_step: 8,
            })
            .select()
            .single();

          if (createError) throw createError;

          if (newCompany) {
            await supabase
              .from("profiles")
              .update({ company_id: newCompany.id })
              .eq("id", user.id);
          }
        }
      }

      // Atualiza o estado global de autenticação
      if (refreshProfile) {
        await refreshProfile().catch(() => {});
      }

      toast.success("Espaço configurado com sucesso! Bem-vindo ao NavalDocs Pro.");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      console.error("Erro ao configurar espaço:", err);

      const msg = err?.message || "";
      if (
        msg.includes("JWT") ||
        msg.includes("token") ||
        msg.includes("expired") ||
        err?.status === 401
      ) {
        setErrorMessage("Sua sessão expirou. Por favor, faça login novamente.");
        toast.error("Sua sessão expirou. Redirecionando para login...");
        setTimeout(() => {
          navigate({ to: "/auth/login", search: { redirect: "/onboarding" } });
        }, 1500);
      } else if (msg.includes("network") || msg.includes("Failed to fetch")) {
        setErrorMessage("Falha de conexão com o servidor. Verifique sua internet e tente novamente.");
        toast.error("Falha de conexão. Tente novamente.");
      } else {
        const errorDetail = err?.message || "Erro inesperado ao salvar seu espaço.";
        setErrorMessage(errorDetail);
        toast.error(errorDetail);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#f8fafc] text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* 1. CABEÇALHO */}
      <header className="w-full bg-white/80 backdrop-blur-xs border-b border-slate-200/70 py-4 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo Oficial NavalDocs Pro */}
          <Link to="/" aria-label="NavalDocs Pro" className="flex items-center">
            <img
              src="/navaldocs-logo.png"
              alt="NavalDocs Pro"
              className="h-8 sm:h-9 w-auto object-contain"
              width="160"
              height="36"
            />
          </Link>

          {/* Suporte Desktop */}
          <div className="hidden sm:flex items-center gap-2 text-xs sm:text-sm text-slate-500">
            <Headset className="h-4 w-4 text-slate-400 shrink-0" />
            <span>
              Precisa de ajuda?{" "}
              <a
                href="mailto:suporte@navaldocs.pro"
                className="text-[#1868db] font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
              >
                Fale com o suporte
              </a>
            </span>
          </div>

          {/* Suporte Mobile Compacto */}
          <div className="flex sm:hidden items-center gap-1.5 text-xs text-slate-600">
            <Headset className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <a
              href="mailto:suporte@navaldocs.pro"
              className="font-medium text-[#1868db] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
            >
              Ajuda
            </a>
          </div>
        </div>
      </header>

      {/* 2. CONTEÚDO PRINCIPAL (CARTÃO CENTRALIZADO) */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-[620px] bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-xs sm:shadow-sm p-6 sm:p-10 lg:p-12 text-center">
          {/* Ícone de Espaço de Trabalho */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-50 text-[#1868db] rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5 shadow-2xs">
            <LayoutGrid className="h-7 w-7 sm:h-8 sm:w-8" />
          </div>

          {/* Tagline e Títulos */}
          <span className="inline-block text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
            Configuração inicial
          </span>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0f1d36] tracking-tight mb-2">
            Vamos organizar seu espaço
          </h1>
          <p className="text-slate-500 text-sm sm:text-base max-w-md mx-auto leading-relaxed mb-6 sm:mb-8">
            Escolha um nome para começar. Você pode alterar depois.
          </p>

          {/* Alerta de Erro Acessível */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5 text-left animate-in fade-in duration-200"
            >
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{errorMessage}</div>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Campo: Nome do espaço de trabalho */}
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="workspace-name"
                className="block text-sm font-semibold text-slate-700"
              >
                Nome do espaço de trabalho
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400 pointer-events-none" />
                <input
                  id="workspace-name"
                  type="text"
                  required
                  placeholder="Ex.: Marina Sul ou seu nome"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-base text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1868db]/20 focus:border-[#1868db] transition-all disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5 select-none">
                Trabalha por conta própria? Use seu nome profissional.
              </p>
            </div>

            {/* Caixa Informativa Azul-Clara */}
            <div className="bg-blue-50/70 border border-blue-100/90 rounded-xl p-3.5 sm:p-4 text-left flex items-center gap-3 text-slate-700 text-xs sm:text-sm">
              <div className="w-5 h-5 rounded-full bg-[#1868db] text-white flex items-center justify-center shrink-0 font-serif font-bold text-[11px]">
                i
              </div>
              <span className="leading-snug">
                Clientes, embarcações e processos ficarão organizados neste espaço.
              </span>
            </div>

            {/* Botão Principal */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold rounded-lg shadow-sm shadow-blue-500/10 transition-all flex items-center justify-center gap-2 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:scale-[0.99] disabled:opacity-65 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Preparando seu espaço…</span>
                  </>
                ) : (
                  <>
                    <span>Acessar meu painel</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            {/* Texto Complementar */}
            <p className="text-xs text-slate-400 text-center pt-2 select-none">
              Logo, equipe e dados da empresa podem ser adicionados depois.
            </p>
          </form>
        </div>
      </main>

      {/* 3. PARTE INFERIOR: DECORAÇÃO DISCRETA DE ONDAS + VELEIRO + TEXTO */}
      <footer className="w-full pb-8 pt-4 flex flex-col items-center select-none pointer-events-none">
        <div className="relative flex items-center justify-center w-full max-w-sm mb-2.5">
          {/* Ondas náuticas sutis */}
          <svg
            className="w-full h-5 text-blue-200/80"
            viewBox="0 0 300 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 8 C 40 15, 80 1, 130 8"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <path
              d="M170 8 C 220 15, 260 1, 300 8"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>

          {/* Símbolo do Veleiro ao Centro */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="h-5 w-5 text-[#1868db]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              {/* Vela maior */}
              <path d="M11 3 C11 3 5 13 5 16 C9 16 11 15 11 15 Z" />
              {/* Vela menor */}
              <path d="M12.5 7 C12.5 7 19 14 19 16 C16 16 12.5 15.5 12.5 15.5 Z" />
              {/* Casco */}
              <path
                d="M3 18.5 C7.5 20.5 16.5 20.5 21 18.5 C18.5 21 5.5 21 3 18.5 Z"
                opacity="0.85"
              />
            </svg>
          </div>
        </div>

        {/* Frase de Conclusão */}
        <p className="text-xs sm:text-sm text-slate-400 text-center">
          Tudo pronto para o seu primeiro processo.
        </p>
      </footer>
    </div>
  );
}
