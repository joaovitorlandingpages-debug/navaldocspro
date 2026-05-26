import { createFileRoute } from "@tanstack/react-router";
import SecurityDashboard from "@/pages/admin/Security";
import { useEffect } from "react";

export const Route = createFileRoute("/admin/security")({
  component: AdminSecurityPage,
});

function AdminSecurityPage() {
  useEffect(() => {
    console.log("SECURITY_ADMIN_OK");
  }, []);

  return <SecurityDashboard />;
}
