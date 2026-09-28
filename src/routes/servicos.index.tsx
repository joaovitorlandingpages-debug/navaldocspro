import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";

export const Route = createFileRoute("/servicos/")({
  validateSearch: (search: Record<string, unknown>) => ({
    from: (search.from as string) || undefined,
    vesselId: (search.vesselId as string) || undefined,
    customerId: (search.customerId as string) || undefined,
    preview: (search.preview as string) || undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <ServicosCategoriaPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

// Ícone vetorial estilizado de Embarcação Profissional (Barco de Trabalho / Comercial)
function ProfessionalVesselIllustration({ className = "w-32 h-24 text-[#075BFF]" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 120 90" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Mastro e Cabine */}
      <path d="M48 20V32" />
      <path d="M45 20H51" />
      <path d="M41 32H55V44H41V32Z" />
      <path d="M48 37H48.01" strokeWidth="3" />
      
      {/* Estrutura de Trabalho / Mastro de Pesca / Carga */}
      <path d="M72 26V52" />
      <path d="M55 42L85 28L88 50" />
      <path d="M72 34L85 40" />

      {/* Casco Principal */}
      <path d="M33 46H55V52H25L28 46H33Z" />
      <path d="M23 48L28 66C38 69 76 69 95 64L98 48H23Z" />

      {/* Janelas */}
      <circle cx="43" cy="53" r="1.5" fill="currentColor" />
      <circle cx="50" cy="53" r="1.5" fill="currentColor" />

      {/* Ondas do Mar */}
      <path d="M12 68C18 64 24 64 30 68C36 72 42 72 48 68C54 64 60 64 66 68C72 72 78 72 84 68C90 64 96 64 102 68C108 72 112 70 114 68" />
    </svg>
  );
}

// Ícone vetorial estilizado de Embarcação de Esporte e Recreio (Lancha Esportiva / Lazer)
function RecreationVesselIllustration({ className = "w-32 h-24 text-[#075BFF]" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 120 90" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Parabrisa e Cabine Esportiva */}
      <path d="M52 35L66 35L77 47H45L52 35Z" />
      <path d="M57 37L68 46" />

      {/* Casco Aerodinâmico */}
      <path d="M22 55L34 47H82L102 55L98 65C84 68 40 68 25 65L22 55Z" />
      
      {/* Linha Lateral Esportiva */}
      <path d="M30 54H92" strokeWidth="2" />

      {/* Ondas do Mar */}
      <path d="M10 68C16 64 22 64 28 68C34 72 40 72 46 68C52 64 58 64 64 68C70 72 76 72 82 68C88 64 94 64 100 68C106 72 110 70 114 68" />
    </svg>
  );
}

function ServicosCategoriaPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate();

  const handleSelectCategory = (categoryKey: "profissional" | "esporte_recreio") => {
    navigate({
      to: "/servicos/selecionar",
      search: {
        category: categoryKey,
        customerId: searchParams.customerId,
        vesselId: searchParams.vesselId,
        preview: searchParams.preview,
      },
    });
  };

  return (
    <div className="max-w-6xl mx-auto py-2 sm:py-6 px-2 sm:px-4 space-y-8">
      {/* 1. NAVEGAÇÃO SUPERIOR: VOLTAR */}
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#075BFF] hover:underline cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Voltar ao início</span>
        </Link>
      </div>

      {/* 2. CABEÇALHO DA PÁGINA */}
      <div>
        <h1 className="text-2xl sm:text-4xl font-bold text-[#0B1739] tracking-tight">
          Serviços
        </h1>
        <p className="text-xs sm:text-base text-slate-500 mt-1">
          Escolha a categoria da embarcação para continuar.
        </p>
      </div>

      {/* 3. DOIS GRANDES CARTÕES DE CATEGORIA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* CARTÃO 1: EMBARCAÇÕES PROFISSIONAIS */}
        <div 
          role="button"
          tabIndex={0}
          aria-label="Selecionar categoria Embarcações profissionais"
          onClick={() => handleSelectCategory("profissional")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleSelectCategory("profissional");
            }
          }}
          className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 flex flex-col items-center text-center justify-between shadow-xs hover:shadow-md hover:border-[#075BFF]/50 active:scale-[0.99] transition-all duration-200 min-h-[420px] group cursor-pointer select-none touch-manipulation"
        >
          {/* Caixa do Ícone */}
          <div className="w-48 h-36 rounded-3xl bg-[#EEF4FF] flex items-center justify-center p-4 mb-6 group-hover:scale-105 transition-transform duration-200 border border-blue-100">
            <ProfessionalVesselIllustration className="w-36 h-28 text-[#075BFF]" />
          </div>

          {/* Textos */}
          <div className="space-y-2 mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-[#0B1739] tracking-tight">
              Embarcações profissionais
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
              Veja os serviços disponíveis para esta categoria.
            </p>
          </div>

          {/* Botão de Ação */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSelectCategory("profissional");
            }}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-[#075BFF] hover:bg-blue-600 active:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
          >
            <span>Selecionar categoria</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* CARTÃO 2: EMBARCAÇÕES DE ESPORTE E RECREIO */}
        <div 
          role="button"
          tabIndex={0}
          aria-label="Selecionar categoria Embarcações de esporte e recreio"
          onClick={() => handleSelectCategory("esporte_recreio")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleSelectCategory("esporte_recreio");
            }
          }}
          className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 flex flex-col items-center text-center justify-between shadow-xs hover:shadow-md hover:border-[#075BFF]/50 active:scale-[0.99] transition-all duration-200 min-h-[420px] group cursor-pointer select-none touch-manipulation"
        >
          {/* Caixa do Ícone */}
          <div className="w-48 h-36 rounded-3xl bg-[#EEF4FF] flex items-center justify-center p-4 mb-6 group-hover:scale-105 transition-transform duration-200 border border-blue-100">
            <RecreationVesselIllustration className="w-36 h-28 text-[#075BFF]" />
          </div>

          {/* Textos */}
          <div className="space-y-2 mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-[#0B1739] tracking-tight">
              Embarcações de esporte e recreio
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
              Veja os serviços disponíveis para esta categoria.
            </p>
          </div>

          {/* Botão de Ação */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSelectCategory("esporte_recreio");
            }}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-[#075BFF] hover:bg-blue-600 active:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
          >
            <span>Selecionar categoria</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 4. MENSAGEM INFORMATIVA INFERIOR */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-4">
        <Info className="h-4 w-4 text-[#075BFF] shrink-0" />
        <span>Na próxima etapa, selecione o cliente, a embarcação e os serviços.</span>
      </div>
    </div>
  );
}
