import { LucideIcon } from "lucide-react";
import { Button } from "./ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center bg-white rounded-[2rem] border border-slate-100 shadow-sm animate-in fade-in duration-500">
      <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
        <Icon className="h-10 w-10 text-slate-300" />
      </div>
      <h3 className="text-xl font-black text-navy uppercase tracking-tight mb-2">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm mb-8 font-medium leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="bg-primary text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-primary/20 h-12 px-8">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
