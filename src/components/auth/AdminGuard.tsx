import React from "react";
import { Navigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert, ShieldCheck, ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface AdminGuardProps {
  children?: React.ReactNode;
  fallbackPath?: string;
}

/**
 * Route Guard para proteção de rotas administrativas (/admin, /super-admin, /admin-master).
 * Garante que apenas usuários com cargo administrativo global tenham acesso.
 */
export const AdminGuard: React.FC<AdminGuardProps> = ({
  children,
  fallbackPath = "/dashboard",
}) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white gap-4">
        <ShieldCheck className="h-10 w-10 text-amber-400 animate-spin" />
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 animate-pulse">
          Validando credenciais administrativas...
        </p>
      </div>
    );
  }

  // 1. Não autenticado -> redireciona para login com parâmetro de retorno
  if (!user || !profile) {
    return <Navigate to="/auth/login" search={{ redirect: window.location.pathname }} />;
  }

  // 2. Papéis permitidos: admin_master, admin_master_global ou superadmin
  const allowedRoles = ["admin_master", "admin_master_global", "superadmin", "admin"];
  const isAuthorized = allowedRoles.includes(profile.role || "");

  if (!isAuthorized) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-4">
        <Card className="max-w-md w-full border-red-500/30 bg-slate-950 text-white shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-white">
              Acesso Restrito
            </CardTitle>
            <CardDescription className="text-slate-400 text-sm">
              Esta área requer privilégios de Administrador Global (Super Admin).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="p-3 bg-slate-900/80 rounded border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Perfil atual: <strong className="text-slate-200">{profile.role || "Operacional"}</strong>.
              </span>
            </div>
            <Button asChild className="w-full bg-primary hover:bg-primary/90 text-white">
              <Link to={fallbackPath}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para o Painel Principal
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
