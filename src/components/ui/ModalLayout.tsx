import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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

export function StickyModalFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <DialogFooter
      className={cn(
        "bg-slate-50 border-t flex flex-row items-center justify-end gap-3 px-6 py-4 sm:px-8 sm:py-5 shrink-0 mt-auto",
        className,
      )}
    >
      {children}
    </DialogFooter>
  );
}

/**
 * Modal responsivo: header e footer fixos, conteúdo central com rolagem
 * interna garantida via overflow-y-auto (mais previsível que ScrollArea
 * dentro de Radix Dialog em mobile).
 */
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
          "flex flex-col p-0 overflow-hidden bg-white border-none rounded-none sm:rounded-[2rem] shadow-2xl",
          "h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh]",
          "animate-in zoom-in-95 fade-in duration-300",
          maxWidthClass,
          className,
        )}
      >
        <DialogHeader className="bg-slate-50 border-b flex flex-row items-center gap-4 text-left space-y-0 px-4 py-3 sm:px-6 sm:py-4 shrink-0">
          {showBackButton && (
            <BackNavigation onBack={onClose} label="Fechar" className="px-0 h-auto hover:bg-transparent -ml-1" />
          )}
          <div className="flex-grow overflow-hidden min-w-0">
            <DialogTitle className="text-lg sm:text-2xl font-black text-navy uppercase tracking-tight leading-none truncate">
              {title}
            </DialogTitle>
            {description && (
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-0.5 sm:mt-1 truncate">
                {description}
              </p>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="p-4 sm:p-6 md:p-10 pb-8">{children}</div>
        </div>

        {footer && <StickyModalFooter>{footer}</StickyModalFooter>}
      </DialogContent>
    </Dialog>
  );
}

