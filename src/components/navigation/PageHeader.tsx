import React from "react";
import { BackNavigation } from "./BackNavigation";
import { Breadcrumbs } from "../Breadcrumbs";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  showBack?: boolean;
  className?: string;
}

/**
 * Standard PageHeader for all pages.
 * Ensures consistent title, breadcrumbs, and actions across the app.
 */
export function PageHeader({
  title,
  description,
  actions,
  showBack = true,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4 sm:space-y-8 mb-6 sm:mb-8 animate-in fade-in duration-500", className)}>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 sm:gap-6">
        <div className="flex flex-col gap-3 sm:gap-4 w-full lg:w-auto">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {showBack && (
                <BackNavigation 
                  className="w-fit h-10 px-3 bg-white border border-slate-100 shadow-sm" 
                  label="Voltar"
                />
              )}
              <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-[200px]">
                <Breadcrumbs />
              </div>
            </div>
            
            <div className="mt-1 sm:mt-2">
              <h1 className="text-xl sm:text-2xl font-semibold text-navy leading-tight break-words">
                {title}
              </h1>
              {description && (
                <p className="text-muted-foreground text-sm mt-1.5 max-w-2xl leading-relaxed">
                  {description}
                </p>
              )}
            </div>

          </div>
        </div>
        
        {actions && (
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full lg:w-auto justify-start lg:justify-end mt-2 lg:mt-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

