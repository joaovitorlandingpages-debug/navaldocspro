import { ReactNode, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Anchor } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      console.log("PROTECTED_ROUTE_REDIRECT_TO_LOGIN");
      navigate({ to: "/auth/login" });
    }
  }, [session, loading, navigate]);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#000B18]">
        <div className="flex flex-col items-center gap-4 text-center">
          <Anchor className="h-12 w-12 text-blue-600 animate-spin" />
          <div className="space-y-1">
            <p className="text-white text-sm font-black uppercase tracking-widest">Sincronizando Sessão...</p>
            <p className="text-white/40 text-[10px] font-medium">NavalDocs Pro Security Engine</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Prevents flash before redirect
  }

  return <>{children}</>;
};
