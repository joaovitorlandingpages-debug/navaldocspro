import React from "react";
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

/**
 * Universal BackNavigation component that handles:
 * 1. Custom callbacks (modals/wizards)
 * 2. Route history navigation
 * 3. Fallback to dashboard
 */
export function BackNavigation({ 
  className, 
  fallback = "/dashboard", 
  onBack,
  label = "Voltar",
  showOnMobile = true 
}: BackNavigationProps) {
  const navigate = useNavigate();

  React.useEffect(() => {
    console.log("GLOBAL_BACK_NAVIGATION_READY");
    if (window.innerWidth <= 1024) {
      console.log("MOBILE_BACK_NAVIGATION_OK");
    }
  }, []);

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
      type="button"
      className={cn(
        "h-11 sm:h-12 px-3 sm:px-6 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest text-slate-500 hover:text-navy hover:bg-slate-100 transition-all shrink-0",
        !showOnMobile && "hidden sm:flex",
        className
      )}
    >
      <ChevronLeft className="h-5 w-5 sm:h-4 sm:w-4" />
      <span>{label}</span>
    </Button>
  );
}

