import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PDF_TEMPLATES, loadCompanyBranding, type CompanyBranding, type PdfTemplateId } from "@/services/companyBranding";
import { CATEGORY_OF } from "@/services/companyPdfTemplates";
import { buildBrandedDocumentPdf } from "@/services/brandedPdfBuilder";
import { TemplateCover } from "@/components/templates/TemplateCover";
import { TemplatePreviewModal } from "@/components/templates/TemplatePreviewModal";
import { addFreeToLibrary } from "@/services/marketplaceTemplates";
import {
  listVersions, listReviews, loadStats, upsertReview, registerDownload,
  type TemplateVersion, type TemplateReview, type TemplateStats,
} from "@/services/templateExperience";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Star, Download, Heart, Share2, ShoppingCart, Copy, Check, Eye,
  ArrowLeft, Sparkles, ShieldCheck, QrCode, Smartphone, Printer,
  Users, FileSignature,
} from "lucide-react";

export const Route = createFileRoute("/templates/$id")({
  component: () => (
    <ProtectedRoute>
      <TemplateDetailPage />
    </ProtectedRoute>
  ),
});

const FEATURES = [
  { icon: Sparkles, label: "Branding automático" },
  { icon: QrCode, label: "QR Code de verificação" },
  { icon: ShieldCheck, label: "Código de verificação" },
  { icon: FileSignature, label: "Rodapé inteligente" },
  { icon: Smartphone, label: "Responsivo" },
  { icon: Printer, label: "Compatível impressão" },
  { icon: Users, label: "Portal do Cliente" },
  { icon: FileSignature, label: "Assinatura Digital" },
];

