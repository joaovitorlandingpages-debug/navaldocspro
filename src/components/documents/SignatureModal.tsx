import { useState, useRef } from "react";
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { documentService } from "@/services/documentService";
import { toast } from "sonner";
import { Signature, Type, Upload, PenTool } from "lucide-react";

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  onSuccess: () => void;
}

export function SignatureModal({ isOpen, onClose, documentId, onSuccess }: SignatureModalProps) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("drawn");
  const [isSigning, setIsSigning] = useState(false);
  const [typedName, setTypedName] = useState(profile?.full_name || "");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.beginPath();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSign = async () => {
    if (!profile) return;
    setIsSigning(true);
    try {
      let signatureData = "";
      if (activeTab === "drawn") {
        signatureData = canvasRef.current?.toDataURL() || "";
      } else if (activeTab === "typed") {
        signatureData = typedName;
      }

      await documentService.signDocument({
        document_id: documentId,
        user_id: profile.id,
        company_id: profile.company_id,
        signer_name: profile.full_name || "Usuário",
        signer_role: "Responsável",
        signature_type: activeTab as any,
        signature_data: signatureData
      });

      toast.success("Documento assinado com sucesso!");
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao assinar documento.");
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 uppercase tracking-tight font-black">
            <Signature className="h-5 w-5 text-primary" /> Assinatura Digital
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="drawn" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full mb-6">
            <TabsTrigger value="drawn" className="text-[10px] font-black uppercase tracking-widest gap-2">
              <PenTool className="h-3.5 w-3.5" /> Desenhar
            </TabsTrigger>
            <TabsTrigger value="typed" className="text-[10px] font-black uppercase tracking-widest gap-2">
              <Type className="h-3.5 w-3.5" /> Digitar
            </TabsTrigger>
            <TabsTrigger value="upload" className="text-[10px] font-black uppercase tracking-widest gap-2">
              <Upload className="h-3.5 w-3.5" /> Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drawn" className="space-y-4">
            <div className="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 relative">
              <canvas
                ref={canvasRef}
                width={400}
                height={200}
                className="w-full h-[200px] cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseMove={draw}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={draw}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute bottom-2 right-2 text-[10px] font-black uppercase tracking-widest text-slate-400"
                onClick={clearCanvas}
              >
                Limpar
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="typed" className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome Completo</Label>
              <Input 
                value={typedName} 
                onChange={(e) => setTypedName(e.target.value)}
                className="text-xl font-serif italic text-center py-8"
                placeholder="Seu nome aqui..."
              />
            </div>
          </TabsContent>

          <TabsContent value="upload" className="py-10 text-center border-2 border-dashed border-slate-200 rounded-xl">
             <Upload className="h-8 w-8 text-slate-300 mx-auto mb-2" />
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Arraste sua assinatura aqui</p>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto font-black uppercase tracking-widest text-[10px]">
            Cancelar
          </Button>
          <Button 
            onClick={handleSign} 
            disabled={isSigning}
            className="w-full sm:w-auto bg-primary text-white font-black uppercase tracking-widest text-[10px] px-8"
          >
            {isSigning ? "Assinando..." : "Confirmar Assinatura"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
