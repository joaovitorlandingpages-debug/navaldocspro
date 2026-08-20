import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Lock, ArrowLeft, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/auth/reset")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    // If arriving via Supabase recovery link, session is set with type=recovery
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setMode("update");
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "PASSWORD_RECOVERY") setMode("update");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/reset`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível enviar o e-mail. Verifique o endereço e tente novamente.");
      return;
    }
    setSent(true);
    toast.success("E-mail de recuperação enviado.");
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível atualizar a senha. Solicite um novo link.");
      return;
    }
    toast.success("Senha atualizada com sucesso.");
    await supabase.auth.signOut();
    navigate({ to: "/auth/login", search: { redirect: "/dashboard" } });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-md bg-slate-900 border-white/10 text-white">
        <CardHeader>
          <CardTitle className="text-white">
            {mode === "update" ? "Definir nova senha" : "Recuperar senha"}
          </CardTitle>
          <CardDescription className="text-white/60">
            {mode === "update"
              ? "Digite sua nova senha abaixo."
              : "Enviaremos um link para você redefinir sua senha."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "request" && sent ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-400" />
              <p className="text-sm text-white/80">
                Se este e-mail estiver cadastrado, você receberá um link de recuperação em instantes.
              </p>
              <Link to="/auth/login" search={{ redirect: "/dashboard" }} className="text-sm text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Voltar ao login
              </Link>
            </div>
          ) : mode === "request" ? (
            <form onSubmit={handleRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/70">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Enviando..." : "Enviar link de recuperação"}
              </Button>
              <Link to="/auth/login" search={{ redirect: "/dashboard" }} className="text-sm text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Voltar ao login
              </Link>
            </form>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-white/70">Nova senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                  <PasswordInput
                    id="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-white/70">Confirmar senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                  <PasswordInput
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white"
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Atualizando..." : "Atualizar senha"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
