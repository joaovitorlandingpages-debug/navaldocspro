import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardRedirect,
});

function DashboardRedirect() {
  const { profile, loading } = useAuth();

  if (loading) return null;

  if (!profile) {
    return <Navigate to="/auth/login" />;
  }

  // Content is handled by the parent /dashboard layout's Outlet
  // If we are at /dashboard/ we should probably show the same as RouteContent in dashboard.tsx
  // But usually the parent layout is enough if it renders the children.
  return null;
}
