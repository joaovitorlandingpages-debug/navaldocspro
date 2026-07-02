import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Copy, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PDF_TEMPLATES, type PdfTemplateId } from "@/services/companyBranding";
import { CATEGORY_OF, TEMPLATE_CATEGORIES, type TemplateCategory } from "@/services/companyPdfTemplates";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called with the base template the user chose (either from scratch default or duplicated). */
  onPick: (base: PdfTemplateId, mode: "scratch" | "duplicate") => void;
  /** Default base used for "Do Zero". */
  defaultBase?: PdfTemplateId;
}

export function NewTemplateDialog({ open, onClose, onPick, defaultBase = "classico" }: Props) {
  const [step, setStep] = useState<"mode" | "gallery">("mode");

  const grouped = useMemo(() => {
    const map = new Map<TemplateCategory, typeof PDF_TEMPLATES>();
    for (const t of PDF_TEMPLATES) {
      const c = CATEGORY_OF[t.id];
      if (!map.has(c)) map.set(c, [] as any);
      (map.get(c) as any).push(t);
    }
    return map;
  }, []);

  if (!open) return null;

  const close = () => { setStep("mode"); onClose(); };

  return createPortal(
    <div className="fixed inset-0 z-[190] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        <div className="h-14 px-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {step === "gallery" && (
              <button onClick={() => setStep("mode")} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-sm font-semibold text-navy">
              {step === "mode" ? "Novo Template" : "Escolha o template base"}
            </h2>
          </div>
          <button onClick={close} className="p-2 text-slate-400 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === "mode" ? (
          <div className="p-6 grid sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => onPick(defaultBase, "scratch")}
              className="group text-left rounded-2xl border-2 border-slate-200 hover:border-primary p-6 transition-all bg-gradient-to-br from-white to-slate-50"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary grid place-items-center mb-4 group-hover:scale-110 transition-transform">
                <Plus className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-navy mb-1">Criar do Zero</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Começa com um modelo neutro e você personaliza tudo: cores, rodapé,
                marca d'água, assinatura e carimbo.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStep("gallery")}
              className="group text-left rounded-2xl border-2 border-slate-200 hover:border-primary p-6 transition-all bg-gradient-to-br from-white to-slate-50"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary grid place-items-center mb-4 group-hover:scale-110 transition-transform">
                <Copy className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-navy mb-1">Duplicar Template Existente</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Escolha um dos 20 modelos oficiais e crie uma cópia editável.
                Os originais permanecem intactos.
              </p>
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {Array.from(grouped.entries()).map(([cat, tpls]) => (
              <div key={cat}>
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">
                  {TEMPLATE_CATEGORIES.find((c) => c.id === cat)?.label ?? cat}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {tpls.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onPick(t.id, "duplicate")}
                      className="text-left rounded-xl border border-slate-200 hover:border-primary hover:shadow-md p-3 transition-all bg-white"
                    >
                      <div className="aspect-[3/4] rounded-md bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 mb-2 grid place-items-center">
                        <Check className="h-5 w-5 text-slate-300" />
                      </div>
                      <div className="text-[11px] font-black uppercase tracking-wider text-navy truncate">{t.label}</div>
                      <div className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{t.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="h-14 px-5 border-t border-slate-200 flex items-center justify-end shrink-0">
          <Button variant="ghost" onClick={close} className="text-slate-500">Cancelar</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
