import { createFileRoute } from "@tanstack/react-query";
import OperationalFeedback from "@/routes/admin/operational-feedback";

export const Route = createFileRoute("/admin/operational-feedback")({
  component: OperationalFeedback,
});
