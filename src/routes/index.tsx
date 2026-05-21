import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: RedirectToIndex,
});

function RedirectToIndex() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      console.log("INDEX_AUTH_CHECK");
      console.log("COMMERCIAL_FLOW_READY");
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log("INDEX_REDIRECT_DASHBOARD_V2");
        navigate({ to: "/dashboard" });
      } else {
        console.log("INDEX_REDIRECT_HOME");
        navigate({ to: "/home" });
      }
    };
    checkSession();
  }, [navigate]);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#000B18]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Iniciando sistema...</p>
      </div>
    </div>
  );
}
