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

export function PageHeader({
  title,
  description,
  actions,
  showBack = true,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-6 md:space-y-8 mb-8 animate-in fade-in duration-500", className)}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div className="flex flex-col gap-4 w-full sm:w-auto">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {showBack && <BackNavigation className="w-fit lg:hidden" />}
              <div className="flex items-center gap-2 overflow-hidden">
                <Breadcrumbs />
              </div>
            </div>
            
            <div className="mt-2">
              <h1 className="text-3xl md:text-4xl font-black text-navy tracking-tight uppercase leading-none">
                {title}
              </h1>
              {description && (
                <p className="text-slate-500 font-bold text-xs md:text-sm uppercase tracking-widest mt-2 italic">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {actions && (
          <div className="flex flex-wrap gap-3 w-full sm:w-auto justify-start sm:justify-end">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
