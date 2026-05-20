import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboardView } from "../admin";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/global")({
  component: AdminGlobalLayout,
});

function AdminGlobalLayout() {
  const { profile, loading } = useAuth();

  if (loading) return null;

  if (!profile) {
    return <Navigate to="/auth/login" />;
  }

  if (profile?.role !== 'admin_master_global') {
    return <Navigate to="/admin" />;
  }

  return <AdminDashboardView />;
}
