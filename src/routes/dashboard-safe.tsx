import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const Route = createFileRoute("/dashboard-safe")({
  component: () => (
    <ProtectedRoute>
      <DashboardSafe />
    </ProtectedRoute>
  ),
});

function DashboardSafe() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6 space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Seguro Carregado</h1>
        
        <div className="space-y-2 text-sm text-slate-600">
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>User ID:</strong> {user?.id}</p>
        </div>

        <button 
          onClick={() => signOut()}
          className="w-full bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition-colors"
        >
          Sair
        </button>

        <div className="pt-4 border-t text-[10px] text-slate-400 uppercase tracking-widest text-center">
          NavalDocs Pro - Diagnóstico Modo Seguro
        </div>
      </div>
    </div>
  );
}
