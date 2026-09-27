import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "tests/unit/**/*.{test,spec}.{ts,tsx}",
      "tests/integration/**/*.{test,spec}.{ts,tsx}"
    ],
    exclude: [
      "node_modules",
      "dist",
      ".output",
      "tests/e2e/**"
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "https://deno.land/std@0.190.0/http/server.ts": path.resolve(__dirname, "./src/__tests__/billing/shims/deno-server.ts"),
      "https://esm.sh/@supabase/supabase-js@2.45.0": path.resolve(__dirname, "./src/__tests__/billing/shims/supabase-js.ts")
    }
  }
});
