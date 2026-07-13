import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DocsCentralSidebar } from "@/components/docs-central/shared";

export const Route = createFileRoute("/admin/docs-central")({
  component: DocsCentralLayout,
});

function DocsCentralLayout() {
  return (
    <div className="flex -m-8 min-h-[calc(100vh-4rem)]">
      <DocsCentralSidebar />
      <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
        <Outlet />
      </div>
    </div>
  );
}
