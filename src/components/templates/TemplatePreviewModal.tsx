import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { buildBrandedDocumentPdf } from "@/services/brandedPdfBuilder";
import type { CompanyBranding, PdfTemplateId } from "@/services/companyBranding";

type Props = {
  open: boolean;
  onClose: () => void;
  name: string;
  baseTemplate: PdfTemplateId;
  branding: CompanyBranding | null;
  sampleContent?: string;
  onApply?: () => void;
};

export function TemplatePreviewModal(p: Props) {
  const [pages, setPages] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);
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

  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 bg-white/10 text-white border-b border-white/10">
        <div className="font-semibold">{p.name}</div>
        <div className="flex items-center gap-2">
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
      <div ref={containerRef} className="flex-1 overflow-auto flex items-start justify-center p-6">
        {loading ? (
          <div className="text-white flex items-center gap-2 mt-20"><Loader2 className="size-5 animate-spin" /> Renderizando preview...</div>
        ) : pages[page] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pages[page]} alt={`Página ${page + 1}`} style={{ width: `${zoom * 800}px` }} className="bg-white shadow-2xl" />
        ) : (
          <div className="text-white mt-20">Sem páginas para exibir.</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
