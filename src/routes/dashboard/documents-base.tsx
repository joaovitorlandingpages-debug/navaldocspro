import { createFileRoute } from "@tanstack/react-router";
import DocumentBase from "@/pages/dashboard/DocumentBase";

export const Route = createFileRoute("/dashboard/documents-base")({
  component: DocumentBase,
});
