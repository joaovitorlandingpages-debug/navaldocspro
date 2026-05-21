import { useState } from "react";
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Eye, Download, Maximize2, 
  Minimize2, ZoomIn, ZoomOut,
  Share2, FileText, X
} from "lucide-react";

interface PDFPreviewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  title: string;
}

export function PDFPreviewer({ isOpen, onClose, fileUrl, title }: PDFPreviewerProps) {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-5xl h-[90vh] p-0 flex flex-col overflow-hidden bg-slate-900 border-none rounded-2xl ${isFullscreen ? 'fixed inset-0 w-screen h-screen max-w-none rounded-none' : ''}`}>
        <DialogHeader className="bg-white border-b p-4 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <DialogTitle className="text-sm font-black uppercase tracking-tight truncate">{title}</DialogTitle>
              <DialogDescription className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Visualização Profissional NavalDocs</DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 mr-4 hidden sm:flex">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setZoom(Math.max(50, zoom - 10))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="px-2 text-[10px] font-black w-12 text-center">{zoom}%</span>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setZoom(Math.min(200, zoom + 10))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm" className="h-10 w-10 p-0 border-slate-200" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" className="h-10 w-10 p-0 border-slate-200" onClick={() => window.open(fileUrl, '_blank')}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0 hover:bg-red-50 hover:text-red-500" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 bg-slate-800 flex items-center justify-center overflow-auto p-4 md:p-10">
          <div 
            className="bg-white shadow-2xl transition-all duration-300 origin-top"
            style={{ 
              width: `${zoom}%`, 
              maxWidth: '100%',
              minWidth: '50%',
              aspectRatio: '1/1.414' 
            }}
          >
            <iframe 
              src={`${fileUrl}#toolbar=0`} 
              className="w-full h-full border-none"
              title="PDF Viewer"
            />
          </div>
        </div>

        <div className="bg-slate-900 border-t border-white/10 p-3 flex justify-center items-center gap-6">
          <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2 text-[10px] font-black uppercase tracking-widest">
            <Share2 className="h-4 w-4" /> Compartilhar
          </Button>
          <div className="h-4 w-px bg-white/10" />
          <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em]">Criptografia SSL de 256 bits • NavalDocs Pro v3.0</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
