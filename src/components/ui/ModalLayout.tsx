import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ModalLayoutProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  className?: string;
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
          "flex flex-col p-0 overflow-hidden bg-white border-none rounded-none sm:rounded-[2rem] shadow-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh]",
          maxWidthClass,
          className
        )}
      >
        <DialogHeader className="p-6 md:p-8 border-b bg-slate-50 shrink-0 flex flex-row items-center justify-between text-left space-y-0">
          <div>
            <DialogTitle className="text-xl font-black text-navy uppercase tracking-tight">
              {title}
            </DialogTitle>
            {description && (
              <p className="text-xs text-muted-foreground font-medium mt-1">
                {description}
              </p>
            )}
          </div>
          {/* Close button is handled by DialogContent internally in some versions, 
              but we might want to ensure a consistent custom one if needed.
              DialogContent usually includes DialogPrimitive.Close.
          */}
        </DialogHeader>

        <ScrollArea className="flex-grow">
          <div className="p-6 md:p-8">
            {children}
          </div>
        </ScrollArea>

        {footer && (
          <DialogFooter className="p-6 md:p-8 bg-slate-50 border-t flex flex-row shrink-0 items-center justify-end gap-3 sm:space-x-0">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
