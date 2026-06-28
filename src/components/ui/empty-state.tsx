import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Padronized empty state used across lists, tables and tabs.
 * Single source of truth — keep visuals consistent.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        "rounded-xl border border-dashed border-border bg-card/40",
        "px-6 py-12 animate-fade-in",
        className,
      )}
    >
      {Icon ? (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? (
        <Button onClick={action.onClick} className="mt-5" size="sm">
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
