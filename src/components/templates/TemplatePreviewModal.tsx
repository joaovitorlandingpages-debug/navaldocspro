import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Loader2, Monitor, Tablet, FileText, Printer, Briefcase } from "lucide-react";
import { buildBrandedDocumentPdf } from "@/services/brandedPdfBuilder";
import type { CompanyBranding, PdfTemplateId } from "@/services/companyBranding";

type Scene = "paper" | "desk" | "laptop" | "tablet" | "print";

type Props = {
  open: boolean;
  onClose: () => void;
  name: string;
  baseTemplate: PdfTemplateId;
  branding: CompanyBranding | null;
  sampleContent?: string;
  onApply?: () => void;
};

const SCENES: { id: Scene; label: string; icon: any }[] = [
  { id: "paper", label: "Papel", icon: FileText },
  { id: "desk", label: "Mesa", icon: Briefcase },
  { id: "laptop", label: "Notebook", icon: Monitor },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "print", label: "Impressão", icon: Printer },
];

export function TemplatePreviewModal(p: Props) {
  const [pages, setPages] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);
  const [scene, setScene] = useState<Scene>("paper");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!p.open) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const branding: CompanyBranding = {
          ...(p.branding ?? ({} as any)),
          company_name: p.branding?.company_name ?? "Empresa Demo",
          brand_primary_color: p.branding?.brand_primary_color ?? "#2563eb",
          brand_secondary_color: p.branding?.brand_secondary_color ?? "#0f172a",
          pdf_template: p.baseTemplate,
        } as CompanyBranding;
        const { bytes } = await buildBrandedDocumentPdf({
          docName: p.name,
          content:
            p.sampleContent ??
            `Este é um documento de demonstração do template "${p.name}".\n\nA identidade corporativa da empresa (logo, cores, contatos, responsável técnico, assinatura, carimbo e marca d'água) é aplicada automaticamente em todos os documentos gerados.\n\nSeção 1 — Objeto\nApresentação visual do modelo selecionado, com todos os elementos institucionais posicionados conforme o layout.\n\nSeção 2 — Conteúdo\nO conteúdo real do documento será inserido aqui quando o template for utilizado em um processo.\n\nSeção 3 — Encerramento\nDocumento emitido eletronicamente. Código de verificação disponível no rodapé.`,
          branding,
        });
        const pdfjs: any = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        const doc = await pdfjs.getDocument({ data: bytes }).promise;
        const out: string[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const pg = await doc.getPage(i);
          const viewport = pg.getViewport({ scale: 1.6 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;
          await pg.render({ canvasContext: ctx, viewport }).promise;
          out.push(canvas.toDataURL("image/png"));
        }
        if (alive) {
          setPages(out);
          setPage(0);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [p.open, p.baseTemplate, p.name]);

  if (!p.open || typeof document === "undefined") return null;

  const img = pages[page];
  const pageW = zoom * 760;

  const sceneStage = () => {
    if (!img) return <div className="text-white mt-20">Sem páginas para exibir.</div>;
    if (scene === "paper") {
      return <img src={img} alt={`Página ${page + 1}`} style={{ width: `${pageW}px` }} className="bg-white shadow-2xl rounded-sm ring-1 ring-black/10" />;
    }
    if (scene === "print") {
      return (
        <div className="relative p-10" style={{ background: "radial-gradient(circle at 50% 0%, #fafafa, #d4d4d8 70%)" }}>
          <div className="relative">
            <img src={img} alt="Página" style={{ width: `${pageW}px` }} className="bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] rounded-sm" />
            <div className="absolute inset-0 pointer-events-none ring-1 ring-black/5" />
          </div>
        </div>
      );
    }
    if (scene === "desk") {
      return (
        <div className="relative p-14 rounded-3xl shadow-2xl" style={{ background: "linear-gradient(135deg, #fff8ef 0%, #f0e1c8 100%)" }}>
          {/* wood grain */}
          <div className="absolute inset-0 opacity-30 rounded-3xl"
            style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(120,80,40,0.08) 0 3px, transparent 3px 22px)" }} />
          <div className="relative flex items-end gap-6">
            <div className="rotate-[-2deg] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)]">
              <img src={img} alt="Página" style={{ width: `${pageW}px` }} className="bg-white" />
            </div>
            <div className="hidden md:flex flex-col gap-3 pb-4">
              <div className="w-28 h-2 rounded-full bg-amber-900/60 shadow" />
              <div className="w-20 h-20 rounded-full bg-amber-200/80 border-4 border-amber-300 shadow flex items-center justify-center text-amber-900 text-xs font-black">SELO</div>
              <div className="w-28 h-28 rounded-md bg-white shadow-md rotate-[6deg]" />
            </div>
          </div>
        </div>
      );
    }
    if (scene === "laptop") {
      return (
        <div className="relative">
          <div className="rounded-t-2xl border-[10px] border-slate-800 bg-slate-900 shadow-2xl overflow-hidden" style={{ width: `${pageW + 60}px` }}>
            <div className="h-5 bg-slate-800 flex items-center justify-center"><div className="size-1.5 rounded-full bg-slate-600" /></div>
            <div className="bg-slate-100 p-5 flex justify-center">
              <img src={img} alt="Página" style={{ width: `${pageW}px` }} className="bg-white shadow-md" />
            </div>
          </div>
          <div className="h-3 rounded-b-2xl bg-gradient-to-b from-slate-700 to-slate-800 mx-[-30px] shadow-xl" />
          <div className="h-1 rounded-b-xl bg-slate-600 mx-[-50px]" />
        </div>
      );
    }
    if (scene === "tablet") {
      return (
        <div className="rounded-[28px] border-[14px] border-slate-900 bg-slate-900 shadow-2xl" style={{ width: `${pageW + 40}px` }}>
          <div className="bg-white rounded-md overflow-hidden">
            <img src={img} alt="Página" style={{ width: `${pageW}px` }} className="block" />
          </div>
        </div>
      );
    }
    return null;
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 bg-white/10 text-white border-b border-white/10">
        <div className="font-semibold truncate">{p.name}</div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="hidden md:flex items-center gap-1 mr-3 bg-white/10 rounded-full p-1">
            {SCENES.map((s) => (
              <button key={s.id} onClick={() => setScene(s.id)} className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs transition-colors ${scene === s.id ? "bg-white text-slate-900" : "text-white/80 hover:bg-white/10"}`}>
                <s.icon className="size-3" /> {s.label}
              </button>
            ))}
          </div>
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}><ZoomOut className="size-4" /></Button>
          <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}><ZoomIn className="size-4" /></Button>
          <div className="w-px h-6 bg-white/20 mx-2" />
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" disabled={page === 0} onClick={() => setPage((n) => n - 1)}><ChevronLeft className="size-4" /></Button>
          <span className="text-xs">{pages.length ? `${page + 1} / ${pages.length}` : "—"}</span>
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" disabled={page >= pages.length - 1} onClick={() => setPage((n) => n + 1)}><ChevronRight className="size-4" /></Button>
          <div className="w-px h-6 bg-white/20 mx-2" />
          {p.onApply ? <Button size="sm" onClick={p.onApply}>Usar neste processo</Button> : null}
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={p.onClose}><X className="size-4" /></Button>
        </div>
      </div>
      <div className="md:hidden flex items-center gap-1 px-4 py-2 bg-white/5 border-b border-white/10 overflow-x-auto">
        {SCENES.map((s) => (
          <button key={s.id} onClick={() => setScene(s.id)} className={`shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs ${scene === s.id ? "bg-white text-slate-900" : "text-white/80 bg-white/10"}`}>
            <s.icon className="size-3" /> {s.label}
          </button>
        ))}
      </div>
      <div ref={containerRef} className="flex-1 overflow-auto flex items-start justify-center p-6">
        {loading ? (
          <div className="text-white flex items-center gap-2 mt-20"><Loader2 className="size-5 animate-spin" /> Renderizando preview...</div>
        ) : (
          sceneStage()
        )}
      </div>
    </div>,
    document.body,
  );
}
