import { createFileRoute, Link } from "@tanstack/react-router";
import { Anchor, Ship, FileText, CheckCircle, Shield, ArrowRight, Zap, Cpu, Activity, BarChart3, Building2, Users } from "lucide-react";

export const Route = createFileRoute("/demo")({
  component: DemoPage,
});

function DemoPage() {
  return (
    <div className="min-h-screen bg-navy text-white p-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-black mb-6">Ambiente de Demonstração</h1>
        <p className="text-xl mb-12 opacity-80">Explore as funcionalidades do NavalDocs Pro em um ambiente simulado com dados reais de engenharia naval.</p>
        
        <div className="grid md:grid-cols-2 gap-6">
           <div className="p-8 bg-white/5 rounded-2xl border border-white/10 hover:border-primary transition-all">
              <Ship className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Processos Navais</h3>
              <p className="text-sm opacity-60">Veja o fluxo completo de um processo de vistoria.</p>
              <Link to="/dashboard-v2" className="mt-6 block bg-primary text-white py-2 rounded-lg font-bold">Acessar</Link>
           </div>
           <div className="p-8 bg-white/5 rounded-2xl border border-white/10 hover:border-primary transition-all">
              <FileText className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Biblioteca Documental</h3>
              <p className="text-sm opacity-60">Explore modelos prontos de DPC e memoriais.</p>
              <Link to="/dashboard-v2" className="mt-6 block bg-blue-500 text-white py-2 rounded-lg font-bold">Acessar</Link>
           </div>
        </div>
      </div>
    </div>
  );
}
