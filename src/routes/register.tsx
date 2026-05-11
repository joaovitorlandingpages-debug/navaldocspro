import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Anchor, Mail, Lock, User, Briefcase, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/register")({
  component: Register,
});

function Register() {
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 py-12">
      <div className="w-full max-w-lg space-y-8 bg-white p-8 lg:p-12 rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
            <Anchor className="h-10 w-10 text-primary group-hover:rotate-12 transition-transform" />
            <span className="text-2xl font-bold text-navy">NavalDocs <span className="text-primary">Pro</span></span>
          </Link>
          <h2 className="text-2xl font-bold text-navy">Crie sua conta profissional</h2>
          <p className="text-muted-foreground mt-2">Inicie seus 14 dias de teste gratuito hoje.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700" htmlFor="name">Nome Completo</label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input 
                id="name" 
                type="text" 
                placeholder="Seu nome" 
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700" htmlFor="email">E-mail Profissional</label>
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
            <label className="text-sm font-semibold text-slate-700">Tipo de Perfil</label>
            <div className="grid grid-cols-3 gap-3">
               {["Engenheiro", "Despachante", "Empresa"].map((role) => (
                 <label key={role} className="cursor-pointer">
                    <input type="radio" name="role" className="peer hidden" defaultChecked={role === "Engenheiro"} />
                    <div className="p-3 text-center rounded-lg border border-slate-200 text-sm font-medium peer-checked:bg-primary/5 peer-checked:border-primary peer-checked:text-primary transition-all">
                       {role}
                    </div>
                 </label>
               ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700" htmlFor="password">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input 
                id="password" 
                type="password" 
                placeholder="Mínimo 8 caracteres" 
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                required
              />
            </div>
          </div>

          <div className="flex items-start gap-2 pt-2">
             <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" required />
             <label className="text-xs text-muted-foreground">
               Ao me cadastrar, concordo com os <a href="#" className="text-primary underline">Termos de Uso</a> e <a href="#" className="text-primary underline">Política de Privacidade</a>.
             </label>
          </div>

          <button 
            type="submit" 
            className="w-full bg-primary text-white py-4 rounded-lg font-bold text-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            Cadastrar Agora <ArrowRight className="h-5 w-5" />
          </button>
        </form>

        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link to="/login" className="text-primary font-bold hover:underline">Fazer Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
