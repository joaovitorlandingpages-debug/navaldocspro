import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Anchor, Mail, Lock, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulação de login
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
            <Anchor className="h-10 w-10 text-primary group-hover:rotate-12 transition-transform" />
            <span className="text-2xl font-bold text-navy">NavalDocs <span className="text-primary">Pro</span></span>
          </Link>
          <h2 className="text-2xl font-bold text-navy">Bem-vindo de volta</h2>
          <p className="text-muted-foreground mt-2">Acesse sua plataforma naval</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700" htmlFor="email">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input 
                id="email" 
                type="email" 
                placeholder="seu@email.com" 
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-slate-700" htmlFor="password">Senha</label>
              <a href="#" className="text-xs text-primary hover:underline">Esqueceu a senha?</a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-primary text-white py-3 rounded-lg font-bold text-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            Entrar <ArrowRight className="h-5 w-5" />
          </button>
        </form>

        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground">
            Ainda não tem uma conta?{" "}
            <Link to="/register" className="text-primary font-bold hover:underline">Começar Grátis</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
