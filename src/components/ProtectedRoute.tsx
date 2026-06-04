import { ReactNode, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!session) {
        console.log("PROTECTED_ROUTE_NO_SESSION");
        navigate({ to: "/auth/login" });
      } else {
        console.log("PROTECTED_ROUTE_SESSION_OK");
      }
    } else {
      console.log("PROTECTED_ROUTE_LOADING");
    }
  }, [session, loading, navigate]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#000B18]">
        <div className="text-white font-bold uppercase tracking-widest animate-pulse">
          Carregando...
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }


  return <>{children}</>;
};
