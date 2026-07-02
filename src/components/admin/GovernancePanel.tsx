import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Activity, Target, Zap } from "lucide-react";

export function GovernancePanel() {
  const standards = [
    { name: "Naming Conventions", status: "Certified", score: 100 },
    { name: "Component Patterns", status: "Standardized", score: 98 },
    { name: "Security Protocols", status: "Active", score: 100 },
    { name: "OCR/PDF Accuracy", status: "Verified", score: 99 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="rounded-3xl border-slate-100 shadow-sm">
        <CardHeader className="p-6 border-b border-slate-50">
          <CardTitle className="text-sm font-black text-navy uppercase flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Governança de Padrões
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {standards.map((s, i) => (
            <div key={i} className="flex items-center justify-between p-4 border-b border-slate-50">
              <span className="text-xs font-bold text-navy uppercase">{s.name}</span>
              <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-none text-[9px] font-black">{s.status} ({s.score}%)</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="rounded-3xl border-slate-100 shadow-sm">
        <CardHeader className="p-6 border-b border-slate-50">
          <CardTitle className="text-sm font-black text-navy uppercase flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Auditoria Contínua
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex items-center justify-center">
            <div className="text-center">
                <Target className="h-12 w-12 text-primary/20 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-400 uppercase">Score de Qualidade Contínua</p>
                <h2 className="text-4xl font-semibold text-navy mt-1">98.5%</h2>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
