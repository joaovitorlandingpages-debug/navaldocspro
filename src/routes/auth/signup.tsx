import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  ArrowRight, 
  Loader2, 
  Headset, 
  AlertCircle,
  CheckCircle2,
  MailCheck,
  X
} from "lucide-react";

export const Route = createFileRoute("/auth/signup")({
  component: SignupComponent,
});

function translateAuthError(error: any): string {
  const msg: string = error?.message || error?.msg || "";
  const code: string = error?.code || error?.error_code || "";

  if (code === "weak_password" || /weak|pwned|known to be weak/i.test(msg)) {
    return "Senha fraca ou já vazada em outros sites. Use uma senha com pelo menos 8 caracteres, misturando letras, números e símbolos.";
  }
  if (/email.*invalid|invalid.*email|email_address_invalid/i.test(msg) || code === "email_address_invalid") {
    return "E-mail inválido. Por favor, insira um formato válido (ex: nome@empresa.com.br).";
  }
  if (/already registered|already exists|user_already_exists/i.test(msg) || code === "user_already_exists") {
    return "Este e-mail já está cadastrado. Acesse a tela de login ou recupere sua senha.";
  }
  if (/over_email_send_rate_limit|rate limit/i.test(msg)) {
    return "Muitas tentativas em sequência. Aguarde alguns minutos antes de tentar novamente.";
  }
  return msg || "Erro ao realizar cadastro. Verifique os dados e tente novamente.";
}

