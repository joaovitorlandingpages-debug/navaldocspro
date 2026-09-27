import { createFileRoute, Link } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { 
  FileSpreadsheet, 
  Award, 
  CalendarClock, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  ShieldCheck,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/nossos-aplicativos")({
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <NossosAplicativosPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

interface AppCardProps {
  title: string;
  badge: {
    label: string;
    variant: "active" | "soon";
  };
  description: string;
  features: string[];
  action: {
    label: string;
    to?: string;
    disabled?: boolean;
  };
  icon: React.ComponentType<{ className?: string }>;
}

function NossosAplicativosPage() {
  const apps: AppCardProps[] = [
    {
      title: "NavalDocs Pro",
      badge: {
        label: "Ativo no seu plano",
        variant: "active",
      },
      description: "Plataforma completa de automação de documentos, gestão de clientes, embarcações e processos na Capitania dos Portos.",
      features: [
        "Cadastro completo de clientes e embarcações",
        "Geração de procurações, termos e memoriais",
        "Acompanhamento de processos e prazos",
        "Leitor inteligente de documentos com OCR",
      ],
      action: {
        label: "Acessar aplicação",
        to: "/dashboard",
      },
      icon: FileSpreadsheet,
    },
    {
      title: "Arrais",
      badge: {
        label: "Em breve",
        variant: "soon",
      },
      description: "Módulo integrado para gestão de cursos náuticos, cadastros de alunos e emissão/renovação de Carteira de Habilitação de Amador (CHA).",
      features: [
        "Controle de turmas e aulas práticas",
        "Atestados de embarque e declarações",
        "Fluxo guiado para Capitania e agendamento de provas",
      ],
      action: {
        label: "Em breve",
        disabled: true,
      },
      icon: Award,
    },
    {
      title: "Central de Vencimentos",
      badge: {
        label: "Em breve",
        variant: "soon",
      },
      description: "Monitoramento inteligente de validades de certificados, vistorias periódicas, seguros DPEM e carteiras náuticas com alertas automáticos.",
      features: [
        "Painel unificado de vencimentos por cliente",
        "Notificações automáticas via WhatsApp e e-mail",
        "Relatórios de conformidade e prevenção de multas",
      ],
      action: {
        label: "Em breve",
        disabled: true,
      },
      icon: CalendarClock,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-2 sm:px-4">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1739] tracking-tight">
          Nossos Aplicativos
        </h1>
        <p className="text-sm text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
          Conheça os produtos do ecossistema NavalDocs projetados para modernizar e integrar toda a rotina naval e documental do seu negócio.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apps.map((app) => (
          <div
            key={app.title}
            className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-blue-200 transition-all"
          >
            <div>
              <div className="flex items-start justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl bg-[#EEF4FF] text-[#075BFF] flex items-center justify-center">
                  <app.icon className="h-7 w-7" />
                </div>
                {app.badge.variant === "active" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {app.badge.label}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    <Clock className="h-3 w-3 text-slate-400" />
                    {app.badge.label}
                  </span>
                )}
              </div>

              <h2 className="text-lg font-bold text-[#0B1739]">
                {app.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                {app.description}
              </p>

              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Recursos principais
                </p>
                <ul className="space-y-2">
                  {app.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-xs text-slate-600">
                      <CheckCircle2 className="h-4 w-4 text-[#075BFF] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-4">
              {app.action.disabled ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-xs font-semibold cursor-not-allowed text-center"
                >
                  {app.action.label}
                </button>
              ) : (
                <Link
                  to={app.action.to || "/dashboard"}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold transition-colors text-center shadow-xs"
                >
                  <span>{app.action.label}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
