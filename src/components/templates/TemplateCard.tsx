import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Download, Star, Heart, ShoppingCart, Check } from "lucide-react";


export type TemplateCardProps = {
  name: string;
  description?: string | null;
  category: string;
  cover?: string | null;
  coverFallback?: ReactNode;

  author?: string;
  version?: string;
  rating?: number;
  downloads?: number;
  priceLabel: string;
  badges?: { label: string; tone?: "gold" | "blue" | "green" | "red" }[];
  isFavorite?: boolean;
  isOwned?: boolean;
  onPreview?: () => void;
  onPrimary?: () => void;
  onFavorite?: () => void;
  primaryLabel?: string;
  primaryIcon?: "use" | "buy" | "download";
};

const toneClass: Record<string, string> = {
  gold: "bg-amber-100 text-amber-800 border-amber-200",
  blue: "bg-blue-100 text-blue-800 border-blue-200",
  green: "bg-emerald-100 text-emerald-800 border-emerald-200",
  red: "bg-rose-100 text-rose-800 border-rose-200",
};

export function TemplateCard(p: TemplateCardProps) {
  const Icon = p.primaryIcon === "buy" ? ShoppingCart : p.primaryIcon === "download" ? Download : Check;
  return (
    <Card className="group overflow-hidden flex flex-col">
      <div className="relative aspect-[4/5] bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
        {p.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.cover} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Sem capa</div>
        )}
        {p.badges?.length ? (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {p.badges.map((b) => (
              <Badge key={b.label} variant="outline" className={toneClass[b.tone ?? "blue"]}>{b.label}</Badge>
            ))}
          </div>
        ) : null}
        {p.onFavorite ? (
          <button
            onClick={p.onFavorite}
            className="absolute top-2 right-2 size-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm hover:bg-white"
            aria-label="Favoritar"
          >
            <Heart className={`size-4 ${p.isFavorite ? "fill-rose-500 text-rose-500" : "text-slate-500"}`} />
          </button>
        ) : null}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="uppercase tracking-wide">{p.category}</span>
          {p.rating ? (
            <span className="flex items-center gap-1"><Star className="size-3 fill-amber-400 text-amber-400" />{p.rating.toFixed(1)}</span>
          ) : null}
        </div>
        <div className="font-semibold leading-tight">{p.name}</div>
        {p.description ? <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p> : null}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-2">
          <span>{p.author ?? "NavalDocs"} · v{p.version ?? "1.0"}</span>
          {typeof p.downloads === "number" ? <span>{p.downloads.toLocaleString("pt-BR")} downloads</span> : null}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="font-bold text-primary">{p.priceLabel}</span>
          <div className="flex gap-2">
            {p.onPreview ? (
              <Button size="sm" variant="outline" onClick={p.onPreview}><Eye className="size-4 mr-1" />Visualizar</Button>
            ) : null}
            {p.onPrimary ? (
              <Button size="sm" onClick={p.onPrimary} disabled={p.isOwned}>
                <Icon className="size-4 mr-1" />
                {p.isOwned ? "Adquirido" : p.primaryLabel ?? "Usar"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
