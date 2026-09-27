import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { couponService, CouponItem } from '@/services/billing/couponService';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  RefreshCw, CheckCircle2, AlertCircle, Clock, Search,
  Zap, ZapOff, Tag, ExternalLink, Info
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/** Status de sincronização exibível por cupom */
type StripeSyncDisplay = 'synced' | 'pending' | 'error' | 'n_a';

function getCouponSyncStatus(coupon: CouponItem): StripeSyncDisplay {
  if (coupon.type === 'trial_extension') return 'n_a';
  if (coupon.stripe_coupon_id && coupon.stripe_promotion_code_id) return 'synced';
  if (coupon.stripe_coupon_id && !coupon.stripe_promotion_code_id) return 'error';
  return 'pending';
}

function SyncBadge({ status }: { status: StripeSyncDisplay }) {
  if (status === 'synced') {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold gap-1 px-2">
        <CheckCircle2 className="h-2.5 w-2.5" /> Stripe Sincronizado
      </Badge>
    );
  }
  if (status === 'pending') {
    return (
      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold gap-1 px-2">
        <Clock className="h-2.5 w-2.5" /> Pendente Sync
      </Badge>
    );
  }
  if (status === 'error') {
    return (
      <Badge className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold gap-1 px-2">
        <AlertCircle className="h-2.5 w-2.5" /> Erro Parcial
      </Badge>
    );
  }
  return (
    <Badge className="bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-medium px-2">
      N/A
    </Badge>
  );
}

