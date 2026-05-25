import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackNavigationProps {
  className?: string;
  fallback?: string;
  onBack?: () => void;
  label?: string;
  showOnMobile?: boolean;
}

export function BackNavigation({ 
  className, 
  fallback = "/dashboard", 
  onBack,
  label = "Voltar",
  showOnMobile = true 
}: BackNavigationProps) {
  const navigate = useNavigate();
  const routerState = useRouterState();

  const handleBack = () => {
    console.log("BACK_NAVIGATION_TRIGGERED", { 
      hasOnBack: !!onBack, 
      historyLength: window.history.length,
      currentPath: window.location.pathname 
    });

    if (onBack) {
      onBack();
      console.log("MODAL_BACK_ACTION_OK");
      return;
    }

    // Check if there is history to go back to within the app
    if (window.history.length > 1) {
      window.history.back();
      console.log("ROUTE_HISTORY_OK");
    } else {
      navigate({ to: fallback });
      console.log("BACK_NAVIGATION_FALLBACK_OK");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={cn(
        "h-9 px-2 sm:px-3 rounded-xl gap-1 sm:gap-2 font-black uppercase text-[9px] sm:text-[10px] tracking-widest text-slate-500 hover:text-navy hover:bg-slate-100 transition-all shrink-0",
        !showOnMobile && "hidden xs:flex",
        className
      )}
    >
      <ChevronLeft className="h-4 w-4" />
      <span className="hidden xs:inline">{label}</span>
      <span className="xs:hidden">Voltar</span>
    </Button>
  );
}
