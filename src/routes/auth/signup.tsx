import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Anchor, Mail, Lock, User, Building2, Loader2, ArrowRight } from "lucide-react";
// motion removed to prevent removeChild crash

export const Route = createFileRoute("/auth/signup")({
  component: SignupComponent,
});

function translateAuthError(error: any): string {
  const msg: string = error?.message || error?.msg || "";
  const code: string = error?.code || error?.error_code || "";
  if (code === "weak_password" || /weak|pwned|known to be weak/i.test(msg)) {
    return "Senha fraca ou já vazada em outros sites. Use uma senha com pelo menos 8 caracteres, misturando letras, números e símbolos únicos.";
  }
  if (/email.*invalid|invalid.*email|email_address_invalid/i.test(msg) || code === "email_address_invalid") {
    return "E-mail inválido. Use um e-mail real (ex: nome@empresa.com).";
  }
  if (/already registered|already exists|user_already_exists/i.test(msg) || code === "user_already_exists") {
    return "Este e-mail já está cadastrado. Faça login ou recupere a senha.";
  }
  if (/over_email_send_rate_limit|rate limit/i.test(msg)) {
    return "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.";
  }
  return msg || "Erro ao realizar cadastro. Tente novamente.";
}

function SignupComponent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: fullName,
            name: fullName,
            role: 'company_admin',
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .insert({ name: companyName, plan: 'starter', is_active: true, created_by: authData.user.id })
          .select()
          .single();

        if (companyError) {
          console.warn("SIGNUP_COMPANY_CREATE_DEFER", companyError);
        } else {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ company_id: companyData.id })
            .eq('id', authData.user.id);
          if (profileError) console.warn("SIGNUP_PROFILE_LINK_DEFER", profileError);
        }

        toast.success("Conta criada com sucesso!");
        navigate({ to: "/dashboard" });
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
    <div className="min-h-screen flex items-center justify-center bg-[#000B18] p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-[450px] z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 mb-4">
            <Anchor className="text-white w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">NavalDocs Pro</h1>
          <p className="text-blue-400/60 text-sm font-medium uppercase tracking-widest mt-1">Enterprise Edition</p>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-xl text-white text-center">Criar Nova Conta</CardTitle>
            <CardDescription className="text-white/40 text-center">
              Comece a automatizar seus processos navais hoje
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSignup}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-white/70">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                    <Input
                      id="fullName"
                      placeholder="João Silva"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-white/70">Nome da Empresa</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                    <Input
                      id="companyName"
                      placeholder="Engenharia Naval Ltda"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/70">E-mail Profissional</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="joao@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/70">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50"
                    required
                  />
                </div>
              </div>
              <p className="text-[10px] text-white/40 leading-relaxed">
                Use uma senha forte com pelo menos 8 caracteres, misturando letras maiúsculas, minúsculas, números e símbolos. Evite senhas comuns ou já usadas em outros sites.
              </p>
              {formError && (
                <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {formError}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-2">
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 h-auto"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Criar Conta Enterprise
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <p className="text-center text-sm text-white/40">
                Já tem uma conta?{" "}
                <a href="/auth/login" className="text-blue-400 font-medium hover:underline">Fazer login</a>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
