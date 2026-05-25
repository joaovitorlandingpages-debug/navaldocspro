import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { BackNavigation } from "@/components/navigation/BackNavigation";

interface ModalLayoutProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  className?: string;
  showBackButton?: boolean;
}

export function ModalLayout({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "lg",
  className,
  showBackButton = false,
}: ModalLayoutProps) {
  const maxWidthClass = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
    "2xl": "sm:max-w-2xl",
    "3xl": "sm:max-w-3xl",
    "4xl": "sm:max-w-4xl",
    "5xl": "sm:max-w-5xl",
  }[maxWidth];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className={cn(
          "flex flex-col p-0 overflow-hidden bg-white border-none rounded-none sm:rounded-[2.5rem] shadow-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] animate-in zoom-in-95 fade-in duration-300",
          maxWidthClass,
          className
        )}
      >
        <DialogHeader className="bg-slate-50 border-b flex flex-row items-center gap-4 text-left space-y-0 px-6 py-4">
          {showBackButton && (
            <BackNavigation 
              onBack={onClose} 
              label="Fechar" 
              className="px-0 h-auto hover:bg-transparent -ml-1" 
            />
          )}
          <div className="flex-grow">
            <DialogTitle className="text-2xl font-black text-navy uppercase tracking-tight leading-none">
              {title}
            </DialogTitle>
            {description && (
              <p className="text-xs text-muted-foreground font-medium mt-1">
                {description}
              </p>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-grow">
          <div className="p-6 md:p-10">
            {children}
          </div>
        </ScrollArea>

        {footer && (
          <DialogFooter className="bg-slate-50 border-t flex flex-row items-center justify-end gap-3 sm:space-x-0 px-8 py-6">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