export function AdminCouponStripePanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [syncErrors, setSyncErrors] = useState<Record<string, string>>({});

  const { data: coupons = [], isLoading, refetch } = useQuery<CouponItem[]>({
    queryKey: ['admin-coupons-stripe'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CouponItem[];
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (couponId: string) => {
      setSyncingId(couponId);
      setSyncErrors(prev => { const n = { ...prev }; delete n[couponId]; return n; });
      return await couponService.syncCouponWithStripe(couponId);
    },
    onSuccess: (result, couponId) => {
      setSyncingId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-coupons-stripe'] });
      toast.success(result.message || 'Cupom sincronizado com a Stripe.');
    },
    onError: (err: any, couponId) => {
      setSyncingId(null);
      const msg = err.message || 'Erro desconhecido ao sincronizar.';
      setSyncErrors(prev => ({ ...prev, [couponId]: msg }));
      toast.error(`Erro ao sincronizar cupom: ${msg}`);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (couponId: string) => {
      setDeactivatingId(couponId);
      return await couponService.deactivateCouponInStripe(couponId);
    },
    onSuccess: (result, couponId) => {
      setDeactivatingId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-coupons-stripe'] });
      toast.success(result.message || 'Cupom desativado na Stripe.');
    },
    onError: (err: any, couponId) => {
      setDeactivatingId(null);
      const msg = err.message || 'Erro desconhecido ao desativar.';
      setSyncErrors(prev => ({ ...prev, [couponId]: msg }));
      toast.error(`Erro ao desativar cupom na Stripe: ${msg}`);
    },
  });

  const filtered = coupons.filter(c => {
    const q = search.toLowerCase();
    return !q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
  });

  const pendingCount = coupons.filter(c => getCouponSyncStatus(c) === 'pending').length;
  const syncedCount = coupons.filter(c => getCouponSyncStatus(c) === 'synced').length;
  const errorCount = coupons.filter(c => getCouponSyncStatus(c) === 'error').length;

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#0d2342]">Cupons & Sincronização Stripe</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Gerencie a sincronização de cupons de desconto com a API da Stripe.
              Cada cupom precisa ter um <code className="bg-slate-100 px-1 rounded">stripe_coupon_id</code>{' '}
              e <code className="bg-slate-100 px-1 rounded">stripe_promotion_code_id</code> para ser aplicado no checkout.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs font-semibold shrink-0 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 bg-emerald-50 border-emerald-100 rounded-xl">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Sincronizados</p>
            <p className="text-2xl font-black text-emerald-700 mt-0.5">{syncedCount}</p>
          </Card>
          <Card className="p-3 bg-amber-50 border-amber-100 rounded-xl">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pendentes</p>
            <p className="text-2xl font-black text-amber-700 mt-0.5">{pendingCount}</p>
          </Card>
          <Card className="p-3 bg-rose-50 border-rose-100 rounded-xl">
            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Com Erro</p>
            <p className="text-2xl font-black text-rose-700 mt-0.5">{errorCount}</p>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cupom por código ou nome..."
            className="pl-9 text-xs h-9 border-slate-200 rounded-xl"
          />
        </div>

        {/* Table */}
        <Card className="rounded-2xl border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <th className="px-5 py-3">Código / Nome</th>
                  <th className="px-5 py-3">Tipo / Desconto</th>
                  <th className="px-5 py-3">Status Stripe</th>
                  <th className="px-5 py-3">IDs Stripe</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-xs">
                      Carregando cupons...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-xs">
                      <Tag className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold">Nenhum cupom encontrado</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(coupon => {
                    const syncStatus = getCouponSyncStatus(coupon);
                    const isSyncing = syncingId === coupon.id;
                    const isDeactivating = deactivatingId === coupon.id;
                    const syncErr = syncErrors[coupon.id];
                    const isTrialType = coupon.type === 'trial_extension';

                    let discountLabel = '';
                    if (coupon.type === 'trial_extension') {
                      discountLabel = `+${coupon.trial_days || 0} dias trial`;
                    } else if (coupon.type === 'percent') {
                      discountLabel = `${coupon.discount_percent || 0}% off`;
                    } else {
                      discountLabel = `R$ ${(coupon.discount_fixed || 0).toFixed(2)} off`;
                    }

                    return (
                      <tr key={coupon.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-[#0d2342] font-mono tracking-wide">{coupon.code}</div>
                          <div className="text-[11px] text-slate-500">{coupon.name}</div>
                          {!coupon.is_active && (
                            <Badge className="mt-1 bg-slate-100 text-slate-500 border-none text-[9px]">Inativo</Badge>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          <Badge className={`text-[10px] font-semibold px-2 py-0.5 ${
                            coupon.type === 'trial_extension'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : coupon.type === 'percent'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-teal-50 text-teal-700 border border-teal-200'
                          }`}>
                            {discountLabel}
                          </Badge>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="space-y-1">
                            <SyncBadge status={syncStatus} />
                            {syncErr && (
                              <div className="text-[10px] text-rose-600 font-medium max-w-[220px] flex items-start gap-1">
                                <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{syncErr}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          {isTrialType ? (
                            <span className="text-[10px] text-slate-400 italic">Não aplicável</span>
                          ) : (
                            <div className="space-y-0.5 font-mono text-[10px] text-slate-500">
                              {coupon.stripe_coupon_id ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400">coupon:</span>
                                  <span className="text-slate-600 truncate max-w-[140px]">{coupon.stripe_coupon_id}</span>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <ExternalLink className="h-3 w-3 text-slate-400 hover:text-blue-500 cursor-pointer" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">Ver no Dashboard Stripe</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              ) : (
                                <span className="text-amber-500">⚠ sem coupon_id</span>
                              )}
                              {coupon.stripe_promotion_code_id ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400">promo:</span>
                                  <span className="text-slate-600 truncate max-w-[140px]">{coupon.stripe_promotion_code_id}</span>
                                </div>
                              ) : (
                                coupon.stripe_coupon_id && (
                                  <span className="text-rose-500">⚠ sem promo_code_id</span>
                                )
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!isTrialType && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isSyncing || isDeactivating}
                                onClick={() => syncMutation.mutate(coupon.id)}
                                className={`h-7 text-[10px] font-bold gap-1 ${
                                  syncStatus === 'synced'
                                    ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                    : 'border-[#1868db] text-[#1868db] hover:bg-blue-50'
                                }`}
                              >
                                {isSyncing ? (
                                  <><RefreshCw className="h-3 w-3 animate-spin" /> Sincronizando</>
                                ) : (
                                  <><Zap className="h-3 w-3" /> {syncStatus === 'synced' ? 'Ressincronizar' : 'Sincronizar Stripe'}</>
                                )}
                              </Button>
                            )}

                            {!isTrialType && coupon.stripe_coupon_id && coupon.is_active && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isSyncing || isDeactivating}
                                    onClick={() => deactivateMutation.mutate(coupon.id)}
                                    className="h-7 text-[10px] font-bold gap-1 border-rose-200 text-rose-600 hover:bg-rose-50"
                                  >
                                    {isDeactivating ? (
                                      <><RefreshCw className="h-3 w-3 animate-spin" /> Desativando</>
                                    ) : (
                                      <><ZapOff className="h-3 w-3" /> Desativar</>
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Deleta o cupom na Stripe e marca como inativo no banco</p>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {isTrialType && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-4 w-4 text-slate-400" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Cupons de extensão de trial não são sincronizados<br />com a Stripe (não geram cobranças)</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
}
