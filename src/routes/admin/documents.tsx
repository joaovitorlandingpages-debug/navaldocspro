import { createFileRoute } from "@tanstack/react-router";
import { FileStack, Plus, Settings, Loader2 } from "lucide-react";
import { useDocuments } from "@/hooks/useDocuments";

export const Route = createFileRoute("/admin/documents")({
  component: AdminDocuments,
});

function AdminDocuments() {
  const { templates, isLoadingTemplates } = useDocuments();
  const docs = templates || [];

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-navy">Biblioteca Master</h2>
          <p className="text-slate-500 text-xs italic">Gestão de templates globais e modelos normativos.</p>
        </div>
        <button className="bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2">
          <Plus className="h-4 w-4" /> Novo Template
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoadingTemplates ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
            <p className="text-slate-500 font-medium">Carregando templates...</p>
          </div>
        ) : docs.length === 0 ? (
          <div className="col-span-full text-center py-20 border-2 border-dashed rounded-3xl">
            <FileStack className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Nenhum template cadastrado.</p>
          </div>
        ) : docs.map((doc: any) => (
          <div key={doc.id} className="bg-white border p-6 rounded-3xl shadow-sm">
            <h4 className="font-bold text-navy">{doc.name}</h4>
            <p className="text-xs text-slate-400 mt-2">{doc.category}</p>
          </div>
        ))}
      </div>
    </div>
  );
}