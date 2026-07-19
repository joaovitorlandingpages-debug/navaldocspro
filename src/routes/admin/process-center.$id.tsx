import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";

// This is just to ensure the route tree updates with the new search validation
export const Route = createFileRoute("/admin/process-center/$id")({
  validateSearch: (search: Record<string, unknown>) => {
    return z.object({
      tab: z.string().optional().default('workspace'),
    }).parse(search);
  },
});
