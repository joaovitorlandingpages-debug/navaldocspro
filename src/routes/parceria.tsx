import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Users, DollarSign, TrendingUp, Share2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/parceria")({
  component: () => (
    <ProtectedRoute>
      <PartnerProgram />
    </ProtectedRoute>
  ),
});

const COMMISSION_RATE = 0.2; // 20% recorrente

function PartnerProgram() {
  const { data: profile } = useQuery({
    queryKey: ["profile-partner"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("id, company_id, email, name")
        .eq("id", u.user.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: partners = [] } = useQuery({
    queryKey: ["partners", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, name, email, type, is_active, created_at")
        .eq("company_id", profile!.company_id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const referralCode = useMemo(() => {
    if (!profile?.id) return "";
    return `NDP-${profile.id.slice(0, 8).toUpperCase()}`;
  }, [profile?.id]);

  const referralLink = useMemo(
    () => `${window.location.origin}/auth/signup?ref=${referralCode}`,
    [referralCode],
  );

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const stats = {
    total: partners.length,
    active: partners.filter((p) => p.is_active).length,
    estimatedMrr: partners.filter((p) => p.is_active).length * 297, // mock R$ 297/mês por indicado ativo
  };
  const estimatedCommission = stats.estimatedMrr * COMMISSION_RATE;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Programa de Parceria</h1>
        <p className="text-muted-foreground">
          Indique a NavalDocs Pro e ganhe 20% recorrente sobre cada cliente ativo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Indicados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{stats.active} ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">MRR Gerado (est.)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.estimatedMrr.toLocaleString("pt-BR")}
            </div>
            <p className="text-xs text-muted-foreground">base: R$ 297/cliente</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Comissão Mensal (est.)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              R$ {estimatedCommission.toLocaleString("pt-BR")}
            </div>
            <p className="text-xs text-muted-foreground">20% recorrente</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" /> Seu Link de Indicação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Código</label>
            <div className="flex gap-2 mt-1">
              <Input value={referralCode} readOnly />
              <Button variant="outline" onClick={() => copy(referralCode, "Código")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Link completo</label>
            <div className="flex gap-2 mt-1">
              <Input value={referralLink} readOnly />
              <Button onClick={() => copy(referralLink, "Link")}>
                <Copy className="h-4 w-4 mr-2" /> Copiar
              </Button>
            </div>
          </div>
          <div className="rounded-lg bg-muted p-4 text-sm space-y-1">
            <p className="font-medium">Como funciona:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Compartilhe seu link com engenheiros e despachantes navais</li>
              <li>Eles recebem 1º mês grátis ao se cadastrar pelo seu link</li>
              <li>Você ganha 20% do valor mensal enquanto eles forem clientes</li>
              <li>Comissões pagas mensalmente via PIX</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meus Indicados ({partners.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {partners.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Ainda nenhuma indicação. Compartilhe seu link para começar.
            </p>
          ) : (
            <div className="space-y-2">
              {partners.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </div>
                  <Badge variant={p.is_active ? "default" : "secondary"}>
                    {p.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Estimativas baseadas em plano médio R$ 297/mês. Valores reais aparecerão após
        integração com Mercado Pago.
      </p>
    </div>
  );
}

console.log("PARTNER_PROGRAM_READY");
