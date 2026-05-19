import { createFileRoute } from "@tanstack/react-router";
import DocumentLibraryAdmin from "@/pages/admin/DocumentLibrary";

export const Route = createFileRoute("/admin/document-library")({
  component: DocumentLibraryAdmin,
});
