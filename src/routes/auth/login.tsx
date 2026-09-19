import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  ArrowRight, 
  Loader2, 
  Headset, 
  AlertCircle 
} from "lucide-react";

export const Route = createFileRoute("/auth/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: LoginComponent,
});

const FALLBACK_REDIRECT = "/dashboard";

function isSafeInternalPath(path: string | undefined | null): path is string {
  if (!path) return false;
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (path.startsWith("/auth")) return false;
  return true;
}

function LoginComponent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { redirect: redirectParam } = Route.useSearch();

  // Redireciona de forma segura caso o usuário já esteja autenticado
  useEffect(() => {
    supabase.auth.getSession().then((res: any) => {
      const session = res?.data?.session;
      if (session) {
        let target = FALLBACK_REDIRECT;
        if (isSafeInternalPath(redirectParam)) target = redirectParam;
        window.location.href = target;
      }
    });
  }, [redirectParam]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    const cleanEmail = email.trim();

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        throw error;
      }

      toast.success("Login realizado com sucesso!");

      setTimeout(() => {
        let target = FALLBACK_REDIRECT;
        try {
          const stored = sessionStorage.getItem("returnTo") || localStorage.getItem("returnTo");
          if (isSafeInternalPath(redirectParam)) target = redirectParam;
          else if (isSafeInternalPath(stored)) target = stored;
        } catch {}

        try {
          sessionStorage.removeItem("returnTo");
          localStorage.removeItem("returnTo");
        } catch {}

        window.location.href = target;
      }, 400);
    } catch (error: any) {
      const rawMessage = error?.message || "";
      let friendlyMessage = "Erro ao realizar login. Verifique seus dados e tente novamente.";

      if (
        rawMessage.includes("Invalid login credentials") ||
        rawMessage.includes("invalid_credentials") ||
        error?.code === "invalid_credentials"
      ) {
        friendlyMessage = "E-mail ou senha incorretos. Por favor, tente novamente.";
      } else if (rawMessage.includes("Email not confirmed")) {
        friendlyMessage = "E-mail ainda não confirmado. Por favor, verifique sua caixa de entrada.";
      } else if (rawMessage.includes("rate limit") || error?.status === 429) {
        friendlyMessage = "Muitas tentativas em sequência. Aguarde alguns instantes antes de tentar novamente.";
      } else if (rawMessage) {
        friendlyMessage = rawMessage;
      }

      setErrorMessage(friendlyMessage);
      toast.error(friendlyMessage, { id: "login-error-toast" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* 1. COLUNA ESQUERDA: FOTOGRAFIA DA MARINA COM OVERLAY (DESKTOP) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#07192f] overflow-hidden select-none">
        {/* Imagem de fundo da marina */}
        <img
          src="/hero-marina.jpg"
          alt="Marina náutica com embarcações e montanhas"
          className="w-full h-full object-cover object-center absolute inset-0"
          loading="eager"
        />

        {/* Sobreposição azul-marinho com gradiente suave para leitura perfeita */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a2342]/75 via-[#081d38]/60 to-[#061427]/85" />

        {/* Conteúdo textual sobreposto na fotografia */}
        <div className="relative z-10 w-full h-full p-12 xl:p-16 flex flex-col justify-between">
          {/* Topo: Traço de destaque + Título e Descrição */}
          <div className="max-w-md pt-6">
            <div className="w-9 h-1 bg-blue-400 rounded-full mb-6" />
            <h2 className="text-3xl xl:text-4xl 2xl:text-[42px] font-extrabold text-white tracking-tight leading-[1.18]">
              Sua rotina náutica, mais simples.
            </h2>
            <p className="text-white/85 text-base xl:text-lg font-normal mt-4 leading-relaxed">
              Processos, documentos e prazos em um só lugar.
            </p>
          </div>

          {/* Base: Caligrafia script discreta */}
          <div className="pb-4">
            <div className="text-white/90 text-xl xl:text-2xl font-serif italic tracking-wide leading-snug drop-shadow-md">
              <div>Mais tempo</div>
              <div className="pl-3">para o que importa</div>
            </div>
            <div className="w-20 h-0.5 bg-white/30 rounded-full mt-1.5 ml-3 transform -rotate-1" />
          </div>
        </div>
      </div>

      {/* 2. COLUNA DIREITA: FORMULÁRIO DE LOGIN (DESKTOP & CELULAR) */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-between px-5 sm:px-8 md:px-12 py-8 sm:py-10 bg-white overflow-y-auto">
        {/* Container Centralizado com max-width ~420px */}
        <div className="max-w-[420px] w-full mx-auto flex-1 flex flex-col justify-center">
          {/* Link: Voltar ao site */}
          <div className="mb-6 sm:mb-8">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md py-1"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              <span>Voltar ao site</span>
            </Link>
          </div>

          {/* Logo Oficial NavalDocs Pro */}
          <div className="flex justify-center mb-6">
            <Link to="/" aria-label="NavalDocs Pro">
              <img
                src="/navaldocs-logo.png"
                alt="NavalDocs Pro"
                className="h-10 sm:h-11 w-auto object-contain"
                width="180"
                height="40"
              />
            </Link>
          </div>

          {/* Título e Descrição de Boas-Vindas */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-[26px] font-bold text-[#0f1d36] tracking-tight">
              Bem-vindo de volta
            </h1>
            <p className="text-slate-500 text-sm sm:text-base mt-1.5">
              Entre para acompanhar seus processos.
            </p>
          </div>

          {/* Alerta de Erro Acessível */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5 animate-in fade-in duration-200"
            >
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{errorMessage}</div>
            </div>
          )}

          {/* Formulário de Autenticação */}
          <form onSubmit={handleLogin} noValidate={false} className="space-y-4">
            {/* Campo: E-mail */}
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="login-email"
                className="block text-sm font-semibold text-slate-700"
              >
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full h-12 rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-base text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1868db]/20 focus:border-[#1868db] transition-all disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Campo: Senha */}
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="login-password"
                className="block text-sm font-semibold text-slate-700"
              >
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full h-12 rounded-lg border border-slate-200 bg-white pl-11 pr-11 text-base text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1868db]/20 focus:border-[#1868db] transition-all disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
                  aria-pressed={showPassword}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>

              {/* Link: Esqueci minha senha */}
              <div className="flex justify-end pt-1">
                <Link
                  to="/auth/reset"
                  className="text-xs sm:text-sm font-medium text-[#1868db] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                >
                  Esqueci minha senha
                </Link>
              </div>
            </div>

            {/* Botão Principal: Entrar */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold rounded-lg shadow-sm shadow-blue-500/10 transition-all flex items-center justify-center gap-2 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:scale-[0.99] disabled:opacity-65 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Link: Criar conta */}
          <p className="text-center text-sm text-slate-600 mt-6">
            Ainda não tem conta?{" "}
            <Link
              to="/auth/signup"
              className="text-[#1868db] font-semibold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
            >
              Criar conta
            </Link>
          </p>
        </div>

        {/* Rodapé: Canal de Suporte */}
        <div className="max-w-[420px] w-full mx-auto pt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-slate-500">
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
        </div>
      </div>
    </div>
  );
}
