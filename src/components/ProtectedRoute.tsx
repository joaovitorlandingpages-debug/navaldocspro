import { ReactNode, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const isPreview = typeof window !== 'undefined' && window.location.search.includes('preview=true');

  useEffect(() => {
    if (!loading && !isPreview) {
      if (!session) {
        console.log("PROTECTED_ROUTE_NO_SESSION");
        navigate({ to: "/auth/login", search: { redirect: window.location.pathname } });
      } else {
        console.log("PROTECTED_ROUTE_SESSION_OK");
      }
    } else {
      console.log("PROTECTED_ROUTE_LOADING");
    }
  }, [session, loading, navigate, isPreview]);

  if (loading && !isPreview) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="text-slate-400 font-bold uppercase tracking-widest animate-pulse">
          Carregando...
        </div>
      </div>
    );
  }

  if (!session && !isPreview) {
    return null;
  }

  return <>{children}</>;
};
