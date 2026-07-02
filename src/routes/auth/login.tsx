import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, Mail, Lock, Loader2, ArrowRight, Anchor } from "lucide-react";
// motion removed to prevent removeChild crash

export const Route = createFileRoute("/auth/login")({
  component: LoginComponent,
});

function LoginComponent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log("REMOVE_CHILD_AUDIT_START");
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.warn("LOGIN_ERROR_HANDLED", error.message);
        throw error;
      }

      toast.success("LOGIN_SUCCESS");
      console.log("LOGIN_SUCCESS_LOGGED");
      
      setTimeout(() => {
        window.location.href = "/dashboard-v2";
      }, 500);
    } catch (error: any) {
      // Prevenir crash no toast de erro de login
      const errorMessage = error.message || "Erro ao realizar login";
      if (errorMessage.includes("Invalid login credentials")) {
        console.error("LOGIN_ERROR_DETECTED", errorMessage);
        toast.error("Credenciais inválidas. Por favor, tente novamente.", {
          id: "login-error-toast", // Evitar duplicação
        });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
      console.log("LOGIN_ERROR_HANDLED");
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-[#000B18] p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-[400px] z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 mb-4">
            <Anchor className="text-white w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-white">NavalDocs Pro</h1>
          <p className="text-blue-400/60 text-sm font-medium uppercase tracking-widest mt-1">Enterprise Edition</p>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-xl text-white text-center">Bem-vindo de volta</CardTitle>
            <CardDescription className="text-white/40 text-center">
              Acesse sua conta para gerenciar seus processos navais
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/70">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemplo@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-white/70">Senha</Label>
                  <Link to="/auth/reset" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Esqueceu a senha?</Link>
                </div>
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
                    Acessar Plataforma
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <p className="text-center text-sm text-white/40">
                Não tem uma conta?{" "}
                <a href="/auth/signup" className="text-blue-400 font-medium hover:underline">Solicitar acesso</a>
              </p>
            </CardFooter>
          </form>
        </Card>

        <div className="mt-8 flex items-center justify-center gap-6 text-white/20">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs uppercase tracking-tighter">Secure Login</span>
          </div>
          <div className="w-1 h-1 bg-white/10 rounded-full" />
          <div className="text-xs uppercase tracking-tighter">AES-256 Encryption</div>
        </div>
      </div>
    </div>
  );
}
