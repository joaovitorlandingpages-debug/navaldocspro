import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { NewProcessProvider } from "@/hooks/useNewProcess";
import { PlanLimitProvider } from "@/hooks/usePlanLimits";
import ErrorBoundary from "@/components/ErrorBoundary";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: any; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error("Root Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Ops! Ocorreu um erro estrutural.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error?.message || "Algo deu errado ao carregar o sistema."}
        </p>
        {error?.stack && (
          <pre className="mt-4 p-4 bg-slate-900 text-red-400 rounded-xl text-left text-[10px] overflow-auto max-h-40 font-mono">
            {error.stack}
          </pre>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar Novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar ao Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  ssr: false,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NavalDocs Pro - Gestão e Automação para Engenharia Naval" },
      { name: "description", content: "A plataforma definitiva para engenheiros, despachantes e empresas navais gerenciarem embarcações, processos e documentos." },
      { name: "author", content: "NavalDocs Pro" },
      { property: "og:title", content: "NavalDocs Pro - Gestão e Automação para Engenharia Naval" },
      { property: "og:description", content: "A plataforma definitiva para engenheiros, despachantes e empresas navais gerenciarem embarcações, processos e documentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "theme-color", content: "#001B3D" },
      { name: "twitter:title", content: "NavalDocs Pro - Gestão e Automação para Engenharia Naval" },
      { name: "twitter:description", content: "A plataforma definitiva para engenheiros, despachantes e empresas navais gerenciarem embarcações, processos e documentos." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/cb00e87b-aefe-445b-884e-7da2bd5e094c/id-preview-93dd6d0d--d787974f-6f1a-48dd-89bf-51655d93efdf.lovable.app-1778546586583.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/cb00e87b-aefe-445b-884e-7da2bd5e094c/id-preview-93dd6d0d--d787974f-6f1a-48dd-89bf-51655d93efdf.lovable.app-1778546586583.png" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/cb00e87b-aefe-445b-884e-7da2bd5e094c/id-preview-93dd6d0d--d787974f-6f1a-48dd-89bf-51655d93efdf.lovable.app-1778546586583.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  const context = Route.useRouteContext();
  
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={context.queryClient}>
          <ErrorBoundary>
            <PlanLimitProvider>
              <NewProcessProvider>
                {children}
              </NewProcessProvider>
            </PlanLimitProvider>
          </ErrorBoundary>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
