import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";
import {
  Breadcrumb as BreadcrumbPrimitive,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function Breadcrumbs() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  const pathnames = pathname.split("/").filter((x) => x);

  if (pathnames.length === 0) return null;

  const breadcrumbItems = pathnames.map((name, index) => {
    const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
    const isLast = index === pathnames.length - 1;

    // Custom labels for common routes
    const labels: Record<string, string> = {
      dashboard: "Dashboard",
      processes: "Processos",
      customers: "Clientes",
      vessels: "Embarcações",
      analytics: "Analytics",
      settings: "Ajustes",
      admin: "Admin",
      ocr: "OCR",
      "ocr-center": "Central OCR",
      "automation-center": "Automação",
      documents: "Documentos",
      "document-generator": "Gerador Pro",
      logs: "Logs",
      "system-monitor": "Monitoramento",
      "performance-center": "Performance",
      "ai-center": "Central IA",
      plans: "Planos",
    };

    let label = labels[name] || name;
    
    // Handle IDs (like process ID)
    if (name.length > 20 && (name.includes("-") || /[0-9]/.test(name))) {
        label = `#${name.substring(0, 8)}`;
    }

    return { routeTo, label, isLast };
  });

  console.log("BREADCRUMB_OK");

  return (
    <BreadcrumbPrimitive className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/dashboard" className="flex items-center gap-1">
              <Home className="h-3 w-3" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {breadcrumbItems.map((item, index) => (
          <React.Fragment key={item.routeTo}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage className="font-black text-navy uppercase text-[10px] tracking-widest">
                  {item.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link
                    to={item.routeTo}
                    className="font-bold text-slate-400 uppercase text-[10px] tracking-widest hover:text-primary transition-colors"
                  >
                    {item.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </BreadcrumbPrimitive>
  );
}
