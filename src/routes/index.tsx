import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Anchor } from "lucide-react";

export const Route = createFileRoute("/")({
  component: RedirectToIndex,
});

function RedirectToIndex() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate({ to: "/dashboard" });
        } else {
          navigate({ to: "/home" });
        }
      } catch {
        navigate({ to: "/home" });
      }
    };
    checkSession();
  }, [navigate]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-navy text-white">
      <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
        <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/30">
          <Anchor className="h-8 w-8 text-navy" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-xl font-black uppercase tracking-tight text-white">
            NavalDocs <span className="text-primary">Pro</span>
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Carregando ecossistema...
          </p>
        </div>
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin mt-2" />
      </div>
    </div>
  );
}
