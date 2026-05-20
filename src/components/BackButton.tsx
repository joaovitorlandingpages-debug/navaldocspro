import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  className?: string;
  fallback?: string;
}

export function BackButton({ className, fallback = "/dashboard" }: BackButtonProps) {
  const navigate = useNavigate();
  const routerState = useRouterState();

  const handleBack = () => {
    // Check if there is history to go back to
    // Simplified check: if current location isn't just '/', try to go back
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate({ to: fallback });
    }
    console.log("BACK_BUTTON_OK");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={cn(
        "h-9 px-3 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-navy hover:bg-slate-100 transition-all",
        className
      )}
    >
      <ChevronLeft className="h-4 w-4" />
      Voltar
    </Button>
  );
}
