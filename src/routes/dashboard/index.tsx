import { createFileRoute } from "@tanstack/react-router";
import { RouteContent } from "../dashboard";

export const Route = createFileRoute("/dashboard/")({
  component: RouteContent,
});