function SignupComponent() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [emailSentNotice, setEmailSentNotice] = useState<string | null>(null);

  // Modal para Termos de Uso e Política de Privacidade
  const [infoModal, setInfoModal] = useState<{ title: string; content: string } | null>(null);

  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setFormError(null);

    // Validações no cliente
    const cleanName = fullName.trim();
    if (!cleanName || cleanName.length < 2) {
      setFormError("Por favor, informe seu nome completo.");
      return;
    }

    const cleanEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setFormError("Por favor, informe um endereço de e-mail válido.");
      return;
    }

    if (!password || password.length < 8) {
      setFormError("A senha deve conter no mínimo 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("A confirmação de senha não confere com a senha digitada.");
      return;
    }

    if (!acceptedTerms) {
      setFormError("É necessário aceitar os Termos de uso e a Política de privacidade para continuar.");
      return;
    }

    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: cleanName,
            name: cleanName,
            role: "company_admin",
          },
        },
      });

      if (authError) throw authError;

      // Cenário 1: Confirmação por e-mail exigida (sessão ainda não liberada)
      if (authData.user && !authData.session) {
        setEmailSentNotice(cleanEmail);
        toast.success("Conta criada! Verifique seu e-mail para ativar o acesso.");
        return;
      }

      // Cenário 2: Sessão liberada imediatamente (auto-confirmada)
      if (authData.user && authData.session) {
        const companyName = `Operação de ${cleanName}`;
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .insert({
            name: companyName,
            plan: "starter",
            is_active: true,
            created_by: authData.user.id,
          })
          .select()
          .single();

        if (companyError) {
          console.warn("SIGNUP_COMPANY_CREATE_DEFER", companyError);
        } else if (companyData) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ company_id: companyData.id })
            .eq("id", authData.user.id);
          if (profileError) console.warn("SIGNUP_PROFILE_LINK_DEFER", profileError);
        }

        toast.success("Conta criada com sucesso!");
        navigate({ to: "/onboarding" });
      }
    } catch (error: any) {
      const friendly = translateAuthError(error);
      setFormError(friendly);
      toast.error(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* 1. COLUNA ESQUERDA: FOTOGRAFIA DA MARINA COM OVERLAY (DESKTOP) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#07192f] overflow-hidden select-none">
        {/* Imagem de fundo consistente com login e landing page */}
        <img
          src="/hero-marina.jpg"
          alt="Marina náutica com embarcações e montanhas"
          className="w-full h-full object-cover object-center absolute inset-0"
          loading="eager"
        />

        {/* Sobreposição azul-marinho para legibilidade */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a2342]/75 via-[#081d38]/60 to-[#061427]/85" />

        {/* Conteúdo textual sobreposto */}
        <div className="relative z-10 w-full h-full p-12 xl:p-16 flex flex-col justify-between">
          {/* Topo: Traço de destaque + Título e Descrição */}
          <div className="max-w-md pt-6">
            <div className="w-9 h-1 bg-blue-400 rounded-full mb-6" />
            <h2 className="text-3xl xl:text-4xl 2xl:text-[42px] font-extrabold text-white tracking-tight leading-[1.18]">
              Comece com o essencial.
            </h2>
            <p className="text-white/85 text-base xl:text-lg font-normal mt-4 leading-relaxed">
              Organize seus processos náuticos em um só lugar.
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

      {/* 2. COLUNA DIREITA: FORMULÁRIO DE CADASTRO (DESKTOP & CELULAR) */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-between px-5 sm:px-8 md:px-12 py-8 sm:py-10 bg-white overflow-y-auto">
        {/* Container Centralizado com max-width ~420px */}
        <div className="max-w-[420px] w-full mx-auto flex-1 flex flex-col justify-center py-4">
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

          {/* Se a confirmação por e-mail foi disparada */}
          {emailSentNotice ? (
            <div className="text-center py-6 animate-in fade-in duration-300">
              <div className="w-14 h-14 bg-blue-50 text-[#1868db] rounded-full flex items-center justify-center mx-auto mb-4">
                <MailCheck className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-bold text-[#0f1d36] tracking-tight mb-2">
                Confirme seu e-mail
              </h1>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Enviamos um link de confirmação para:
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-4 font-semibold text-slate-800 text-sm mb-5 break-all">
                {emailSentNotice}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Por favor, verifique sua caixa de entrada (e a pasta de spam). Clique no link para ativar seu acesso e acompanhar seus processos.
              </p>
              <div className="space-y-3">
                <Link
                  to="/auth/login"
                  className="w-full h-12 bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-base"
                >
                  <span>Ir para o login</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/"
                  className="block text-center text-sm font-medium text-slate-500 hover:text-slate-700 py-2"
                >
                  Voltar ao site
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Título e Descrição */}
              <div className="text-center mb-6 sm:mb-7">
                <h1 className="text-2xl sm:text-[26px] font-bold text-[#0f1d36] tracking-tight">
                  Crie sua conta
                </h1>
                <p className="text-slate-500 text-sm sm:text-base mt-1.5">
                  Seu primeiro passo para uma rotina mais simples.
                </p>
              </div>

              {/* Alerta de Erro Acessível */}
              {formError && (
                <div
                  role="alert"
                  className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5 animate-in fade-in duration-200"
                >
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-snug">{formError}</div>
                </div>
              )}

              {/* Formulário de Cadastro */}
              <form onSubmit={handleSignup} noValidate={false} className="space-y-4">
                {/* Campo: Nome completo */}
                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor="signup-name"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Nome completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400 pointer-events-none" />
                    <input
                      id="signup-name"
                      type="text"
                      name="name"
                      autoComplete="name"
                      required
                      placeholder="Como você se chama?"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={isLoading}
                      className="w-full h-12 rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-base text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1868db]/20 focus:border-[#1868db] transition-all disabled:bg-slate-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Campo: E-mail profissional */}
                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor="signup-email"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    E-mail profissional
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400 pointer-events-none" />
                    <input
                      id="signup-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                      placeholder="voce@empresa.com.br"
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
                    htmlFor="signup-password"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400 pointer-events-none" />
                    <input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="new-password"
                      required
                      placeholder="••••••••"
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
                </div>

                {/* Campo: Confirmar senha */}
                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor="signup-confirm-password"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Confirmar senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400 pointer-events-none" />
                    <input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      autoComplete="new-password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      className="w-full h-12 rounded-lg border border-slate-200 bg-white pl-11 pr-11 text-base text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1868db]/20 focus:border-[#1868db] transition-all disabled:bg-slate-50 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Ocultar confirmação de senha" : "Ver confirmação de senha"}
                      aria-pressed={showConfirmPassword}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Eye className="h-5 w-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Termos de Uso e Política de Privacidade */}
                <div className="flex items-start gap-2.5 pt-1 text-left">
                  <input
                    id="terms-checkbox"
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    disabled={isLoading}
                    className="h-4 w-4 mt-0.5 rounded border-slate-300 text-[#1868db] focus:ring-[#1868db] cursor-pointer"
                  />
                  <label
                    htmlFor="terms-checkbox"
                    className="text-xs sm:text-sm text-slate-600 leading-snug cursor-pointer select-none"
                  >
                    Li e aceito os{" "}
                    <button
                      type="button"
                      onClick={() =>
                        setInfoModal({
                          title: "Termos de Uso",
                          content:
                            "O NavalDocs Pro é uma plataforma especializada para gestão de processos, clientes e documentos marítimos por despachantes e engenheiros navais. O uso dos serviços obedece às normas marítimas vigentes e termos contratuais de subscrição.",
                        })
                      }
                      className="text-[#1868db] hover:underline font-medium cursor-pointer"
                    >
                      Termos de uso
                    </button>{" "}
                    e a{" "}
                    <button
                      type="button"
                      onClick={() =>
                        setInfoModal({
                          title: "Política de Privacidade",
                          content:
                            "O NavalDocs Pro preza pela total confidencialidade e segurança dos dados náuticos, documentos e cadastros de clientes e embarcações. Os dados são armazenados com criptografia e em conformidade com as diretrizes da LGPD.",
                        })
                      }
                      className="text-[#1868db] hover:underline font-medium cursor-pointer"
                    >
                      Política de privacidade
                    </button>
                    .
                  </label>
                </div>

                {/* Botão Principal: Criar conta */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold rounded-lg shadow-sm shadow-blue-500/10 transition-all flex items-center justify-center gap-2 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:scale-[0.99] disabled:opacity-65 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Criando conta...</span>
                      </>
                    ) : (
                      <>
                        <span>Criar conta</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Link: Já tem uma conta? Entrar */}
              <p className="text-center text-sm text-slate-600 mt-6">
                Já tem uma conta?{" "}
                <Link
                  to="/auth/login"
                  className="text-[#1868db] font-semibold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                >
                  Entrar
                </Link>
              </p>
            </>
          )}
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

      {/* Modal Informativo para Termos de Uso / Política de Privacidade */}
      {infoModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-modal-title"
        >
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 id="terms-modal-title" className="text-lg font-bold text-[#0f1d36]">
                {infoModal.title}
              </h3>
              <button
                onClick={() => setInfoModal(null)}
                aria-label="Fechar"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="py-4 text-slate-600 text-sm leading-relaxed">
              {infoModal.content}
            </p>
            <button
              onClick={() => setInfoModal(null)}
              className="w-full mt-2 bg-[#1868db] text-white font-semibold py-2.5 rounded-lg hover:bg-[#1456b8] transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
