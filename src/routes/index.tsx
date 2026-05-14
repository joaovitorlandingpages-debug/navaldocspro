import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: RedirectToIndex,
});

function RedirectToIndex() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate({ to: "/dashboard" });
      } else {
        navigate({ to: "/home" });
      }
    });
  }, [navigate]);

  return null;
}