function TemplateDetailPage() {
  const { id } = useParams({ from: "/templates/$id" });
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [branding, setBranding] = useState<CompanyBranding | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [reviews, setReviews] = useState<TemplateReview[]>([]);
  const [stats, setStats] = useState<TemplateStats>({ downloads: 0, rating: 0, reviews_count: 0 });
  const [showroom, setShowroom] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");

  const tpl = useMemo(() => PDF_TEMPLATES.find((t) => t.id === (id as PdfTemplateId)), [id]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
      if (p?.company_id) {
        setCompanyId(p.company_id);
        setBranding(await loadCompanyBranding(p.company_id));
      }
      const [v, r, s] = await Promise.all([listVersions(id), listReviews(id), loadStats(id)]);
      setVersions(v);
      setReviews(r);
      setStats(s);
    })();
  }, [user, id]);

  useEffect(() => {
    if (!tpl) return;
    let alive = true;
    (async () => {
      try {
        const b: CompanyBranding = {
          ...(branding ?? ({} as any)),
          company_name: branding?.company_name ?? "Empresa Demo",
          brand_primary_color: branding?.brand_primary_color ?? "#2563eb",
          brand_secondary_color: branding?.brand_secondary_color ?? "#0f172a",
          pdf_template: tpl.id,
        } as CompanyBranding;
        const { bytes } = await buildBrandedDocumentPdf({
          docName: tpl.label,
          content: `Apresentação do template "${tpl.label}".\n\n${tpl.description}\n\nIdeal para: ${tpl.bestFor}.\n\nTodos os elementos institucionais (logo, cores, contatos, responsável técnico, assinatura, carimbo e marca d'água) são aplicados automaticamente.`,
          branding: b,
        });
        const pdfjs: any = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        const doc = await pdfjs.getDocument({
          data: bytes,
          enableScripting: false,
          isEvalSupported: false,
          disableAutoFetch: true,
        }).promise;
        const out: string[] = [];
        for (let i = 1; i <= Math.min(doc.numPages, 4); i++) {
          const pg = await doc.getPage(i);
          const viewport = pg.getViewport({ scale: 1.2 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;
          await pg.render({ canvasContext: ctx, viewport }).promise;
          out.push(canvas.toDataURL("image/png"));
        }
        if (alive) setPages(out);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { alive = false; };
  }, [tpl, branding]);

  if (!tpl) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-md">
          <div className="text-lg font-bold mb-2">Template não encontrado</div>
          <p className="text-sm text-muted-foreground mb-4">O template solicitado não existe.</p>
          <Link to="/templates/gratuitos"><Button>Voltar ao catálogo</Button></Link>
        </Card>
      </div>
    );
  }

  const useTemplate = async () => {
    if (!companyId || !user) return toast.error("Empresa não carregada");
    try {
      await addFreeToLibrary(companyId, tpl.id, tpl.id);
      await registerDownload(tpl.id, user.id, companyId);
      setStats((s) => ({ ...s, downloads: s.downloads + 1 }));
      toast.success("Adicionado a Meus Templates");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao adicionar");
    }
  };

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) await navigator.share({ title: tpl.label, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copiado"); }
    } catch {/* user cancelled */}
  };

  const submitReview = async () => {
    if (!user) return toast.error("Faça login");
    if (myRating < 1) return toast.error("Selecione uma nota");
    try {
      await upsertReview(tpl.id, user.id, myRating, myComment.trim(), companyId);
      const [r, s] = await Promise.all([listReviews(tpl.id), loadStats(tpl.id)]);
      setReviews(r); setStats(s);
      setMyRating(0); setMyComment("");
      toast.success("Avaliação enviada");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao enviar");
    }
  };

  const category = CATEGORY_OF[tpl.id] ?? "geral";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/templates/gratuitos" className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="size-4" /> Voltar ao catálogo
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={share}><Share2 className="size-4 mr-1" />Compartilhar</Button>
            <Button variant="outline" size="sm"><Heart className="size-4 mr-1" />Favoritar</Button>
            <Button size="sm" onClick={useTemplate}><Check className="size-4 mr-1" />Usar</Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 grid lg:grid-cols-3 gap-8">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-start gap-6">
            <div className="w-32 h-40 rounded-xl overflow-hidden ring-1 ring-slate-200 shrink-0">
              <TemplateCover
                templateId={tpl.id}
                name={tpl.label}
                category={category}
                kind="free"
                logoUrl={branding?.logo_primary_url}
                primaryColor={branding?.brand_primary_color}
              />
            </div>
            <div className="flex-1">
              <Badge variant="outline" className="mb-2">{category.toUpperCase()}</Badge>
              <h1 className="text-3xl font-bold">{tpl.label}</h1>
              <p className="text-slate-600 mt-2">{tpl.description}</p>
              <div className="flex items-center gap-4 mt-4 text-sm">
                <span className="flex items-center gap-1 text-amber-600 font-semibold">
                  <Star className="size-4 fill-amber-500 text-amber-500" />
                  {stats.rating > 0 ? stats.rating.toFixed(1) : "Novo"}
                </span>
                <span className="text-slate-500"><Download className="inline size-4 mr-1" />{stats.downloads.toLocaleString("pt-BR")} downloads</span>
                <span className="text-slate-500">Versão {versions[0]?.version ?? "1.0"}</span>
              </div>
            </div>
          </div>

          {/* Preview */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Preview</h2>
              <Button variant="outline" size="sm" onClick={() => setShowroom(true)}>
                <Eye className="size-4 mr-1" />Showroom
              </Button>
            </div>
            {pages.length === 0 ? (
              <div className="aspect-[4/5] bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                Renderizando preview...
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {pages.map((src, i) => (
                  <div key={i} className="bg-white shadow ring-1 ring-slate-200 rounded overflow-hidden">
                    <img src={src} alt={`Página ${i + 1}`} className="w-full block" />
                    <div className="text-[10px] text-center py-1 text-slate-500">Página {i + 1}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Versions */}
          <Card className="p-5">
            <h2 className="text-lg font-bold mb-3">Histórico de versões</h2>
            {versions.length === 0 ? (
              <div className="text-sm text-slate-500">
                <div className="flex items-center justify-between border-l-2 border-primary pl-3 py-2">
                  <div>
                    <div className="font-semibold text-slate-900">Versão 1.0</div>
                    <div className="text-xs text-slate-500">Lançamento inicial</div>
                  </div>
                  <Badge variant="outline">Atual</Badge>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((v, idx) => (
                  <div key={v.id} className="border-l-2 border-primary pl-3 py-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">Versão {v.version}</div>
                      {idx === 0 && <Badge variant="outline">Atual</Badge>}
                    </div>
                    <div className="text-xs text-slate-500 mb-1">
                      {new Date(v.released_at).toLocaleDateString("pt-BR")}
                    </div>
                    {v.changelog.length > 0 && (
                      <ul className="text-sm text-slate-700 space-y-0.5">
                        {v.changelog.map((c, i) => <li key={i}>✔ {c}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Reviews */}
          <Card className="p-5">
            <h2 className="text-lg font-bold mb-3">Avaliações</h2>
            <div className="flex items-center gap-2 mb-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setMyRating(n)} aria-label={`${n} estrela`}>
                  <Star className={`size-6 ${n <= myRating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                </button>
              ))}
              <span className="text-sm text-slate-500 ml-2">{myRating > 0 ? `${myRating}/5` : "Sua nota"}</span>
            </div>
            <Textarea
              value={myComment}
              onChange={(e) => setMyComment(e.target.value)}
              placeholder="Comente sua experiência com este template..."
              className="mb-2"
              rows={3}
            />
            <Button size="sm" onClick={submitReview}>Enviar avaliação</Button>

            <div className="mt-5 space-y-3">
              {reviews.length === 0 && <p className="text-sm text-slate-500">Seja o primeiro a avaliar.</p>}
              {reviews.map((r) => (
                <div key={r.id} className="border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`size-3 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                    ))}
                    <span className="text-xs text-slate-400 ml-2">
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  {r.comment && <p className="text-sm text-slate-700">{r.comment}</p>}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="font-bold mb-3">Recursos</h3>
            <ul className="space-y-2">
              {FEATURES.map((f) => (
                <li key={f.label} className="flex items-center gap-2 text-sm">
                  <f.icon className="size-4 text-emerald-600" />{f.label}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5 space-y-2">
            <Button className="w-full" onClick={useTemplate}><Check className="size-4 mr-1" />Usar template</Button>
            <Button variant="outline" className="w-full" onClick={() => setShowroom(true)}><Eye className="size-4 mr-1" />Visualizar</Button>
            <Button variant="outline" className="w-full"><Heart className="size-4 mr-1" />Favoritar</Button>
            <Button variant="outline" className="w-full" onClick={share}><Share2 className="size-4 mr-1" />Compartilhar</Button>
            <Button variant="outline" className="w-full" disabled><ShoppingCart className="size-4 mr-1" />Comprar (em breve)</Button>
            <Button variant="outline" className="w-full" onClick={useTemplate}><Copy className="size-4 mr-1" />Duplicar</Button>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold mb-2">Ideal para</h3>
            <p className="text-sm text-slate-600">{tpl.bestFor}</p>
          </Card>
        </div>
      </div>

      <TemplatePreviewModal
        open={showroom}
        onClose={() => setShowroom(false)}
        name={tpl.label}
        baseTemplate={tpl.id}
        branding={branding}
      />
    </div>
  );
}
