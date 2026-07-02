import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  BarChart3, Users, Building2, TrendingUp, 
  ShieldCheck, Zap, Cpu, Sparkles, 
  CheckCircle2, Clock, Smartphone, Globe,
  ArrowRight, PlayCircle, Rocket, Anchor
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/sales-center")({
  component: SalesCenterPage,
});

function SalesCenterPage() {
  const metrics = [
    { label: "Tempo Economizado", val: "75%", desc: "Redução em processos manuais", icon: Clock, color: "text-emerald-500" },
    { label: "Automação OCR", val: "98%", desc: "Precisão na extração de dados", icon: Zap, color: "text-amber-500" },
    { label: "Documentos Gerados", val: "+12k", desc: "PDFs automáticos emitidos", icon: CheckCircle2, color: "text-primary" },
    { label: "Retenção de Clientes", val: "94%", desc: "Satisfação no portal externo", icon: Users, color: "text-purple-500" },
  ];

  const features = [
    { title: "OCR Autônomo", desc: "Extração inteligente de TIE, RG, Memorial e mais.", icon: Cpu },
    { title: "Assinatura Digital", desc: "Fluxo 100% digital com validade jurídica.", icon: ShieldCheck },
    { title: "Portal do Cliente", desc: "Experiência premium para o cliente final.", icon: Globe },
    { title: "IA Operacional", desc: "Assistente que detecta pendências e sugere ações.", icon: Sparkles },
    { title: "Controle de Prazos", desc: "Alertas inteligentes de vencimentos.", icon: Clock },
    { title: "Mobile Ready", desc: "Operação completa na palma da mão.", icon: Smartphone },
  ];

  return (
    <div className="p-8 space-y-12 max-w-7xl mx-auto animate-in fade-in duration-700">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 font-black text-[10px] uppercase tracking-widest px-4 py-1">Apresentação NavalDocs Pro</Badge>
          <h1 className="text-5xl font-black text-navy uppercase tracking-tighter italic">Transforme sua <span className="text-primary">Operação Naval</span></h1>
          <p className="text-slate-500 font-medium text-lg mt-2">A plataforma definitiva para engenharia, compliance e gestão documental.</p>
        </div>
        <div className="flex gap-4">
           <Link to="/demo">
              <Button className="h-14 px-8 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl bg-navy hover:bg-slate-900 transition-all border border-navy/10">
                 Iniciar Demo <Rocket className="ml-3 h-4 w-4" />
              </Button>
           </Link>
           <Button variant="outline" className="h-14 px-8 rounded-2xl font-black text-[11px] uppercase tracking-widest border-slate-200">
              <PlayCircle className="mr-3 h-4 w-4" /> Ver Vídeo
           </Button>
        </div>
      </div>

      {/* Metrics section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((stat, i) => (
          <Card key={i} className="border-slate-100 shadow-xl shadow-slate-200/50 hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group">
            <CardContent className="p-8">
               <div className={`p-4 rounded-2xl bg-slate-50 mb-6 w-fit group-hover:scale-110 transition-transform ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
               </div>
               <h3 className="text-4xl font-black text-navy mb-1">{stat.val}</h3>
               <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">{stat.label}</p>
               <p className="text-xs text-slate-500 font-medium">{stat.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparison section */}
      <div className="grid md:grid-cols-2 gap-8">
         <Card className="border-slate-100 shadow-sm rounded-3xl bg-slate-50 overflow-hidden border-2 border-dashed">
            <CardHeader className="p-8">
               <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Antes: Operação Manual</CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-4">
               {[
                 "Documentos em papel e pastas físicas",
                 "Digitação manual de dados (erro humano)",
                 "Envio de arquivos via WhatsApp/Email",
                 "Prazos controlados em planilhas soltas",
                 "Assinaturas físicas (espera e custo)",
               ].map((item, i) => (
                 <div key={i} className="flex items-center gap-3 text-slate-400 opacity-60">
                    <div className="h-2 w-2 rounded-full bg-slate-300" />
                    <span className="text-sm font-medium">{item}</span>
                 </div>
               ))}
            </CardContent>
         </Card>

         <Card className="border-primary/20 shadow-2xl shadow-primary/10 rounded-3xl bg-white overflow-hidden relative border-2 ring-4 ring-primary/5">
            <div className="absolute top-0 right-0 p-4">
               <Badge className="bg-primary text-white font-black text-[9px] uppercase tracking-widest">Evolução</Badge>
            </div>
            <CardHeader className="p-8">
               <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Depois: NavalDocs Pro</CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-4">
               {[
                 "Central documental 100% digital e segura",
                 "OCR inteligente: extração automática em segundos",
                 "Portal do Cliente: uploads e acompanhamento",
                 "IA detecta pendências e sugere automações",
                 "Assinatura digital touch integrada e rápida",
               ].map((item, i) => (
                 <div key={i} className="flex items-center gap-3 text-navy">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm font-bold">{item}</span>
                 </div>
               ))}
            </CardContent>
         </Card>
      </div>

      {/* Features Grid */}
      <div className="space-y-8">
         <div className="text-center">
            <h2 className="text-3xl font-black text-navy uppercase tracking-tighter italic">Recursos Enterprise</h2>
            <p className="text-slate-500 font-medium">Tecnologia de ponta para o setor naval.</p>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
               <div key={i} className="p-8 bg-white border border-slate-100 rounded-2xl hover:shadow-xl transition-all group">
                  <div className="h-12 w-12 bg-primary/5 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                     <f.icon className="h-6 w-6" />
                  </div>
                  <h4 className="text-[13px] font-black uppercase tracking-tight text-navy mb-2">{f.title}</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{f.desc}</p>
               </div>
            ))}
         </div>
      </div>

      {/* CTA section */}
      <div className="p-12 bg-navy rounded-3xl text-center text-white relative overflow-hidden group">
         <div className="absolute top-0 left-0 w-full h-full bg-primary/10 blur-[100px] -ml-40 group-hover:bg-primary/20 transition-all duration-1000" />
         <div className="relative z-10 space-y-6">
            <h2 className="text-4xl font-black uppercase tracking-tighter italic italic">Pronto para <span className="text-primary">Escalar</span> seu Negócio?</h2>
            <p className="text-white/60 max-w-2xl mx-auto font-medium">Junte-se às empresas que já economizam milhares de horas com a automação documental naval.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
               <Link to="/demo">
                  <Button className="h-14 px-12 rounded-2xl font-black text-[12px] uppercase tracking-widest bg-primary hover:bg-blue-600 shadow-2xl shadow-primary/20">
                     Ver em Ação Agora <ArrowRight className="ml-3 h-5 w-5" />
                  </Button>
               </Link>
            </div>
         </div>
      </div>
      
      <div className="text-center py-8">
         <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-300">NavalDocs Pro • Enterprise Preparation 2026</p>
      </div>
    </div>
  );
}
