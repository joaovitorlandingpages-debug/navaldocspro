import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Gift, Plus, Edit2, Tag, Calendar, Users, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { couponService, CouponItem } from "@/services/billing/couponService";
import { CampaignEditorDialog } from "@/components/admin/CampaignEditorDialog";
import { toast } from "sonner";

interface CampaignManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CampaignManagerDialog: React.FC<CampaignManagerDialogProps> = ({
  isOpen,
  onClose
}) => {
  const queryClient = useQueryClient();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<CouponItem | null>(null);

  const { data: coupons = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-coupons-list"],
    queryFn: async () => {
      try {
        return await couponService.listAdminCoupons();
      } catch (e) {
        console.warn("Nenhum cupom retornado ou tabela inicial vazia:", e);
        return [];
      }
    },
    enabled: isOpen
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: boolean }) => {
      return await couponService.toggleCouponActive(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons-list"] });
      toast.success("Status da campanha atualizado com sucesso!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao alterar status da campanha.");
    }
  });

  const handleNew = () => {
    setSelectedCampaign(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (c: CouponItem) => {
    setSelectedCampaign(c);
    setIsEditorOpen(true);
  };

  const getBenefitBadge = (c: CouponItem) => {
    if (c.type === "trial_extension") {
      return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Teste {c.trial_days || 60} dias</Badge>;
    }
    if (c.type === "percent") {
      return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">-{c.discount_percent}% desc.</Badge>;
    }
    if (c.type === "fixed") {
      return <Badge className="bg-purple-50 text-purple-700 border-purple-200">-R$ {c.discount_fixed} desc.</Badge>;
    }
    return null;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-[#1868db]">
                  <Gift className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-[#0d2342]">
                    Cupons & Campanhas Promocionais
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Gerencie códigos de parceria, cupons de desconto e extensões de teste.
                  </DialogDescription>
                </div>
              </div>
              <Button
                onClick={handleNew}
                className="bg-[#1868db] hover:bg-[#1557b8] text-white text-xs font-bold h-9 px-3.5 rounded-xl gap-1.5 shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Nova Campanha</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-3">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs">Carregando campanhas do banco...</span>
              </div>
            ) : coupons.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl p-6">
                <Tag className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700">Nenhuma campanha cadastrada</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Crie campanhas personalizadas de teste gratuito ou cupons de desconto quando desejar atrair novos escritórios.
                </p>
                <Button
                  onClick={handleNew}
                  variant="outline"
                  className="text-xs font-semibold text-primary border-primary hover:bg-blue-50 rounded-xl"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Criar primeira campanha
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {coupons.map((c) => (
                  <div
                    key={c.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      c.is_active ? "bg-white border-slate-200 shadow-2xs hover:border-slate-300" : "bg-slate-50/70 border-slate-200 opacity-60"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[#0d2342] bg-slate-100 px-2.5 py-0.5 rounded-md">
                          {c.code}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{c.name}</span>
                        {getBenefitBadge(c)}
                      </div>
                      {c.description && (
                        <p className="text-xs text-slate-500 line-clamp-1">{c.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium pt-0.5">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {c.redemption_count || 0} / {c.max_redemptions || "∞"} resgates
                        </span>
                        {c.valid_until && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Até {new Date(c.valid_until).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-500">
                          {c.is_active ? "Ativo" : "Inativo"}
                        </span>
                        <Switch
                          checked={c.is_active}
                          onCheckedChange={() => toggleMutation.mutate({ id: c.id, status: c.is_active })}
                          disabled={toggleMutation.isPending}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(c)}
                        className="h-8 px-2.5 text-xs text-slate-600 rounded-lg hover:text-primary"
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1" /> Editar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CampaignEditorDialog
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        campaignToEdit={selectedCampaign}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-coupons-list"] });
          refetch();
        }}
      />
    </>
  );
};
