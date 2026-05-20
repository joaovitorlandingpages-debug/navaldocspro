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
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log("INDEX_REDIRECT_DASHBOARD");
        navigate({ to: "/dashboard" });
      } else {
        console.log("INDEX_REDIRECT_HOME");
        navigate({ to: "/home" });
      }
    };
    checkSession();
  }, [navigate]);

  return null;
}
